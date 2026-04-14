'use strict';

const { addSudo, mapLidToPhone, getSudoList } = require('../../lib/sudo-store');
const { getBotName } = require('../../lib/botname');

const H = '╔═|〔  ADD SUDO 〕';
const F = () => `╚═╝`;

function resolveRealNumber(jid, sock) {
    if (!jid) return null;
    if (!jid.includes('@lid')) {
        const raw = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        return (raw && raw.length >= 7 && raw.length <= 15) ? raw : null;
    }
    if (sock) {
        try {
            if (sock.signalRepository?.lidMapping?.getPNForLID) {
                const pn = sock.signalRepository.lidMapping.getPNForLID(jid);
                if (pn) {
                    const num = String(pn).split('@')[0].replace(/[^0-9]/g, '');
                    if (num.length >= 7) return num;
                }
            }
        } catch {}
    }
    return null;
}

module.exports = {
    name:         'addsudo',
    aliases:      ['sudo'],
    description:  'Add a user to the sudo list (trusted users with owner-level access)',
    category:     'owner',
    ownerOnly:    true,
    sudoAllowed:  false,

    async execute(sock, msg, args, PREFIX, ctx) {
        const chatId  = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🛡️', key: msg.key } }); } catch {}
        const botName = getBotName();

        if (!ctx.isOwner()) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ADD SUDO 〕\n║\n║ ▸ *Status* : ❌ Owner only command\n║\n╚═╝`
            }, { quoted: msg });
        }

        const quoted   = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        let targetNumber = null;
        let quotedLid    = null;

        if (quoted) {
            const resolved = resolveRealNumber(quoted, sock);
            if (resolved) {
                targetNumber = resolved;
            } else if (args[0]) {
                targetNumber = args[0].replace(/[^0-9]/g, '');
            } else {
                return sock.sendMessage(chatId, {
                    text: `${H}\n║\n║ ▸ *Usage*  : ${PREFIX}addsudo <number>\n║ ▸ *Reply*  : reply a message + ${PREFIX}addsudo\n║\n╚═╝`
                }, { quoted: msg });
            }
            if (quoted.includes('@lid')) quotedLid = quoted.split('@')[0].split(':')[0];
        } else if (mentioned) {
            const resolved = resolveRealNumber(mentioned, sock);
            targetNumber = resolved || args[0]?.replace(/[^0-9]/g, '') || null;
        } else if (args[0]) {
            targetNumber = args[0].replace(/[^0-9]/g, '');
        }

        if (!targetNumber || targetNumber.length < 7) {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Usage*   : ${PREFIX}addsudo <number>\n║ ▸ *Reply*   : reply a message + ${PREFIX}addsudo\n║ ▸ *Mention* : @tag someone + ${PREFIX}addsudo\n║\n╚═╝`
            }, { quoted: msg });
        }

        const ownerNumber = (ctx.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
        if (targetNumber === ownerNumber) {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Status* : You are already the owner\n║\n╚═╝`
            }, { quoted: msg });
        }

        const result = addSudo(targetNumber, quotedLid);

        if (quotedLid && quotedLid !== targetNumber) {
            mapLidToPhone(quotedLid, targetNumber);
        }

        if (result.success) {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Number* : +${result.number}\n║ ▸ *Status* : ✅ Added to sudo list\n║ ▸ *Access* : Owner-level commands\n${quotedLid ? '║ ▸ *LID*    : Linked ✅\n' : ''}║\n${F()}`
            }, { quoted: msg });
        }

        if (result.reason === 'Already a sudo user') {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Number* : +${result.number}\n║ ▸ *Status* : Already a sudo user${quotedLid ? '\n║ ▸ *LID*    : Re-linked ✅' : ''}\n║\n╚═╝`
            }, { quoted: msg });
        }

        return sock.sendMessage(chatId, {
            text: `${H}\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${result.reason}\n║\n╚═╝`
        }, { quoted: msg });
    }
};
