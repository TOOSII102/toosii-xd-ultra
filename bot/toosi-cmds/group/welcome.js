'use strict';

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');
const { getBotName }             = require('../../lib/botname');
const { resolveDisplayWithName } = require('../../lib/groupUtils');

const CFG_FILE = path.join(__dirname, '../../data/welcome_data.json');

const DEFAULT_MSG = [
    `╔═|〔  WELCOME 〕`,
    `║`,
    `║ 🎉 {mention} just dropped in!`,
    `║ ▸ *Group*   : {group}`,
    `║ ▸ *Member*  : #{count}`,
    `║`,
    `║ 😂 WiFi password won't be shared`,
    `║    until you behave 😏`,
    `║ ⚠️  This group is highly addictive`,
    `║    — you've been warned! 🫡`,
    `║`,
    `╚═╝`,
].join('\n');

// ── data helpers ──────────────────────────────────────────────────────────────
function loadCfg() {
    try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return { groups: {} }; }
}
function saveCfg(d) {
    fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true });
    fs.writeFileSync(CFG_FILE, JSON.stringify(d, null, 2));
}


// Reset all groups to OFF on every bot startup
try {
    const _boot = loadCfg(); let _dirty = false;
    for (const id of Object.keys(_boot.groups || {})) { if (_boot.groups[id]?.enabled) { _boot.groups[id].enabled = false; _dirty = true; } }
    if (_dirty) saveCfg(_boot);
} catch {}
// ── variable substitution ─────────────────────────────────────────────────────
function applyVars(template, vars) {
    return template
        .replace(/\{mention\}/g, vars.mention || '')
        .replace(/\{name\}/g,    vars.name    || '')
        .replace(/\{group\}/g,   vars.group   || '')
        .replace(/\{count\}/g,   vars.count   || '')
        .replace(/\{members\}/g, vars.count   || '')
        .replace(/\{bot\}/g,     vars.bot     || getBotName());
}

// ── JID normalizer ────────────────────────────────────────────────────────────
function normalizeJid(participant) {
    if (typeof participant === 'string') {
        return participant.includes('@') ? participant : null;
    }
    if (participant && typeof participant === 'object') {
        const jid = participant.jid || participant.id || participant.userJid || participant.participant || participant.user;
        if (typeof jid === 'string' && jid.includes('@')) return jid;
        if (typeof jid === 'string' && /^\d+$/.test(jid)) return `${jid}@s.whatsapp.net`;
        if (typeof jid === 'object' && jid?.user) return `${jid.user}@s.whatsapp.net`;
        for (const key of Object.keys(participant)) {
            const val = participant[key];
            if (typeof val === 'string' && val.includes('@s.whatsapp.net')) return val;
        }
        return null;
    }
    return null;
}

// ── fetch image buffer safely ─────────────────────────────────────────────────
async function fetchBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(res.data);
    } catch {
        return null;
    }
}

// ── exported functions (called by index.js) ───────────────────────────────────
function isWelcomeEnabled(gid) {
    return !!(loadCfg().groups?.[gid]?.enabled);
}

function getWelcomeMessage(gid) {
    return loadCfg().groups?.[gid]?.message || DEFAULT_MSG;
}

async function sendWelcomeMessage(sock, gid, participants, customMsg, { approvedBy } = {}) {
    try {
        let meta;
        try {
            meta = await sock.groupMetadata(gid);
        } catch {
            meta = { participants: [], subject: 'Our Group' };
        }

        const groupName  = meta.subject || gid.split('@')[0];
        const count      = meta.participants.length;
        const botName    = getBotName();
        const template   = customMsg || DEFAULT_MSG;

        // Fetch group profile picture once
        let groupPpUrl    = null;
        let groupPpBuffer = null;
        try {
            groupPpUrl = await sock.profilePictureUrl(gid, 'image');
            if (groupPpUrl) groupPpBuffer = await fetchBuffer(groupPpUrl);
        } catch {}

        for (const rawJid of participants) {
            const userId = normalizeJid(rawJid);
            if (!userId || userId === 'undefined' || userId === '[object Object]') continue;

            try {
                const phone   = userId.split('@')[0].split(':')[0];
                const display = await resolveDisplayWithName(sock, gid, userId, null)
                    .catch(() => `+${phone}`);

                const welcomeText = applyVars(template, {
                    mention : `@${phone}`,
                    name    : display,
                    group   : groupName,
                    count   : String(count),
                    bot     : botName,
                });

                // Prepend approvedBy header if applicable
                const approvedByNum = approvedBy ? approvedBy.split('@')[0].split(':')[0] : null;
                const fullText = approvedByNum
                    ? `╔═|〔  JOIN APPROVED 〕\n║ ▸ *Approved by* : @${approvedByNum}\n╚══════════════════\n\n${welcomeText}`
                    : welcomeText;

                const allMentions = approvedBy ? [userId, approvedBy] : [userId];

                // Try member profile picture first, fall back to group pic
                let memberPpBuffer = null;
                try {
                    const memberPpUrl = await sock.profilePictureUrl(userId, 'image');
                    if (memberPpUrl) memberPpBuffer = await fetchBuffer(memberPpUrl);
                } catch {}

                const imageBuffer = memberPpBuffer || groupPpBuffer;

                if (imageBuffer) {
                    await sock.sendMessage(gid, {
                        image    : imageBuffer,
                        caption  : fullText,
                        mentions : allMentions,
                        contextInfo: {
                            mentionedJid: allMentions,
                            externalAdReply: {
                                title       : `🎉 Welcome to ${groupName}`,
                                body        : `👥 Member #${count}`,
                                mediaType   : 1,
                                thumbnailUrl: groupPpUrl || '',
                                sourceUrl   : '',
                                renderLargerThumbnail: false,
                            }
                        }
                    });
                } else {
                    await sock.sendMessage(gid, {
                        text     : fullText,
                        mentions : allMentions,
                    });
                }

                console.log(`[WELCOME] ✅ Welcomed ${phone} in ${gid.split('@')[0]}`);
            } catch (err) {
                console.error(`[WELCOME] ❌ Error welcoming ${userId}: ${err.message}`);
                try {
                    const fallback = typeof userId === 'string' ? userId.split('@')[0] : 'member';
                    await sock.sendMessage(gid, {
                        text     : `🎉 Welcome @${fallback} to *${groupName}*! 🎊\n👥 Members: ${count}`,
                        mentions : [userId],
                    });
                } catch {}
            }
        }
    } catch (err) {
        console.error(`[WELCOME] ❌ Fatal error: ${err.message}`);
    }
}

