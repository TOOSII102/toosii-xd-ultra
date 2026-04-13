const { keithGet } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

const ytsCmd = {
    name: 'yts',
    aliases: ['ytsearch', 'ytsearch', 'youtubesearch', 'ytfind'],
    description: 'Search YouTube videos',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🎬 YOUTUBE SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}yts <query>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });
            const data = await keithGet('/search/yts', { query });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'No results found');
            const results = data.result.slice(0, 5);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}*\n║      👁️ ${Number(r.views || 0).toLocaleString()} views | ⏱️ ${r.duration || 'N/A'}\n║      🔗 ${r.url}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  🎬 YOUTUBE SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🎬 YOUTUBE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const googleCmd = {
    name: 'google',
    aliases: ['gsearch', 'googlesearch', 'search'],
    description: 'Search the web with Google',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🌐 GOOGLE SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}google <query>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🌐', key: msg.key } });
            const data = await keithGet('/search/google', { q: query });
            if (!data.status || !data.result?.items?.length) throw new Error(data.error || 'No results');
            const items = data.result.items.slice(0, 5);
            const list = items.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}*\n║      ${(r.snippet || '').substring(0, 80).replace(/\n/g, ' ')}\n║      🔗 ${r.link}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  🌐 GOOGLE SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🌐 GOOGLE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const braveCmd = {
    name: 'brave',
    aliases: ['bravesearch', 'bsearch'],
    description: 'Search the web with Brave',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🦁 BRAVE SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}brave <query>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🦁', key: msg.key } });
            const data = await keithGet('/search/brave', { q: query });
            if (!data.status || !data.result?.results?.length) throw new Error(data.error || 'No results');
            const results = data.result.results.slice(0, 5);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}*\n║      ${(r.description || '').substring(0, 80)}\n║      🔗 ${r.url}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  🦁 BRAVE SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🦁 BRAVE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const bibleCmd = {
    name: 'bible',
    aliases: ['verse', 'scripture', 'holybook'],
    description: 'Look up any Bible verse or passage',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  📖 BIBLE 〕\n║\n║ ▸ *Usage* : ${prefix}bible <reference>\n║ ▸ *Example* : ${prefix}bible john3:16\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '📖', key: msg.key } });
            const data = await keithGet('/search/bible', { q: query });
            if (!data.status || !data.result) throw new Error(data.error || 'Verse not found');
            const r = data.result;
            const verses = (r.verses || []).map(v => `║ ▸ [${v.verse}] ${v.text}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  📖 BIBLE 〕\n║\n║ ▸ *Reference* : ${r.reference}\n║ ▸ *Version*   : ${r.translation?.name || 'WEB'}\n║\n${verses}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  📖 BIBLE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const lyricsCmd = {
    name: 'lyrics',
    aliases: ['lyric', 'songlyrics', 'getlyrics'],
    description: 'Get full lyrics for any song',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🎵 LYRICS 〕\n║\n║ ▸ *Usage* : ${prefix}lyrics <song name>\n║ ▸ *Example* : ${prefix}lyrics faded alan walker\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } });

            // lyrics2 returns the actual lyrics text directly
            const data2 = await keithGet('/search/lyrics2', { query });
            if (data2.status && data2.result && typeof data2.result === 'string') {
                const lyricsText = data2.result.substring(0, 3000);
                return await sock.sendMessage(chatId, { text: `╔═|〔  🎵 LYRICS 〕\n║\n║ ▸ *Song* : ${query}\n║\n${lyricsText}${data2.result.length > 3000 ? '\n║\n║ ▸ [lyrics truncated]' : ''}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
            }

            // Fallback: lyrics1 gives search results list
            const data1 = await keithGet('/search/lyrics', { query });
            if (!data1.status || !data1.result?.length) throw new Error('No lyrics found');
            const r = data1.result[0];
            const infoLine = `║ ▸ *Song*   : ${r.song || query}\n║ ▸ *Artist* : ${r.artist || 'Unknown'}\n║ ▸ *Album*  : ${r.album || 'N/A'}`;
            await sock.sendMessage(chatId, { text: `╔═|〔  🎵 LYRICS 〕\n║\n${infoLine}\n║\n║ Full lyrics not available — try a more specific search.\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🎵 LYRICS 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const movieCmd = {
    name: 'movie',
    aliases: ['film', 'moviesearch', 'imdb'],
    description: 'Search for any movie or TV show details',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🎬 MOVIE SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}movie <title>\n║ ▸ *Example* : ${prefix}movie avengers\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });
            const data = await keithGet('/search/movie', { q: query });
            if (!data.status || !data.result?.Title) throw new Error(data.error || 'Movie not found');
            const r = data.result;
            const banner =
                `╔═|〔  🎬 MOVIE 〕\n║\n` +
                `║ ▸ *Title*    : ${r.Title} (${r.Year})\n` +
                `║ ▸ *Genre*    : ${r.Genre}\n` +
                `║ ▸ *Director* : ${r.Director}\n` +
                `║ ▸ *Actors*   : ${r.Actors}\n` +
                `║ ▸ *Runtime*  : ${r.Runtime}\n` +
                `║ ▸ *Rated*    : ${r.Rated}\n` +
                `║ ▸ *IMDB*     : ⭐ ${r.imdbRating}/10\n` +
                `║\n║ 📝 *Plot* : ${r.Plot}\n║\n` +
                `╚═|〔 ${name} 〕`;
            await sock.sendMessage(chatId, { text: banner }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🎬 MOVIE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const apkCmd = {
    name: 'apk',
    aliases: ['apksearch', 'apkfind', 'getapk'],
    description: 'Search and find APK download links for any app',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  📱 APK SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}apk <app name>\n║ ▸ *Example* : ${prefix}apk whatsapp\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '📱', key: msg.key } });
            const data = await keithGet('/search/apk', { q: query });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'No APKs found');
            const results = data.result.slice(0, 4);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}*\n║      👤 ${r.developer || 'Unknown'}\n║      🔗 ${r.link || 'N/A'}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  📱 APK SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  📱 APK SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

module.exports = [ytsCmd, googleCmd, braveCmd, bibleCmd, lyricsCmd, movieCmd, apkCmd];
