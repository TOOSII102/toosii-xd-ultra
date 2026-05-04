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
const BOT_ROOT     = path.join(__dirname, '../../');

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

// Download GitHub zip and extract — works even without a git repo
async function updateViaZip() {
    const zipUrl  = `https://codeload.github.com/${REPO}/zip/refs/heads/${BRANCH}`;
    const tmpZip  = path.join(BOT_ROOT, '_update_tmp.zip');
    const tmpDir  = path.join(BOT_ROOT, '_update_extracted');

    // Download zip
    await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(tmpZip);
        https.get(zipUrl, { headers: { 'User-Agent': 'TOOSII-XD-Bot' } }, res => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
    });

    // Extract zip
    run(`unzip -o ${tmpZip} -d ${tmpDir}`);

    // Find extracted folder (e.g. toosii-xd-ultra-heroku/)
    const extracted = fs.readdirSync(tmpDir).find(f =>
        fs.statSync(path.join(tmpDir, f)).isDirectory()
    );
    if (!extracted) throw new Error('Could not find extracted folder');

    const srcDir = path.join(tmpDir, extracted);

    // Copy files over (skip session/, data/, node_modules/, .env)
    const SKIP = new Set(['session', 'data', 'node_modules', '.env', '_update_tmp.zip', '_update_extracted']);

    function copyDir(src, dest) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
            if (SKIP.has(entry)) continue;
            const s = path.join(src, entry);
            const d = path.join(dest, entry);
            if (fs.statSync(s).isDirectory()) {
                copyDir(s, d);
            } else {
                fs.copyFileSync(s, d);
            }
        }
    }
    copyDir(srcDir, BOT_ROOT);

    // Cleanup
    try { fs.unlinkSync(tmpZip); } catch {}
    try { run(`rm -rf ${tmpDir}`); } catch {}
}

module.exports = {
    name:        'update',
    aliases:     ['upgrade', 'pullupdate'],
    description: 'Pull latest changes from GitHub and keep bot running',
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

        // Heroku: ephemeral filesystem — git pull can't persist
        if (IS_HEROKU) {
            let latest;
            try { latest = await getLatestCommit(); } catch { latest = { sha: '?', message: '?' }; }
            return await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  UPDATE 〕`,
                    `║`,
                    `║ ▸ *Platform* : ☁️ Heroku`,
                    `║ ▸ *Status*   : ℹ️ Git pull not supported here`,
                    `║`,
                    `║  Push to GitHub then redeploy from`,
                    `║  the Heroku dashboard (heroku branch).`,
                    `║`,
                    `║ ▸ *Latest* : ${latest.sha?.slice(0, 7)} — ${latest.message}`,
                    `║`,
                    `${foot}`,
                ].join('\n')
            }, { quoted: msg });
        }

        // Fetch latest commit info from GitHub
        let latest;
        try { latest = await getLatestCommit(); }
        catch (err) {
            return await sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ GitHub unreachable\n║ ▸ *Reason* : ${err.message}\n║\n${foot}`
            }, { quoted: msg });
        }

        const current      = getCurrentCommit();
        const shortCurrent = current?.slice(0, 7) || 'unknown';
        const shortLatest  = latest.sha?.slice(0, 7)  || 'unknown';

        if (current && latest.sha && current === latest.sha) {
            return await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  UPDATE 〕`,
                    `║`,
                    `║ ▸ *Status*   : ✅ Already up to date`,
                    `║ ▸ *Platform* : ${PLATFORM}`,
                    `║ ▸ *Commit*   : ${shortCurrent}`,
                    `║ ▸ *Changes*  : ${latest.message}`,
                    `║`,
                    `${foot}`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── Backup session creds before any update operation ───────────────────
        let savedCreds = null;
        try {
            if (fs.existsSync(SESSION_FILE)) {
                savedCreds = fs.readFileSync(SESSION_FILE);
            }
        } catch {}

        // ── Try git pull first; fall back to zip download if not a git repo ───
        let pullErr, npmErr, method;
        const hasGit = isGitRepo();

        if (hasGit) {
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

        // ── Always restore creds.json regardless of update result ──────────────
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

        // ── Install any new dependencies ───────────────────────────────────────
        try { run('npm install --production', { cwd: BOT_ROOT }); }
        catch { npmErr = true; }

        // ── Notify then exit so the panel/pm2/workflow restarts the bot ────────
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
