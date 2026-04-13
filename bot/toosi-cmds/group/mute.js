'use strict';

const { getBotName } = require('../../lib/botname');

module.exports = {
    name:        'mute',
    aliases:     ['close', 'lock', 'lockgroup', 'mutegrp'],
    description: 'Mute the group — only admins can send messages (sudo/admin only)',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '🔇', key: msg.key } }); } catch {}

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  🔇 MUTE 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // — permission check (sender) —
        let isPrivileged = ctx?.isOwnerUser || ctx?.isSudoUser;
        if (!isPrivileged) {
            try {
                const meta      = await sock.groupMetadata(chatId);
                const senderJid = msg.key.participant || msg.key.remoteJid;
                const senderNum = senderJid.split('@')[0].split(':')[0];
                const senderP   = meta.participants.find(p =>
                    (p.id || '').split('@')[0].split(':')[0] === senderNum || p.id === senderJid
                );
                isPrivileged = senderP?.admin === 'admin' || senderP?.admin === 'superadmin';
            } catch {}
        }

        if (!isPrivileged) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  🔇 MUTE 〕\n║\n║ ▸ *Status* : ❌ Permission denied\n║ ▸ *Reason* : Sudo users and group admins only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // — execute —
        try {
            const meta = await sock.groupMetadata(chatId);
            await sock.groupSettingUpdate(chatId, 'announcement');
            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  🔇 MUTE 〕`,
                    `║`,
                    `║ ▸ *Group*  : ${meta.subject}`,
                    `║ ▸ *Status* : 🔇 Group muted`,
                    `║ ▸ *Effect* : Only admins can send messages`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        } catch (e) {
            const reason = /not-authorized|forbidden/i.test(e.message)
                ? 'Bot is not an admin — promote the bot first'
                : e.message;
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🔇 MUTE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${reason}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