// ── command ───────────────────────────────────────────────────────────────────
module.exports = {
    isWelcomeEnabled,
    getWelcomeMessage,
    sendWelcomeMessage,

    name:        'welcome',
    aliases:     ['setwelcome', 'welcomeset'],
    description: 'Welcome new members when they join the group',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '👋', key: msg.key } }); } catch {}
        const botName = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser && !ctx?.isGroupAdmin) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WELCOME 〕\n║\n║ ▸ *Status* : ❌ Admins/Owner only\n║\n╚═╝`
            }, { quoted: msg });
        }
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WELCOME 〕\n║\n║ ▸ *Status* : ❌ Groups only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const sub  = args[0]?.toLowerCase();
        const cfg  = loadCfg();
        const gcfg = cfg.groups?.[chatId] || { enabled: false, message: DEFAULT_MSG };
        const save = () => { cfg.groups = cfg.groups || {}; cfg.groups[chatId] = gcfg; saveCfg(cfg); };

        // ── status / no args ──────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  WELCOME 〕`,
                    `║`,
                    `║ ▸ *State*   : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Message* : ${gcfg.message === DEFAULT_MSG ? 'Default' : 'Custom ✏️'}`,
                    `║`,
                    `║ ▸ *Usage* :`,
                    `║   ${prefix}welcome on / off`,
                    `║   ${prefix}welcome set <your message>`,
                    `║   ${prefix}welcome reset`,
                    `║   ${prefix}welcome test`,
                    `║   ${prefix}welcome msg`,
                    `║`,
                    `║ ▸ *Placeholders* :`,
                    `║   {mention} {name} {group} {count} {bot}`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── on / off ──────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'enable') {
            gcfg.enabled = true; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WELCOME 〕\n║\n║ ▸ *State* : ✅ Enabled\n║ ▸ *Note*  : Members will be welcomed with pic\n║\n╚═╝`
            }, { quoted: msg });
        }
        if (sub === 'off' || sub === 'disable') {
            gcfg.enabled = false; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WELCOME 〕\n║\n║ ▸ *State* : ❌ Disabled\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── set <message> ─────────────────────────────────────────────────────
        if (sub === 'set') {
            const newMsg = args.slice(1).join(' ').trim();
            if (!newMsg) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  WELCOME 〕\n║\n║ ▸ *Usage* : ${prefix}welcome set <message>\n║ ▸ *Vars*  : {mention} {name} {group} {count} {bot}\n║\n╚═╝`
                }, { quoted: msg });
            }
            gcfg.message = newMsg; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WELCOME 〕\n║\n║ ▸ *Message* : ✅ Saved\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── reset ─────────────────────────────────────────────────────────────
        if (sub === 'reset' || sub === 'default') {
            gcfg.message = DEFAULT_MSG; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WELCOME 〕\n║\n║ ▸ *Message* : ✅ Reset to default\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── test / preview ────────────────────────────────────────────────────
        if (sub === 'test' || sub === 'preview' || sub === 'demo') {
            const senderJid = msg.key.participant || msg.key.remoteJid;
            await sendWelcomeMessage(sock, chatId, [senderJid], gcfg.message);
            return;
        }

        // ── show current message ──────────────────────────────────────────────
        if (sub === 'msg' || sub === 'message') {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WELCOME MESSAGE 〕\n║\n${gcfg.message}\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── unknown arg → ignore silently; only toggle when no arg given ─────
        if (sub) return;
        gcfg.enabled = !gcfg.enabled; save();
        return sock.sendMessage(chatId, {
            text: `╔═|〔  WELCOME 〕\n║\n║ ▸ *State* : ${gcfg.enabled ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═╝`
        }, { quoted: msg });
    }
};
