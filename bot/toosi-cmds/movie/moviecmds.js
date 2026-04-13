'use strict';

const { casperGet, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

const MOVIE_API = 'https://movieapi.xcasper.space';
const MOVIE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://movieapi.xcasper.space',
    'Referer': 'https://movieapi.xcasper.space/'
};

async function movieApi(path, params = {}, timeoutMs = 15000) {
    const qs  = new URLSearchParams(params).toString();
    const url = `${MOVIE_API}${path}${qs ? '?' + qs : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: MOVIE_HEADERS });
    if (!res.ok) throw new Error(`MovieAPI HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'MovieAPI returned failure');
    return json;
}

async function omdbFetch(params, timeoutMs = 12000) {
    const qs = Object.entries({ apikey: 'trilogy', ...params })
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const res = await fetch(`https://www.omdbapi.com/?${qs}`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': 'ToosiiBot/1.0' }
    });
    if (!res.ok) throw new Error(`OMDb HTTP ${res.status}`);
    return res.json();
}

async function sbSearch(keyword, type = 'movie', pagelimit = 5) {
    const json = await movieApi('/api/showbox/search', { keyword, type, pagelimit });
    return Array.isArray(json.data) ? json.data : [];
}

async function sbMovie(id) {
    const json = await movieApi('/api/showbox/movie', { id });
    return json.data || null;
}

