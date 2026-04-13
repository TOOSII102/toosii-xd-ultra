'use strict';

const { getBotName } = require('../../lib/botname');
const BASE = 'https://apiskeith.top';

async function kFetch(path) {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ── 1. BIBLE SEARCH ───────────────────────────────────────────────────────────
const bibleCmd = {
    name: 'biblesearch',
    aliases: ['biblesrch', 'bverse', 'findbible'],
    description: 'Search Bible verses by keyword',
    category: 'spiritual',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '✝️', key: msg.key } }); } catch {}

        const q = args.join(' ').trim();
        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  BIBLE SEARCH 〕\n║\n║ ▸ *Usage*   : ${prefix}biblesearch <keyword>\n║ ▸ *Example* : ${prefix}biblesearch love\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data   = await kFetch(`/bible/search?q=${encodeURIComponent(q)}`);
            const r      = data?.result;
            const verses = r?.verses || r?.results || [];
            if (!verses.length) throw new Error('No verses found');

            let out = `╔═|〔  BIBLE SEARCH 〕\n║\n║ ▸ *Query*   : ${q}\n║ ▸ *Found*   : ${r?.totalResults || verses.length} results\n║ ▸ *Version* : ${r?.version || 'KJV'}\n║`;
            for (const v of verses.slice(0, 4)) {
                const ref  = v.reference || v.verse || v.book_name || '';
                const text = v.text || v.verse_text || v.content || '';
                if (ref || text) out += `\n║ 📖 *${ref}*\n║   _${String(text).slice(0, 200)}_\n║`;
            }
            out += `\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text: out }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  BIBLE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 2. RANDOM BIBLE VERSE ─────────────────────────────────────────────────────
const randBibleCmd = {
    name: 'randverse',
    aliases: ['dailyverse', 'bibleverse', 'devotional'],
    description: 'Get a random Bible verse',
    category: 'spiritual',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📖', key: msg.key } }); } catch {}

        try {
            const data = await kFetch(`/random/bible`);
            const r    = data?.result;
            const v    = r?.verse;
            if (!v) throw new Error('No verse returned');

            const ref  = [v.book_name || v.bookId, v.chapter, v.verse_start || v.verse].filter(Boolean).join(' ');
            const text = v.text || v.content || '';
            const trans = r?.translation?.name || 'Bible';

            await sock.sendMessage(chatId, {
                text: `╔═|〔  DAILY VERSE 〕\n║\n║ ▸ *Ref*     : ${ref}\n║ ▸ *Version* : ${trans}\n║\n_${text.slice(0, 500)}_\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  DAILY VERSE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 3. AI BIBLE ───────────────────────────────────────────────────────────────
const aiBibleCmd = {
    name: 'aibibl',
    aliases: ['askbible', 'biblai', 'godai'],
    description: 'Ask a question and get Bible-based AI answer',
    category: 'spiritual',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '✝️', key: msg.key } }); } catch {}

        const ctxQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quoted    = ctxQuoted?.conversation || ctxQuoted?.extendedTextMessage?.text;
        const q         = args.join(' ').trim() || quoted;

        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AI BIBLE 〕\n║\n║ ▸ *Usage*   : ${prefix}aibibl <question>\n║ ▸ *Example* : ${prefix}aibibl who is Jesus\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data    = await kFetch(`/ai/bible?q=${encodeURIComponent(q)}`);
            const r       = data?.result;
            const results = r?.results || [];
            const trans   = r?.translation || 'ESV';

            let out = `╔═|〔  AI BIBLE 〕\n║\n║ ▸ *Q*       : ${q.slice(0, 100)}\n║ ▸ *Version* : ${trans}\n║`;
            for (const item of results.slice(0, 3)) {
                const ref  = item.reference || '';
                const text = item.text || item.content || '';
                if (text) out += `\n║ 📖 *${ref}*\n║   _${String(text).slice(0, 250)}_\n║`;
            }
            if (!results.length) {
                const plain = r?.answer || r?.text || String(r || '').slice(0, 1000);
                out += `\n${plain}\n║`;
            }
            out += `\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text: out }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  AI BIBLE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 4. QURAN SURAH LIST ───────────────────────────────────────────────────────
const surahListCmd = {
    name: 'surahlist',
    aliases: ['slist', 'quranlist', 'surahs'],
    description: 'List all 114 Quran surahs with numbers',
    category: 'spiritual',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🕌', key: msg.key } }); } catch {}

        try {
            const data   = await kFetch(`/surahlist`);
            const surahs = data?.result?.data || [];
            if (!surahs.length) throw new Error('No data returned');

            const page = parseInt(args[0]) || 1;
            const SIZE = 20;
            const start = (page - 1) * SIZE;
            const slice = surahs.slice(start, start + SIZE);
            const total = Math.ceil(surahs.length / SIZE);

            let out = `╔═|〔  QURAN SURAHS — Page ${page}/${total} 〕\n║`;
            for (const s of slice) {
                out += `\n║ ${String(s.number).padStart(3, ' ')}. ${s.name || s.englishName} — ${s.englishNameTranslation || s.meaning || ''}`;
            }
            out += `\n║\n║ ▸ Page ${page}/${total} — use ${prefix}surahlist ${page + 1 <= total ? page + 1 : 1} for next\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text: out }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SURAH LIST 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 5. AI MUSLIM ──────────────────────────────────────────────────────────────
