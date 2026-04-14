const { keithTry, extractUrl, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'pin',
    aliases: ['pinterest', 'pindl'],
    description: 'Download Pinterest image/video',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const url    = args[0];

        if (!url) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  PINTEREST 〕\n║\n║ ▸ *Usage* : ${prefix}pin <url>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            const data  = await keithTry(['/download/pinterest', '/download/pindl2', '/download/pindl3'], { url });
            const dlUrl = extractUrl(data.result);
            if (!dlUrl) throw new Error('No download URL returned');

            const buf     = await dlBuffer(dlUrl);
            const isVideo = dlUrl.includes('.mp4') || dlUrl.includes('video');
            const banner  = `╔═|〔  PINTEREST 〕\n║\n║ ▸ *Size* : ${(buf.length/1024/1024).toFixed(2)} MB\n║\n╚═╝`;

            if (isVideo) await sock.sendMessage(chatId, { video: buf, caption: banner }, { quoted: msg });
            else          await sock.sendMessage(chatId, { image: buf, caption: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  PINTEREST 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
