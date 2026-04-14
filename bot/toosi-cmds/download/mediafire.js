const { casperGet, keithGet, extractUrl, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'mf',
    aliases: ['mediafire', 'mfire'],
    description: 'Download file from MediaFire',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const url    = args[0];

        if (!url) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  MEDIAFIRE 〕\n║\n║ ▸ *Usage* : ${prefix}mf <mediafire_url>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            let buf, fileName, fileSize;

            try {
                const data = await casperGet('/api/downloader/mediafire', { query: url });
                if (!data.success) throw new Error(data.error || 'Casper: no result');
                const file = data.file;
                if (!file?.downloadUrl) throw new Error('Casper: no download URL');
                fileName = file.filename || file.title || url.split('/').pop()?.split('?')[0] || 'file';
                fileSize = file.fileSize || '';
                buf      = await dlBuffer(file.downloadUrl);
            } catch {
                const data2 = await keithGet('/download/mfire', { url });
                if (!data2.status) throw new Error(data2.error || 'fallback failed');
                const dlUrl2 = extractUrl(data2.result);
                if (!dlUrl2) throw new Error('No fallback URL');
                buf      = await dlBuffer(dlUrl2);
                fileName = url.split('/').pop()?.split('?')[0] || 'file';
                fileSize = '';
            }

            const banner = `╔═|〔  MEDIAFIRE 〕\n║\n║ ▸ *File* : ${fileName}\n║ ▸ *Size* : ${fileSize || (buf.length/1024/1024).toFixed(2)+' MB'}\n║\n╚═╝`;
            await sock.sendMessage(chatId, { document: buf, mimetype: 'application/octet-stream', fileName, caption: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  MEDIAFIRE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
