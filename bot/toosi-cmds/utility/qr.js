'use strict';

const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'qr',
    aliases: ['qrcode', 'makeqr', 'genqr', 'createqr'],
    description: 'Generate a QR code from any text or URL — .qr <text>',
    category: 'utility',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📷', key: msg.key } }); } catch {}

        const ctxQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = ctxQuoted?.conversation || ctxQuoted?.extendedTextMessage?.text;
        const text = args.join(' ').trim() || quotedText?.trim();

        if (!text) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  QR CODE 📷 〕`,
                    `║`,
                    `║ ▸ *Usage*   : ${prefix}qr <text or URL>`,
                    `║ ▸ *Example* : ${prefix}qr https://wa.me/254706441840`,
                    `║ ▸ *Example* : ${prefix}qr Hello, scan me!`,
                    `║ ▸ *Tip*     : Reply any message with ${prefix}qr`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=20&data=${encodeURIComponent(text)}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) throw new Error(`QR API HTTP ${res.status}`);
            const buf = Buffer.from(await res.arrayBuffer());
            if (!buf.length) throw new Error('Empty QR image returned');

            const caption = `╔═|〔  QR CODE 📷 〕\n║\n║ ▸ *Data* : ${text.length > 60 ? text.slice(0, 60) + '…' : text}\n║\n╚═|〔 ${name} 〕`;
            await sock.sendMessage(chatId, { image: buf, caption }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  QR CODE 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
