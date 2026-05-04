'use strict';
const { execSync } = require('child_process');
const https = require('https');
const path  = require('path');
const fs    = require('fs');
const { getBotName } = require('../../lib/botname');

const REPO   = 'TOOSII102/toosii-xd-ultra';
const BRANCH = 'heroku';

const IS_HEROKU = !!process.env.DYNO;
const PLATFORM  = IS_HEROKU ? 'Heroku' : 'VPS/Panel';

const SESSION_FILE = path.join(__dirname, '../../session/creds.json');
const GITHUB_URL   = `https://github.com/${REPO}.git`;
const BOT_ROOT     = path.resolve(__dirname, '../../');

function run(cmd, opts = {}) {
    return execSync(cmd, { encoding: 'utf8', timeout: 120000, stdio: 'pipe', ...opts }).trim();
}

function isGitRepo() {
    try { run('git rev-parse --git-dir', { cwd: BOT_ROOT }); return true; } catch { return false; }
}

function getCurrentCommit() {
    try { return run('git rev-parse HEAD', { cwd: BOT_ROOT }); } catch { return null; }
}

async function getLatestCommit() {
    return new Promise((resolve, reject) => {
        const url = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;
        https.get(url, { headers: { 'User-Agent': 'TOOSII-XD-Bot' } }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ sha: json.sha, message: json.commit?.message?.split('\n')[0] || '' });
                } catch { reject(new Error('Failed to parse GitHub response')); }
            });
        }).on('error', reject);
    });
}

// Download zip with redirect support — returns a Buffer
async function downloadZip(url) {
    return new Promise((resolve, reject) => {
        const request = (reqUrl, redirects = 0) => {
            if (redirects > 5) return reject(new Error('Too many redirects'));
            https.get(reqUrl, { headers: { 'User-Agent': 'TOOSII-XD-Bot' } }, res => {
                if ([301, 302, 307, 308].includes(res.statusCode)) {
                    return request(res.headers.location, redirects + 1);
                }
                if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', reject);
            }).on('error', reject);
        };
        request(url);
    });
}

// Pure Node.js ZIP extractor — no unzip binary required
// Uses zlib (built-in) for deflate decompression
function extractZipBuffer(buf, destDir, skipDirs) {
    const zlib = require('zlib');

    // Find End of Central Directory record (signature 0x06054b50)
    let eocdOffset = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break; }
    }
    if (eocdOffset === -1) throw new Error('Invalid ZIP: EOCD not found');

    const cdCount  = buf.readUInt16LE(eocdOffset + 10);
    const cdOffset = buf.readUInt32LE(eocdOffset + 16);

    let pos = cdOffset;
    let stripPrefix = null;

    for (let i = 0; i < cdCount; i++) {
        if (buf.readUInt32LE(pos) !== 0x02014b50) break; // Central dir signature

        const compMethod  = buf.readUInt16LE(pos + 10);
        const compSize    = buf.readUInt32LE(pos + 20);
        const uncompSize  = buf.readUInt32LE(pos + 24);
        const nameLen     = buf.readUInt16LE(pos + 28);
        const extraLen    = buf.readUInt16LE(pos + 30);
        const commentLen  = buf.readUInt16LE(pos + 32);
        const localOffset = buf.readUInt32LE(pos + 42);
        const fileName    = buf.slice(pos + 46, pos + 46 + nameLen).toString('utf8');

        pos += 46 + nameLen + extraLen + commentLen;

        // Auto-detect and strip top-level folder (e.g. "toosii-xd-ultra-heroku/")
        if (stripPrefix === null) {
            const firstSlash = fileName.indexOf('/');
            if (firstSlash > 0) stripPrefix = fileName.slice(0, firstSlash + 1);
            else stripPrefix = '';
        }

        const relPath = stripPrefix && fileName.startsWith(stripPrefix)
            ? fileName.slice(stripPrefix.length)
            : fileName;

        if (!relPath || relPath.endsWith('/')) continue; // directory entry

        // Skip protected paths
        const topDir = relPath.split('/')[0];
        if (skipDirs.has(topDir)) continue;

        // Read local file header for actual data start
        const localNameLen  = buf.readUInt16LE(localOffset + 26);
        const localExtraLen = buf.readUInt16LE(localOffset + 28);
        const dataStart     = localOffset + 30 + localNameLen + localExtraLen;

        const destPath = path.join(destDir, relPath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        if (compMethod === 0) {
            // Stored — no compression
            fs.writeFileSync(destPath, buf.slice(dataStart, dataStart + uncompSize));
        } else if (compMethod === 8) {
            // Deflated — decompress with zlib inflateRaw
            const compressed = buf.slice(dataStart, dataStart + compSize);
            fs.writeFileSync(destPath, zlib.inflateRawSync(compressed));
        }
        // Other methods are extremely rare in GitHub zips; skip safely
    }
}

