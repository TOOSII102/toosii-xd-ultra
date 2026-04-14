'use strict';

const { checkPrivilege } = require('../../lib/groupUtils');
const { getBotName }     = require('../../lib/botname');

module.exports = {
    name:        'hidetag',
    aliases:     ['htag', 'silentall', 'stag'],
    description: 'Mention all members silently without showing tags (sudo/admin only)',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📢', key: msg.key } }); } catch {}

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  HIDETAG 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const { ok } = await checkPrivilege(sock, chatId, msg, ctx);
        if (!ok) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  HIDETAG 〕\n║\n║ ▸ *Status* : ❌ Permission denied\n║ ▸ *Reason* : Sudo users and group admins only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const text = args.join(' ').trim() || '📢 Attention everyone!';
        try {
            const meta = await sock.groupMetadata(chatId);
            const jids = meta.participants.map(p => p.id);
            await sock.sendMessage(chatId, { text, mentions: jids });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  HIDETAG 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