async function getImageBuffer(url, timeoutMs = 15000) {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (!res.ok) throw new Error(`Image HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}

function fmtRuntime(mins) {
    if (!mins) return 'N/A';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}

// ── Movie Info ────────────────────────────────────────────────────────────────
const movieCmd = {
    name: 'movie',
    aliases: ['movieinfo', 'movinfo', 'film', 'filminfo', 'imdb'],
    description: 'Full movie details with poster — .movie <title>',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎬 MOVIE INFO 〕\n║\n║ ▸ *Usage*   : ${prefix}movie <title>\n║ ▸ *Example* : ${prefix}movie avengers endgame\n║ ▸ *Tip*     : Use ${prefix}trailer <title> for the trailer\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });

            const results = await sbSearch(query, 'movie', 3);
            if (!results.length) throw new Error('No movie found for that title');

            const data = await sbMovie(results[0].id);
            if (!data) throw new Error('Could not fetch movie details');

            const stars   = '⭐'.repeat(Math.round((parseFloat(data.imdb_rating || 0)) / 2));
            const caption =
                `╔═|〔  🎬 MOVIE INFO 〕\n║\n` +
                `║ ▸ *Title*   : ${data.title} (${data.year})\n` +
                `║ ▸ *Rating*  : ⭐ ${data.imdb_rating || 'N/A'}/10 ${stars}\n` +
                `║ ▸ *Runtime* : ${fmtRuntime(data.runtime)} | ${data.content_rating || 'NR'}\n` +
                `║ ▸ *Genre*   : ${data.cats || 'N/A'}\n` +
                `║ ▸ *Director*: ${data.director || 'N/A'}\n` +
                `║ ▸ *Cast*    : ${(data.actors || 'N/A').split(',').slice(0, 3).join(', ')}\n` +
                `║ ▸ *Country* : ${data.country_list || 'N/A'} | ${data.language || 'N/A'}\n` +
                `║\n║ 📝 *Plot*: ${(data.description || 'N/A').substring(0, 200)}…\n║\n` +
                `║ 🎬 ${prefix}trailer ${data.title} — for trailer video\n║\n` +
                `╚═|〔 ${name} 〕`;

            const posterUrl = data.banner || data.poster_org;
            if (posterUrl) {
                try {
                    const imgBuf = await getImageBuffer(posterUrl);
                    await sock.sendMessage(chatId, { image: imgBuf, caption }, { quoted: msg });
                    return;
                } catch { }
            }
            await sock.sendMessage(chatId, { text: caption }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 MOVIE INFO 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Trailer ───────────────────────────────────────────────────────────────────
const trailerCmd = {
    name: 'trailer',
    aliases: ['movietrailer', 'gettrailer', 'movtrailer'],
    description: 'Get a movie trailer video — .trailer <title>',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const input  = args.join(' ').trim();
        if (!input) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎬 MOVIE TRAILER 〕\n║\n║ ▸ *Usage*   : ${prefix}trailer <movie title>\n║ ▸ *Example* : ${prefix}trailer dark knight\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });

            // Get movie from ShowBox (much more accurate than YouTube search)
            const results = await sbSearch(input, 'movie', 3);
            if (!results.length) throw new Error('Movie not found');

            const data    = await sbMovie(results[0].id);
            if (!data)    throw new Error('Could not fetch movie details');

            // Extract YouTube trailer keys (ShowBox stores them in data.trailer array)
            let trailerKeys = [];
            try {
                const raw = typeof data.trailer === 'string' ? JSON.parse(data.trailer) : data.trailer;
                if (Array.isArray(raw)) trailerKeys = raw.map(t => t.key).filter(Boolean);
            } catch { }

            // Also check trailer_url / trailerUrl fields
            for (const field of ['trailer_url', 'trailerUrl']) {
                if (data[field]) {
                    const m = data[field].match(/[?&v=]([A-Za-z0-9_-]{11})(?:&|$)/);
                    if (m) trailerKeys.unshift(m[1]);
                }
            }

            trailerKeys = [...new Set(trailerKeys)];
            if (!trailerKeys.length) throw new Error('No trailer found for this movie');

            const title = data.title;
            const info  =
                `║ ▸ *Title*  : ${title} (${data.year})\n` +
                `║ ▸ *IMDB*   : ⭐ ${data.imdb_rating || 'N/A'}/10\n` +
                `║ ▸ *Genre*  : ${data.cats || 'N/A'}\n` +
                `║ ▸ *Plot*   : ${(data.description || '').substring(0, 100)}…`;

            // Try to download each trailer key via Casper
            let sent = false;
            for (const key of trailerKeys.slice(0, 4)) {
                const ytUrl = `https://www.youtube.com/watch?v=${key}`;
                try {
                    const dl = await casperGet('/api/downloader/ytmp4', { url: ytUrl });
                    if (!dl.success || !dl.data?.downloads?.length) continue;

                    const picks = dl.data.downloads.filter(d => d.hasAudio && d.extension === 'mp4' && d.quality?.includes('360'));
                    const pick  = picks[0] || dl.data.downloads.find(d => d.hasAudio && d.extension === 'mp4');
                    if (!pick?.url) continue;

                    const buf = await dlBuffer(pick.url);
                    if (!buf || buf.length < 5000) continue;

                    const caption = `╔═|〔  🎬 MOVIE TRAILER 〕\n║\n${info}\n║ ▸ *Quality* : ${pick.quality || 'SD'}\n║\n╚═|〔 ${name} 〕`;
                    await sock.sendMessage(chatId, { video: buf, mimetype: 'video/mp4', caption }, { quoted: msg });
                    sent = true;
                    break;
                } catch { }
            }

            // Fallback — send the YouTube link (WhatsApp auto-generates a preview)
            if (!sent) {
                const ytLink = `https://www.youtube.com/watch?v=${trailerKeys[0]}`;
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  🎬 MOVIE TRAILER 〕\n║\n${info}\n║\n║ ▸ *Trailer* : ${ytLink}\n║ ▸ ⚠️ Direct video unavailable (studio-protected)\n║ 💡 Tap the link above to watch\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 MOVIE TRAILER 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Movie Search ──────────────────────────────────────────────────────────────
const mboxCmd = {
    name: 'mbox',
    aliases: ['moviebox', 'movbox', 'moviesearch', 'msearch', 'searchmovie'],
    description: 'Search for movies — .mbox <title>',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎥 MOVIE SEARCH 〕\n║\n║ ▸ *Usage*   : ${prefix}mbox <title>\n║ ▸ *Example* : ${prefix}mbox avengers\n║ ▸ *Tip*     : ${prefix}movie <title> for full details\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎥', key: msg.key } });

            const results = await sbSearch(query, 'movie', 8);
            if (!results.length) throw new Error('No movies found');

            const list = results.slice(0, 6).map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}* (${r.year || '?'})\n║      ⭐ ${r.imdb_rating || 'N/A'} | 👤 ${(r.actors || '').split(',')[0]?.trim() || 'N/A'}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎥 MOVIE SEARCH 〕\n║\n║ 🔍 *${query}* — ${results.length} results\n║\n${list}\n║\n║ 💡 ${prefix}trailer <title> to get trailer video\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎥 MOVIE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Trending Movies ───────────────────────────────────────────────────────────
const trendingCmd = {
    name: 'trending',
    aliases: ['trendingmovies', 'movietrending', 'topmovies'],
    description: 'Trending movies right now — .trending',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '📈', key: msg.key } });
            const json = await movieApi('/api/trending', { perPage: 8 });
            const list = (json.data?.subjectList || []).slice(0, 8).map((m, i) =>
                `║ ▸ [${i + 1}] *${m.title}* (${m.releaseDate?.substring(0, 4) || '?'})\n║      🎭 ${m.genre || 'N/A'}`
            ).join('\n║\n');
            if (!list) throw new Error('No trending data available');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  📈 TRENDING MOVIES 〕\n║\n${list}\n║\n║ 💡 ${prefix}movie <title> for full details\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  📈 TRENDING MOVIES 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Hot Movies & TV ───────────────────────────────────────────────────────────
