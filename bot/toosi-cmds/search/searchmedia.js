const { keithGet } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

const imgCmd = {
    name: 'img',
    aliases: ['image', 'imgsearch', 'images', 'pic'],
    description: 'Search for images on the web',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🖼️ IMAGE SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}img <query>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🖼️', key: msg.key } });
            const data = await keithGet('/search/images', { query });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'No images found');
            const images = data.result.slice(0, 5);
            const list = images.map((r, i) => `║ ▸ [${i + 1}] ${r.url || r}`).join('\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  🖼️ IMAGE SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🖼️ IMAGE SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const scsCmd = {
    name: 'scs',
    aliases: ['scsearch', 'soundcloudsearch', 'scfind'],
    description: 'Search SoundCloud for tracks and artists',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🎧 SOUNDCLOUD SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}scs <song/artist>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎧', key: msg.key } });
            const data = await keithGet('/search/soundcloud', { q: query });
            if (!data.status || !data.result?.result?.length) throw new Error(data.error || 'No results');
            const results = data.result.result.slice(0, 5);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}*\n║      👤 ${r.artist || 'Unknown'} | 👁️ ${r.views || 'N/A'}\n║      🔗 ${r.url}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  🎧 SOUNDCLOUD SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🎧 SOUNDCLOUD SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const tiktrendCmd = {
    name: 'tiktrend',
    aliases: ['tiktoktrend', 'trending', 'tiktrending'],
    description: 'See trending TikTok videos by region',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const region = (args[0] || 'KE').toUpperCase();
        try {
            await sock.sendMessage(chatId, { react: { text: '📈', key: msg.key } });
            const data = await keithGet('/search/tiktoktrend', { q: region });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'No trending videos found');
            const results = data.result.slice(0, 6);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] ${(r.title || 'No title').substring(0, 50)}\n║      👤 ${r.author || 'Unknown'} | 📍 ${r.region || region}\n║      🔗 ${r.play || r.video_id ? 'https://www.tiktok.com/@user/video/' + r.video_id : 'N/A'}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  📈 TIKTOK TRENDS 〕\n║\n║ ▸ *Region* : ${region}\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  📈 TIKTOK TRENDS 〕\n║\n║ ▸ *Usage*  : ${prefix}tiktrend [region e.g. KE, US, NG]\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const tikuserCmd = {
    name: 'tikuser',
    aliases: ['tiktokuser', 'tiksearch', 'tikprofile'],
    description: 'Search TikTok user posts by username',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const user   = args[0]?.replace('@', '').trim();
        if (!user) return sock.sendMessage(chatId, { text: `╔═|〔  🎵 TIKTOK USER 〕\n║\n║ ▸ *Usage* : ${prefix}tikuser <username>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } });
            const data = await keithGet('/search/tiktoksearch', { query: user });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'User not found or no posts');
            const results = data.result.slice(0, 5);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] ${(r.title || 'No title').substring(0, 50)}\n║      🔗 ${r.play || (r.video_id ? 'https://www.tiktok.com/@' + user + '/video/' + r.video_id : 'N/A')}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  🎵 TIKTOK USER 〕\n║\n║ ▸ *User* : @${user}\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🎵 TIKTOK USER 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const wagroupCmd = {
    name: 'wagroup',
    aliases: ['wgroup', 'whatsappgroup', 'groupsearch'],
    description: 'Find WhatsApp group invite links by keyword',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  💬 WA GROUP SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}wagroup <keyword>\n║ ▸ *Example* : ${prefix}wagroup football\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '💬', key: msg.key } });
            const data = await keithGet('/search/whatsappgroup', { q: query });
            const results = data.results || data.result || [];
            if (!results.length) throw new Error('No groups found');
            const list = results.slice(0, 6).map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}*\n║      🔗 ${r.url}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  💬 WA GROUP SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  💬 WA GROUP SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const tgstickerCmd = {
    name: 'tgsticker',
    aliases: ['tgstickers', 'telesticker', 'tgsearch'],
    description: 'Search Telegram animated sticker packs',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🎭 TG STICKER SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}tgsticker <keyword>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎭', key: msg.key } });
            const data = await keithGet('/search/tgs', { q: query });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'No sticker packs found');
            const results = data.result.slice(0, 6);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title || r.name}*\n║      📦 Pack: ${r.name}\n║      🔗 https://t.me/addstickers/${r.name}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  🎭 TG STICKER SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🎭 TG STICKER SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const stickersearchCmd = {
    name: 'stickersearch',
    aliases: ['findstickerpack', 'stickerpack', 'spacks'],
    description: 'Search for WhatsApp sticker packs online',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  🎨 STICKER SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}stickersearch <keyword>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎨', key: msg.key } });
            const data = await keithGet('/search/sticker', { q: query });
            if (!data.status || !data.result) throw new Error(data.error || 'No sticker packs found');
            const r = data.result;
            const packTitle = r.title || query;
            const urls = (r.sticker_url || []).slice(0, 5);
            const list = urls.map((u, i) => `║ ▸ [${i + 1}] ${u}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎨 STICKER SEARCH 〕\n║\n║ ▸ *Pack* : ${packTitle}\n║ ▸ *Count*: ${(r.sticker_url || []).length} stickers\n║\n${list}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  🎨 STICKER SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

const tgsearchCmd = {
    name: 'tgsearch',
    aliases: ['telegramsearch', 'tgchannel', 'telegramfind'],
    description: 'Search Telegram channels and groups',
    category: 'search',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, { text: `╔═|〔  ✈️ TELEGRAM SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}tgsearch <keyword>\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '✈️', key: msg.key } });
            const data = await keithGet('/search/telegramchannel', { q: query });
            const results = Array.isArray(data.result) ? data.result : [];
            if (!results.length) {
                return sock.sendMessage(chatId, { text: `╔═|〔  ✈️ TELEGRAM SEARCH 〕\n║\n║ ▸ *Query* : ${query}\n║ ▸ *Result* : No channels found\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
            }
            const list = results.slice(0, 6).map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title || r.username || r}*\n║      🔗 ${r.url || r.link || 'N/A'}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, { text: `╔═|〔  ✈️ TELEGRAM SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  ✈️ TELEGRAM SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕` }, { quoted: msg });
        }
    }
};

module.exports = [imgCmd, scsCmd, tiktrendCmd, tikuserCmd, wagroupCmd, tgstickerCmd, stickersearchCmd, tgsearchCmd];
