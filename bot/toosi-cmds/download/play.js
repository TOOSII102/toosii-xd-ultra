const { casperGet, keithTry, extractUrl, dlBuffer, convertTo128kbps } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

const KEITH_AUDIO = ['/download/ytmp3','/download/audio','/download/dlmp3','/download/mp3','/download/yta','/download/yta2','/download/yta3','/download/yta4','/download/yta5'];

function trunc(str, max = 38) {
    return str && str.length > max ? str.slice(0, max - 1) + '…' : str || '';
}

function fmtSize(bytes) {
    if (!bytes) return '? MB';
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

module.exports = {
    name: 'play',
    aliases: ['music', 'song', 'playsong'],
    description: 'Search and play a song from YouTube (128kbps MP3)',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  PLAY MUSIC 〕`, `║`,
                    `║ ▸ *Usage*   : ${prefix}play <song name>`,
                    `║ ▸ *Example* : ${prefix}play Alan Walker Faded`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } });

            let buf, title, channel, duration, quality;

            // ── Primary: casper search + download ─────────────────────────
            try {
                const search = await casperGet('/api/search/youtube', { query });
                if (!search.success || !search.videos?.length) throw new Error('No search results');
                const top  = search.videos[0];
                const dl   = await casperGet('/api/downloader/ytmp3', { url: top.url, quality: '128' });
                if (!dl.success || !dl.url) throw new Error(dl.error || 'No audio URL');
                buf      = await dlBuffer(dl.url);
                title    = top.title   || query;
                channel  = top.channel || '';
                duration = top.duration || '';
                quality  = dl.quality  || '128kbps';

            // ── Fallback: keith (works with direct YT URLs, not queries) ──
            // Only kicks in if the user passed a youtube URL as query
            } catch (casperErr) {
                const isYtUrl = /youtu\.?be|youtube\.com/.test(query);
                if (!isYtUrl) throw casperErr;
                const data2  = await keithTry(KEITH_AUDIO, { url: query });
                const dlUrl  = extractUrl(data2.result);
                if (!dlUrl) throw new Error('No audio URL from fallback');
                buf     = await dlBuffer(dlUrl);
                buf     = await convertTo128kbps(buf);
                title   = query;
                channel = '';
                duration = '';
                quality  = '128kbps';
            }

            const banner = [
                `╔═|〔  PLAY MUSIC 〕`, `║`,
                `║ ▸ *Track*   : ${trunc(title)}`,
                channel  ? `║ ▸ *Channel* : ${trunc(channel)}`  : null,
                duration ? `║ ▸ *Length*  : ${duration}`        : null,
                `║ ▸ *Quality* : ${quality}`,
                `║ ▸ *Size*    : ${fmtSize(buf.length)}`,
                `║`,
                `╚═╝`,
            ].filter(Boolean).join('\n');

            await sock.sendMessage(chatId, {
                document: buf,
                mimetype: 'audio/mpeg',
                fileName: `${title.replace(/[^\w\s-]/g, '').trim() || 'audio'}.mp3`,
                caption: banner,
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  PLAY MUSIC 〕`, `║`,
                    `║ ▸ *Query*  : ${trunc(query)}`,
                    `║ ▸ *Status* : ❌ Failed`,
                    `║ ▸ *Reason* : ${e.message}`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }
    }
};
