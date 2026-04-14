const fs   = require('fs');
const path = require('path');
const { getBotName }   = require('../../lib/botname');
const { isSudoNumber, getPhoneFromLid } = require('../../lib/sudo-store');
const { resolveDisplayWithName } = require('../../lib/groupUtils');
const { registerBotDelete } = require('../../lib/bot-delete-guard');

const CFG_FILE  = path.join(__dirname, '../../data/antitag.json');
const WARN_FILE = path.join(__dirname, '../../data/warnings.json');

// ── helpers ───────────────────────────────────────────────────────────────────
function bareNum(jid = '') { return jid.split('@')[0].split(':')[0]; }

function loadCfg()  { try { return JSON.parse(fs.readFileSync(CFG_FILE,  'utf8')); } catch { return {}; } }
function saveCfg(d) { try { fs.mkdirSync(path.dirname(CFG_FILE),  { recursive: true }); fs.writeFileSync(CFG_FILE,  JSON.stringify(d, null, 2)); } catch {} }

function loadWarns()  { try { return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8')); } catch { return {}; } }
function saveWarns(d) { try { fs.mkdirSync(path.dirname(WARN_FILE), { recursive: true }); fs.writeFileSync(WARN_FILE, JSON.stringify(d, null, 2)); } catch {} }

function warnKey(chatId, jid) { return `${chatId}::${bareNum(jid)}`; }

function defaultGcfg() {
    return { enabled: false, action: 'warn', threshold: 5, exemptAdmins: true, exemptSudos: true, exempt: [] };
}

const TYPES = [
    'extendedTextMessage','imageMessage','videoMessage','audioMessage',
    'documentMessage','stickerMessage','buttonsMessage','templateMessage',
    'listMessage','productMessage','groupMentionedMessage',
];

/**
 * Extract the deepest contextInfo object from any message structure.
 * Handles ephemeral / view-once wrappers and all content types.
 */
function getContextInfo(msg) {
    const m = msg.message;
    if (!m) return null;
    for (const t of TYPES) {
        if (m[t]?.contextInfo) return m[t].contextInfo;
    }
    // Unwrap ephemeral / view-once
    const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message
        || m.viewOnceMessageV2?.message?.viewOnceMessage?.message;
    if (inner) {
        for (const t of TYPES) {
            if (inner[t]?.contextInfo) return inner[t].contextInfo;
        }
    }
    return null;
}

/** Extract mentionedJid from any message type */
function getMentions(msg) {
    const ctx = getContextInfo(msg);
    return ctx?.mentionedJid || [];
}

/**
 * Detect a group tag:
 *  - ctx.nonJidMentions exists → WhatsApp @all / tag-everyone (newest format)
 *  - ctx.groupMentions exists  → WhatsApp @everyone shortcut (mid-2024 format)
 *  - ctx.mentionedJid includes the group JID → old-style group tag
 *  - ctx.mentionedJid.length >= threshold    → bulk manual @mention
 */
function isGroupTag(msg, chatId, threshold) {
    const ctx = getContextInfo(msg);
    if (!ctx) return false;

    const mentioned = ctx.mentionedJid || [];

    // Newest WhatsApp @all → nonJidMentions (number count OR array — just check truthy)
    const njm = ctx.nonJidMentions;
    if (njm && (Array.isArray(njm) ? njm.length > 0 : njm > 0)) return true;

    // Mid-2024 WhatsApp @everyone → groupMentions array
    if (ctx.groupMentions?.length) return true;

    // Group's own JID in the mention list (old-style group tag)
    if (mentioned.includes(chatId)) return true;

    // Bulk @mention >= threshold
    if (threshold > 0 && mentioned.length >= threshold) return true;

    return false;
}

/**
 * Resolve a JID (which may be a LID) to a plain phone number string.
 * Returns the best-effort phone digits, or the raw LID digits as fallback.
 */
async function resolvePhone(sock, rawJid) {
    const num = bareNum(rawJid);
    const isLid = rawJid.endsWith('@lid') || (!rawJid.includes('@') && /^\d{15,}$/.test(num));

    if (!isLid) return num;

    // 1. Sudo-store LID cache
    const cached = getPhoneFromLid(num);
    if (cached) return String(cached).replace(/[^0-9]/g, '');

    // 2. Signal repository
    if (sock?.signalRepository?.lidMapping?.getPNForLID) {
        try {
            for (const fmt of [rawJid, `${num}@lid`, `${num}:0@lid`]) {
                const pn = await sock.signalRepository.lidMapping.getPNForLID(fmt);
                if (pn) {
                    const resolved = String(pn).replace(/[^0-9]/g, '');
                    if (resolved && resolved !== num && resolved.length >= 7) return resolved;
                }
            }
        } catch {}
    }

    return num; // LID digits as last resort
}

/** Check if sender is exempt (LID-safe) */
async function isExempt(sock, chatId, senderJid, gcfg) {
    const rawNum  = bareNum(senderJid);
    const realNum = await resolvePhone(sock, senderJid);

    if (gcfg.exemptSudos !== false && (isSudoNumber(realNum) || isSudoNumber(rawNum))) {
        return true;
    }
    if ((gcfg.exempt || []).some(e => { const n = bareNum(e); return n === realNum || n === rawNum; })) {
        return true;
    }
    if (gcfg.exemptAdmins !== false) {
        try {
            const meta      = await sock.groupMetadata(chatId);
            const bareJid   = senderJid.replace(/:[\d]+@/, '@');
            const rawDomain = senderJid.split('@')[1] || '';
            const matched   = meta.participants.find(p => {
                if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
                const pId     = p.id || '';
                const pBare   = pId.replace(/:[\d]+@/, '@');
                const pNum    = bareNum(pId);
                const pDomain = pId.split('@')[1] || '';
                return pId === senderJid || pBare === bareJid ||
                    (pNum === rawNum && rawNum.length >= 5 && pDomain === rawDomain) ||
                    (realNum && pNum === realNum && realNum.length >= 5 && pDomain === 's.whatsapp.net');
            });
            if (matched) return true;
        } catch {}
    }
    return false;
}

// ── event listener ────────────────────────────────────────────────────────────
const _ataRegistered = new WeakSet();

function setupAntiTagListener(sock) {
    if (_ataRegistered.has(sock)) return;
    _ataRegistered.add(sock);
    // Reset all groups to OFF on every bot startup
    try {
        const cfg = loadCfg();
        let changed = false;
        for (const chatId of Object.keys(cfg)) {
            if (cfg[chatId].enabled) { cfg[chatId].enabled = false; changed = true; }
        }
        if (changed) saveCfg(cfg);
    } catch {}


    const startedAt = Math.floor(Date.now() / 1000); // unix seconds

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message) continue;
            if (msg.key.fromMe) continue;                        // ignore bot's own sends

            // Skip messages sent before this bot session started (startup replay)
            const msgTs = Number(msg.messageTimestamp || 0);
            if (msgTs && msgTs < startedAt - 5) continue;

            const chatId = msg.key.remoteJid;
            if (!chatId?.endsWith('@g.us')) continue;

            const cfg  = loadCfg();
            const gcfg = cfg[chatId];
            if (gcfg?.enabled !== true) continue;

            if (!isGroupTag(msg, chatId, gcfg.threshold ?? 5)) continue;

            const sender  = msg.key.participant || msg.key.remoteJid || '';
            const realNum = await resolvePhone(sock, sender);
            if (await isExempt(sock, chatId, sender, gcfg)) {
                continue;
            }

            // Re-check after awaits — user may have turned antitag off in the meantime
            if (loadCfg()[chatId]?.enabled !== true) continue;

            const action  = gcfg.action || 'warn';
            const display = await resolveDisplayWithName(sock, chatId, sender).catch(() => `+${bareNum(sender)}`);
            const botName = getBotName();

            // Register with guard BEFORE deleting so antidelete ignores this revoke
            registerBotDelete(msg.key.id);
            // Always delete the offending message first
            try { await sock.sendMessage(chatId, { delete: msg.key }); } catch {}

            if (action === 'delete') {
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Action* : 🗑️ Message deleted\n║\n╚═|〔 ${botName} 〕`
                });

            } else if (action === 'warn') {
                const warns  = loadWarns();
                const key    = warnKey(chatId, sender);
                warns[key]   = (warns[key] || 0) + 1;
                const count  = warns[key];
                const MAX    = 3;
                let extra    = '';
                if (count >= MAX) {
                    try {
                        await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
                        extra = `\n║ ▸ *Removed* : ✅ Auto-removed (${MAX} warns)`;
                        warns[key] = 0;
                    } catch {}
                }
                saveWarns(warns);
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Reason* : Tagging all members\n║ ▸ *Warns*  : ${Math.min(count, MAX)}/${MAX}${extra}\n║\n╚═|〔 ${botName} 〕`
                });

            } else if (action === 'remove' || action === 'kick') {
                try {
                    await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
                    await sock.sendMessage(chatId, {
                        text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Action* : 🚫 Removed (tagged all)\n║\n╚═|〔 ${botName} 〕`
                    });
                } catch {
                    await sock.sendMessage(chatId, {
                        text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Action* : ❌ Remove failed (bot not admin?)\n║\n╚═|〔 ${botName} 〕`
                    });
                }
            }
        }
    });
}