const aiMuslimCmd = {
    name: 'aimuslim',
    aliases: ['askquran', 'islamai', 'allahq'],
    description: 'Ask an Islamic question and get an AI answer with Quran references',
    category: 'spiritual',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🕌', key: msg.key } }); } catch {}

        const ctxQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quoted    = ctxQuoted?.conversation || ctxQuoted?.extendedTextMessage?.text;
        const q         = args.join(' ').trim() || quoted;

        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AI MUSLIM 〕\n║\n║ ▸ *Usage*   : ${prefix}aimuslim <question>\n║ ▸ *Example* : ${prefix}aimuslim what is Ramadan\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data    = await kFetch(`/ai/muslim?q=${encodeURIComponent(q)}`);
            const results = data?.result?.results || [];

            let out = `╔═|〔  AI MUSLIM 〕\n║\n║ ▸ *Q* : ${q.slice(0, 100)}\n║`;
            for (const item of results.slice(0, 3)) {
                const surah = item.surah_name || item.surah || '';
                const ayah  = item.ayah || item.verse || item.id || '';
                const text  = item.text || item.content || item.translation || '';
                if (text) {
                    out += `\n║ 📿 ${surah ? `*${surah}` : ''}${ayah ? ` (${ayah})*` : '*'}\n║   _${String(text).slice(0, 250)}_\n║`;
                }
            }
            if (!results.length) {
                const plain = data?.result?.answer || String(data?.result || '').slice(0, 1000);
                out += `\n${plain}\n║`;
            }
            out += `\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text: out }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  AI MUSLIM 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 6. ADVENTIST HYMNAL ───────────────────────────────────────────────────────
const hymnCmd = {
    name: 'hymn',
    aliases: ['hymnal', 'adventhymn', 'sda'],
    description: 'Look up an Adventist hymnal by number (1–695)',
    category: 'spiritual',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🎼', key: msg.key } }); } catch {}

        const num = parseInt(args[0]);
        if (!num || num < 1 || num > 695) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ADVENTIST HYMNAL 〕\n║\n║ ▸ *Usage*   : ${prefix}hymn <number>\n║ ▸ *Example* : ${prefix}hymn 1\n║ ▸ *Range*   : 1 – 695\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data   = await kFetch(`/adventist/hymnal?q=${num}`);
            const r      = data?.result;
            if (!r?.title) throw new Error('Hymn not found');

            const verses = (r.verses || []).slice(0, 4);
            let out = `╔═|〔  ADVENTIST HYMNAL 〕\n║\n║ ▸ *#${r.number}* — ${r.title}\n║`;
            for (const v of verses) {
                out += `\n║ ── *Verse ${v.number}*\n`;
                for (const line of (v.lines || [])) {
                    out += `║   ${line}\n`;
                }
                out += `║`;
            }
            if (r.chorus?.lines?.length) {
                out += `\n║ ── *Chorus*\n`;
                for (const line of r.chorus.lines) {
                    out += `║   ${line}\n`;
                }
                out += `║`;
            }
            out += `\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text: out }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ADVENTIST HYMNAL 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [
    bibleCmd,
    randBibleCmd,
    aiBibleCmd,
    surahListCmd,
    aiMuslimCmd,
    hymnCmd,
];