const hotCmd = {
    name: 'hotmovies',
    aliases: ['hot', 'popularmovies', 'moviehot'],
    description: 'Hot & popular movies right now — .hotmovies',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '🔥', key: msg.key } });
            const json = await movieApi('/api/hot');
            const movies = (json.data?.movie || []).slice(0, 5);
            const tvs    = (json.data?.tv    || []).slice(0, 3);
            if (!movies.length && !tvs.length) throw new Error('No hot data available');

            const fmtList = (arr) => arr.map((m, i) =>
                `║ ▸ [${i + 1}] *${m.title}* (${m.releaseDate?.substring(0, 4) || '?'}) — 🎭 ${m.genre || 'N/A'}`
            ).join('\n');

            let text = `╔═|〔  🔥 HOT & POPULAR 〕\n║\n║ 🎬 *Top Movies*\n${fmtList(movies)}`;
            if (tvs.length) text += `\n║\n║ 📺 *Hot TV Shows*\n${fmtList(tvs)}`;
            text += `\n║\n║ 💡 ${prefix}movie <title> for details\n║\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🔥 HOT MOVIES 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Latest / New Movies ───────────────────────────────────────────────────────
const latestCmd = {
    name: 'newmovies',
    aliases: ['latestmovies', 'recentmovies', 'moviesnew'],
    description: 'Latest & newly released movies — .newmovies',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '🆕', key: msg.key } });
            const json  = await movieApi('/api/newtoxic/latest', { page: 1 });
            const items = (json.data || []).filter(x => x.type === 'movie').slice(0, 8);
            if (!items.length) throw new Error('No new movies found');
            const list = items.map((m, i) =>
                `║ ▸ [${i + 1}] *${m.title}*`
            ).join('\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🆕 LATEST MOVIES 〕\n║\n${list}\n║\n║ 💡 ${prefix}movie <title> for full details\n║ 💡 ${prefix}trailer <title> for trailer\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🆕 LATEST MOVIES 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── TV / Drama Search ─────────────────────────────────────────────────────────
const dramaCmd = {
    name: 'drama',
    aliases: ['dramasearch', 'tvshow', 'tvsearch', 'series'],
    description: 'Search for TV shows & dramas — .drama <title>',
    category: 'movie',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎭 TV / DRAMA SEARCH 〕\n║\n║ ▸ *Usage*   : ${prefix}drama <title>\n║ ▸ *Example* : ${prefix}drama game of thrones\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎭', key: msg.key } });
            const results = await sbSearch(query, 'tv', 6);
            if (!results.length) throw new Error('No TV shows found for that title');

            const list = results.slice(0, 6).map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}* (${r.year || '?'})\n║      ⭐ ${r.imdb_rating || 'N/A'}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 TV / DRAMA SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 TV / DRAMA SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── Actor / Cast Search ───────────────────────────────────────────────────────
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
                text: `╔═|〔  🎬 ACTOR SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n║ 💡 ${prefix}movie <title> for full details\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 ACTOR SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [movieCmd, trailerCmd, mboxCmd, trendingCmd, hotCmd, latestCmd, dramaCmd, actorCmd];