// ── command ───────────────────────────────────────────────────────────────────
module.exports = {
    setupAntiTagListener,

    name:        'antitag',
    aliases:     ['antitagall', 'ata', 'antitaggroup'],
    description: 'Delete/warn/remove when members tag all in a group',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Status* : ❌ Groups only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        const sub  = args[0]?.toLowerCase();
        const sub2 = args[1]?.toLowerCase();
        const cfg  = loadCfg();
        const gcfg = Object.assign(defaultGcfg(), cfg[chatId] || {});
        if (!Array.isArray(gcfg.exempt)) gcfg.exempt = [];

        const save = () => { cfg[chatId] = gcfg; saveCfg(cfg); };
        const flag = v => v !== false ? '✅ ON' : '❌ OFF';
        const actionIcon = { delete: '🗑️ Delete', warn: '⚠️ Warn', remove: '🚫 Remove', kick: '🚫 Remove' };

        // ── status / no args ──────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            const extraList = gcfg.exempt.length
                ? gcfg.exempt.map(e => `║    • +${bareNum(e)}`).join('\n')
                : `║    • none`;
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ANTI TAG 〕`,
                    `║`,
                    `║ ▸ *State*         : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Action*        : ${actionIcon[gcfg.action] || gcfg.action}`,
                    `║ ▸ *Threshold*     : ${gcfg.threshold} mentions`,
                    `║ ▸ *Exempt admins* : ${flag(gcfg.exemptAdmins)}`,
                    `║ ▸ *Exempt sudos*  : ${flag(gcfg.exemptSudos)}`,
                    `║ ▸ *Extra exempt*  :`,
                    extraList,
                    `║`,
                    `║ ▸ *Commands* :`,
                    `║   ${prefix}antitag on / off`,
                    `║   ${prefix}antitag delete / warn / remove (kick)`,
                    `║   ${prefix}antitag threshold <number>`,
                    `║   ${prefix}antitag admins on / off`,
                    `║   ${prefix}antitag sudos on / off`,
                    `║   ${prefix}antitag exempt @user`,
                    `║   ${prefix}antitag unexempt @user`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── on / off ──────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            gcfg.enabled = sub === 'on'; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *State* : ${gcfg.enabled ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── action: delete / warn / remove / kick ────────────────────────────
        if (['delete', 'warn', 'remove', 'kick'].includes(sub)) {
            gcfg.action = sub === 'kick' ? 'remove' : sub; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Action* : ${actionIcon[sub]}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── threshold ─────────────────────────────────────────────────────────
        if (sub === 'threshold') {
            const n = parseInt(sub2);
            if (isNaN(n) || n < 1) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Usage* : ${prefix}antitag threshold <number>\n║ ▸ *Tip*   : 0 = group-tag only, 5 = tag 5+ members\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            gcfg.threshold = n; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Threshold* : ${n} mentions\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── admins on/off ─────────────────────────────────────────────────────
        if (sub === 'admins') {
            gcfg.exemptAdmins = sub2 === 'on' ? true : sub2 === 'off' ? false : !gcfg.exemptAdmins;
            save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Exempt group admins* : ${flag(gcfg.exemptAdmins)}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── sudos on/off ──────────────────────────────────────────────────────
        if (sub === 'sudos') {
            gcfg.exemptSudos = sub2 === 'on' ? true : sub2 === 'off' ? false : !gcfg.exemptSudos;
            save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Exempt owner/sudos* : ${flag(gcfg.exemptSudos)}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── exempt / unexempt @user ───────────────────────────────────────────
        if (sub === 'exempt' || sub === 'unexempt') {
            const ctx2   = msg.message?.extendedTextMessage?.contextInfo;
            const target = ctx2?.participant || ctx2?.mentionedJid?.[0] || null;
            if (!target) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ Reply to or @mention the user\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            const tNum = bareNum(target);
            if (sub === 'exempt') {
                if (!gcfg.exempt.some(e => bareNum(e) === tNum)) gcfg.exempt.push(target);
                save();
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Exempted* : +${tNum}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            } else {
                gcfg.exempt = gcfg.exempt.filter(e => bareNum(e) !== tNum);
                save();
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *Removed* : +${tNum}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
        }

        // ── unknown arg → ignore silently; only toggle when no arg given ─────
        if (sub) return;
        gcfg.enabled = !gcfg.enabled; save();
        return sock.sendMessage(chatId, {
            text: `╔═|〔  ANTI TAG 〕\n║\n║ ▸ *State* : ${gcfg.enabled ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
    }
};
