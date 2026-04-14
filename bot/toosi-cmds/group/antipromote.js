'use strict';
// ─────────────────────────────────────────────────────────────
//  Anti-Promote — auto-demote anyone who gets promoted without owner/bot consent
// ─────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/antipromote.json');

function load() {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return {}; }
}
function save(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}


// Reset all groups to OFF on every bot startup
try {
    const _boot = load(); let _dirty = false;
    for (const id of Object.keys(_boot)) { if (_boot[id]) { _boot[id] = false; _dirty = true; } }
    if (_dirty) save(_boot);
} catch {}
function isEnabled(chatId) { return !!load()[chatId]; }

// Called from index.js on group-participants-update events
async function handleGroupUpdate(sock, update) {
    const { id: chatId, participants, action } = update;
    if (action !== 'promote') return;
    if (!isEnabled(chatId)) return;

    for (const jid of participants) {
        try {
            await sock.groupParticipantsUpdate(chatId, [jid], 'demote');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI-PROMOTE 〕\n║\n║ ▸ 🚫 @${jid.replace(/[^0-9]/g, '').slice(-6)} was demoted\n║ ▸ Unauthorized promotion blocked\n║\n╚═╝`,
                mentions: [jid],
            });
        } catch {}
    }
}

module.exports = {
    name: 'antipromote',
    aliases: ['antiadmin', 'antipromo'],
    description: 'Toggle auto-demote of unauthorized promotions',
    category: 'group',
    handleGroupUpdate, // exposed for index.js

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us'))
            return sock.sendMessage(chatId, { text: `╔═|〔  ANTI-PROMOTE 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });

        try { await sock.sendMessage(chatId, { react: { text: '🛡️', key: msg.key } }); } catch {}

        const db      = load();
        const enabled = !!db[chatId];
        db[chatId]    = !enabled;
        save(db);

        const status = !enabled ? '✅ ENABLED' : '❌ DISABLED';
        await sock.sendMessage(chatId, {
            text: `╔═|〔  ANTI-PROMOTE 〕\n║\n║ ▸ Status: *${status}*\n║\n║ ▸ ${!enabled ? 'Anyone promoted without\n║   bot/owner consent will be\n║   automatically demoted.' : 'Anti-promote is now off.'}\n║\n╚═╝`,
        }, { quoted: msg });
    }
};
