const { execSync } = require('child_process');
const https = require('https');
const { getBotName } = require('../../lib/botname');

const REPO   = 'TOOSII102/toosii-xd-ultra';
const BRANCH = 'heroku';

const IS_HEROKU  = !!process.env.DYNO || (!process.env.REPL_ID && !process.env.PTERODACTYL_SERVER_UUID && !process.env.BOT_PLATFORM_VPS);
const IS_REPLIT  = !!process.env.REPL_ID;
const PLATFORM   = IS_HEROKU ? 'Heroku' : IS_REPLIT ? 'Replit' : 'VPS';

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
    description: 'Pull latest changes from GitHub and restart the bot',
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

        // ── Fetch latest GitHub commit info ───────────────────────────────────
        let latest;
        try { latest = await getLatestCommit(); }
        catch (err) {
            return await sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ GitHub unreachable\n║ ▸ *Reason* : ${err.message}\n║\n${foot}`
            }, { quoted: msg });
        }

        const shortLatest = latest.sha?.slice(0, 7) || 'unknown';

        // ── Heroku: git pull is not supported — filesystem is ephemeral ───────
        if (IS_HEROKU) {
            return await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  UPDATE 〕`,
                    `║`,
                    `║ ▸ *Platform* : ☁️ Heroku`,
                    `║ ▸ *Status*   : ℹ️ Git pull not supported`,
                    `║`,
                    `║  Heroku's filesystem is ephemeral — files`,
                    `║  reset on every dyno restart, so git pull`,
                    `║  cannot persist updates.`,
                    `║`,
                    `║ ▸ *Latest commit* : ${shortLatest}`,
                    `║ ▸ *Message*       : ${latest.message}`,
                    `║`,
                    `║  *To update on Heroku:*`,
                    `║  1. Push new code to GitHub (main branch)`,
                    `║  2. Heroku Dashboard → Deploy → Manual deploy`,
                    `║     → Deploy Branch  (heroku branch)`,
                    `║  OR enable Auto-deploy on the heroku branch`,
                    `║`,
                    `║ ▸ Use *${prefix}restart* to just restart the bot`,
                    `║`,
                    `${foot}`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── Replit / VPS: run git pull ────────────────────────────────────────
        const current = getCurrentCommit();
        const shortCurrent = current?.slice(0, 7) || 'unknown';

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

        let pullErr, npmErr;
        try {
            run(`git fetch origin ${BRANCH}`);
            run(`git reset --hard origin/${BRANCH}`);
        } catch (err) { pullErr = err.message?.slice(0, 100); }

        if (pullErr) {
            return await sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Pull failed\n║ ▸ *Reason* : ${pullErr}\n║\n${foot}`
            }, { quoted: msg });
        }

        try { run('npm install --production', { cwd: process.cwd() }); }
        catch (e) { npmErr = true; }

        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  UPDATE 〕`,
                `║`,
                `║ ▸ *Status*   : ✅ Updated successfully`,
                `║ ▸ *Platform* : ${PLATFORM}`,
                `║ ▸ *From*     : ${shortCurrent}`,
                `║ ▸ *To*       : ${shortLatest}`,
                `║ ▸ *Changes*  : ${latest.message}`,
                `║ ▸ *Deps*     : ${npmErr ? '⚠️ npm had warnings' : '✅ Installed'}`,
                `║`,
                `║ ▸ 🔄 Restarting in 3s...`,
                `║`,
                `${foot}`,
            ].join('\n')
        }, { quoted: msg });

        setTimeout(() => process.exit(0), 3000);
    },
};
