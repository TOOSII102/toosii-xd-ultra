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

function run(cmd, opts = {}) {
    return execSync(cmd, { encoding: 'utf8', timeout: 120000, stdio: 'pipe', ...opts }).trim();
}

function getCurrentCommit() {
    try { return run('git rev-parse HEAD'); } catch { return null; }
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

        // ── Backup session creds before any git operation ──────────────────────
        let savedCreds = null;
        try {
            if (fs.existsSync(SESSION_FILE)) {
                savedCreds = fs.readFileSync(SESSION_FILE);
            }
        } catch {}

        // ── Pull latest code ───────────────────────────────────────────────────
        let pullErr, npmErr;
        try {
            run(`git fetch ${GITHUB_URL} ${BRANCH}`);
            run(`git reset --hard FETCH_HEAD`);
        } catch (err) { pullErr = err.message?.slice(0, 100); }

        // ── Always restore creds.json regardless of pull result ────────────────
        if (savedCreds) {
            try {
                fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
                fs.writeFileSync(SESSION_FILE, savedCreds);
            } catch {}
        }

        if (pullErr) {
            return await sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Pull failed\n║ ▸ *Reason* : ${pullErr}\n║\n${foot}`
            }, { quoted: msg });
        }

        // ── Install any new dependencies ───────────────────────────────────────
        try { run('npm install --production', { cwd: path.join(__dirname, '../../') }); }
        catch { npmErr = true; }

        // ── Notify then exit cleanly so the panel/workflow restarts the bot ────
        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  UPDATE 〕`,
                `║`,
                `║ ▸ *Status*   : ✅ Updated successfully`,
                `║ ▸ *Platform* : ${PLATFORM}`,
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

        // Give WhatsApp time to deliver the message before exit
        // Exit code 1 signals the launcher to restart the bot automatically
        setTimeout(() => process.exit(1), 3000);
    },
};
