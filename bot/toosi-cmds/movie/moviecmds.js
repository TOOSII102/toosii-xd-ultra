'use strict';

const { getBotName } = require('../../lib/botname');

async function omdbFetch(params, timeoutMs = 12000) {
    const qs = Object.entries({ apikey: 'trilogy', ...params })
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`https://www.omdbapi.com/?${qs}`, {
            signal: controller.signal, headers: { 'User-Agent': 'ToosiiBot/1.0' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    } finally { clearTimeout(timer); }
}

// ── Movie Search (OMDb — free) ────────────────────────────────────────────────
const mboxCmd = {
    name: 'mbox',
    aliases: ['moviebox', 'movbox', 'moviesearch2', 'msearch'],
    description: 'Search for movies and TV shows — .mbox <title>',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎥 MOVIE SEARCH 〕\n║\n║ ▸ *Usage*   : ${prefix}mbox <title>\n║ ▸ *Example* : ${prefix}mbox avengers\n║ ▸ *Tip*     : Use ${prefix}movie <title> for detailed info\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎥', key: msg.key } });
            const data = await omdbFetch({ s: query });
            if (data.Response === 'False') throw new Error(data.Error || 'No movies found');

            const results = (data.Search || []).slice(0, 6);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.Title}* [${r.Type}]\n║      📅 ${r.Year} | 🆔 ${r.imdbID}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎥 MOVIE SEARCH 〕\n║\n║ 🔍 *${query}* — ${data.totalResults || results.length} results\n║\n${list}\n║\n║ 💡 Use ${prefix}movie <title> for full details\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎥 MOVIE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Movie Detail by title or IMDB ID (OMDb — free) ────────────────────────────
const trailerCmd = {
    name: 'trailer',
    aliases: ['movietrailer', 'gettrailer', 'movtrailer', 'imdbid', 'filminfo'],
    description: 'Get detailed movie info — .trailer <title or tt-ID>',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const input  = args.join(' ').trim();
        if (!input) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎬 MOVIE DETAIL 〕\n║\n║ ▸ *Usage*   : ${prefix}trailer <movie title>\n║ ▸ *Example* : ${prefix}trailer dark knight\n║ ▸ *By ID*   : ${prefix}trailer tt4154796\n║ ▸ *Tip*     : ${prefix}mbox <title> to browse results\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });
            const query = /^tt\d+$/i.test(input) ? { i: input } : { t: input };
            const data  = await omdbFetch(query);
            if (data.Response === 'False') throw new Error(data.Error || 'Movie not found');

            const ratings = (data.Ratings || []).map(r => `${r.Source}: ${r.Value}`).join(' · ') || 'N/A';
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 MOVIE DETAIL 〕\n║\n` +
                    `║ ▸ *Title*    : ${data.Title} (${data.Year})\n` +
                    `║ ▸ *Type*     : ${data.Type}\n` +
                    `║ ▸ *Genre*    : ${data.Genre}\n` +
                    `║ ▸ *Director* : ${data.Director}\n` +
                    `║ ▸ *Cast*     : ${data.Actors}\n` +
                    `║ ▸ *Runtime*  : ${data.Runtime}\n` +
                    `║ ▸ *Rated*    : ${data.Rated}\n` +
                    `║ ▸ *IMDB*     : ⭐ ${data.imdbRating}/10 (${data.imdbVotes} votes)\n` +
                    `║ ▸ *Language* : ${data.Language}\n` +
                    `║ ▸ *Country*  : ${data.Country}\n` +
                    `║ ▸ *Awards*   : ${data.Awards}\n` +
                    `║\n║ 📝 *${data.Plot}*\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 MOVIE DETAIL 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Drama Search (OMDb TV type) ───────────────────────────────────────────────
const dramaCmd = {
    name: 'drama',
    aliases: ['dramasearch', 'dramalist', 'tvshow'],
    description: 'Search for TV dramas and series — .drama <title>',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎭 DRAMA SEARCH 〕\n║\n║ ▸ *Usage*   : ${prefix}drama <title>\n║ ▸ *Example* : ${prefix}drama game of thrones\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎭', key: msg.key } });
            const data = await omdbFetch({ s: query, type: 'series' });
            if (data.Response === 'False') throw new Error(data.Error || 'No dramas found');

            const results = (data.Search || []).slice(0, 6);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.Title}* (${r.Year})\n║      🆔 ${r.imdbID}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 DRAMA SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n║ 💡 ${prefix}trailer <imdbID> for details\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 DRAMA SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Actor / Cast Search (OMDb) ────────────────────────────────────────────────
const actorCmd = {
    name: 'actor',
    aliases: ['actress', 'actorsearch', 'celeb', 'cast'],
    description: 'Find movies starring an actor — .actor <name>',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎬 ACTOR SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}actor <name>\n║ ▸ *Example* : ${prefix}actor will smith\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });
            const data = await omdbFetch({ s: query });
            if (data.Response === 'False') throw new Error(data.Error || 'Nothing found');

            const results = (data.Search || []).slice(0, 6);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.Title}* [${r.Type}] (${r.Year})`
            ).join('\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 ACTOR SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n║ 💡 ${prefix}trailer <title or imdbID> for full details\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 ACTOR SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [mboxCmd, trailerCmd, dramaCmd, actorCmd];