async function updateViaZip() {
    const zipUrl = `https://codeload.github.com/${REPO}/zip/refs/heads/${BRANCH}`;
    const SKIP   = new Set(['session', 'data', 'node_modules', '.env', '_update_tmp.zip', '_update_extracted']);
    const buf    = await downloadZip(zipUrl);
    extractZipBuffer(buf, BOT_ROOT, SKIP);
}

module.exports = {
    name:        'update',
    aliases:     ['upgrade', 'pullupdate'],
    description: 'Pull latest changes from GitHub and restart',
    category:    'owner',
    ownerOnly:   true,

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: msg.key } }); } catch {}
        const botName = getBotName();
        const foot    = `╚═|〔 ${botName} 〕`;

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return await sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n${foot}`
            }, { quoted: msg });
        }

        if (IS_HEROKU) {
            let latest;
            try { latest = await getLatestCommit(); } catch { latest = { sha: '?', message: '?' }; }
            return await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  UPDATE 〕`,
                    `║`,
                    `║ ▸ *Platform* : ☁️ Heroku`,
                    `║ ▸ *Status*   : ℹ️ Redeploy from Heroku dashboard`,
                    `║ ▸ *Latest*   : ${latest.sha?.slice(0, 7)} — ${latest.message}`,
                    `║`,
                    `${foot}`,
                ].join('\n')
            }, { quoted: msg });
        }

        let latest;
        try { latest = await getLatestCommit(); }
        catch (err) {
            return await sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ GitHub unreachable\n║ ▸ *Reason* : ${err.message}\n║\n${foot}`
            }, { quoted: msg });
        }

        const current      = getCurrentCommit();
        const shortCurrent = current?.slice(0, 7) || 'unknown';
        const shortLatest  = latest.sha?.slice(0, 7) || 'unknown';

        if (current && latest.sha && current === latest.sha) {
            return await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  UPDATE 〕`,
                    `║`,
                    `║ ▸ *Status*   : ✅ Already up to date`,
                    `║ ▸ *Commit*   : ${shortCurrent}`,
                    `║ ▸ *Changes*  : ${latest.message}`,
                    `║`,
                    `${foot}`,
                ].join('\n')
            }, { quoted: msg });
        }

        // Backup session creds
        let savedCreds = null;
        try {
            if (fs.existsSync(SESSION_FILE)) savedCreds = fs.readFileSync(SESSION_FILE);
        } catch {}

        // Try git first; fall back to pure-Node zip (no unzip binary needed)
        let pullErr, npmErr, method;

        if (isGitRepo()) {
            method = 'git';
            try {
                run(`git fetch ${GITHUB_URL} ${BRANCH}`, { cwd: BOT_ROOT });
                run(`git reset --hard FETCH_HEAD`, { cwd: BOT_ROOT });
            } catch (err) { pullErr = err.message?.slice(0, 150); }
        } else {
            method = 'zip';
            try {
                await updateViaZip();
            } catch (err) { pullErr = err.message?.slice(0, 150); }
        }

        // Always restore creds.json
        if (savedCreds) {
            try {
                fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
                fs.writeFileSync(SESSION_FILE, savedCreds);
            } catch {}
        }

        if (pullErr) {
            return await sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Update failed\n║ ▸ *Method* : ${method}\n║ ▸ *Reason* : ${pullErr}\n║\n${foot}`
            }, { quoted: msg });
        }

        try { run('npm install --production', { cwd: BOT_ROOT }); }
        catch { npmErr = true; }

        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  UPDATE 〕`,
                `║`,
                `║ ▸ *Status*   : ✅ Updated successfully`,
                `║ ▸ *Platform* : ${PLATFORM}`,
                `║ ▸ *Method*   : ${method === 'git' ? '🔀 Git pull' : '📦 Zip download'}`,
                `║ ▸ *From*     : ${shortCurrent}`,
                `║ ▸ *To*       : ${shortLatest}`,
                `║ ▸ *Changes*  : ${latest.message}`,
                `║ ▸ *Deps*     : ${npmErr ? '⚠️ npm had warnings' : '✅ Up to date'}`,
                `║`,
                `║ ▸ 🔄 Restarting...`,
                `║`,
                `${foot}`,
            ].join('\n')
        }, { quoted: msg });

        setTimeout(() => process.exit(1), 3000);
    },
};
