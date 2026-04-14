const { keithGet, extractUrl, dlBuffer, convertTo128kbps } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'ncs',
    aliases: ['ncsdl', 'ncsmusic'],
    description: 'Download NCS music by artist/title',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const q      = args.join(' ').trim();

        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  NCS MUSIC 〕\n║\n║ ▸ *Usage*   : ${prefix}ncs <artist or title>\n║ ▸ *Example* : ${prefix}ncs alan walker\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            const data  = await keithGet('/download/ncs', { q });
            if (!data.status) throw new Error(data.error || 'API failed');
            const dlUrl = extractUrl(data.result);
            if (!dlUrl) throw new Error('No download URL returned');
            const title = data.result?.title || q;

            let buf = await dlBuffer(dlUrl);
            buf     = await convertTo128kbps(buf);

            const banner = `╔═|〔  NCS MUSIC 〕\n║\n║ ▸ *Track*   : ${title}\n║ ▸ *Quality* : 128kbps\n║ ▸ *Size*    : ${(buf.length/1024/1024).toFixed(2)} MB\n║\n╚═╝`;
            await sock.sendMessage(chatId, { document: buf, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  NCS MUSIC 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
