'use strict';

const { getBotName } = require('../../lib/botname');
const { dlBuffer }   = require('../../lib/keithapi');

const BASE = 'https://apis.xcasper.space/api/ephoto-360/generate';

// ── Curated effects by category ───────────────────────────────────────────────
const EFFECTS = {
    neon: [
        { id: 68,  name: 'Neon Text' },
        { id: 69,  name: 'Colorful Glow' },
        { id: 78,  name: 'Neon Online' },
        { id: 117, name: 'Blue Neon' },
        { id: 171, name: 'Neon Classic' },
        { id: 200, name: 'Neon Light' },
        { id: 395, name: 'Green Neon' },
        { id: 429, name: 'Green Neon Logo' },
        { id: 507, name: 'Blue Neon Logo' },
        { id: 521, name: 'Galaxy Neon' },
        { id: 538, name: 'Retro Neon' },
        { id: 591, name: 'Multicolor Neon' },
        { id: 677, name: 'Hacker Cyan Neon' },
        { id: 683, name: 'Devil Wings Neon' },
        { id: 706, name: 'Glowing Text' },
        { id: 710, name: 'Blackpink Neon' },
        { id: 768, name: 'Neon Glitch' },
        { id: 797, name: 'Colorful Neon Light' },
    ],
    '3d': [
        { id: 59,  name: 'Wooden 3D' },
        { id: 88,  name: '3D Cubic' },
        { id: 104, name: '3D Wood' },
        { id: 126, name: 'Water 3D' },
        { id: 143, name: 'Zombie 3D' },
        { id: 172, name: '3D Classic' },
        { id: 208, name: 'Graffiti 3D' },
        { id: 273, name: '3D Silver' },
        { id: 274, name: '3D Style' },
        { id: 277, name: 'Metal 3D' },
        { id: 281, name: 'Ruby Stone 3D' },
        { id: 373, name: 'Birthday 3D' },
        { id: 374, name: 'Metal Logo 3D' },
        { id: 427, name: 'Avengers 3D' },
        { id: 441, name: 'Hologram 3D' },
        { id: 476, name: 'Gradient Logo 3D' },
        { id: 508, name: 'Stone 3D' },
        { id: 559, name: 'Space 3D' },
        { id: 580, name: 'Sand 3D' },
        { id: 600, name: 'Gradient 3D' },
        { id: 608, name: 'Vintage Bulb 3D' },
        { id: 621, name: 'Snow 3D' },
        { id: 658, name: 'Paper Cut 3D' },
        { id: 682, name: 'Underwater 3D' },
        { id: 685, name: 'Metallic Shiny 3D' },
        { id: 686, name: 'Gradient 3D v2' },
        { id: 688, name: 'Beach 3D' },
        { id: 704, name: 'Crack 3D' },
        { id: 705, name: 'Wood 3D v2' },
        { id: 725, name: 'USA Flag 3D' },
        { id: 727, name: 'Christmas Sparkle 3D' },
        { id: 793, name: 'Christmas Snow 3D' },
        { id: 794, name: 'Gold Glitter 3D' },
        { id: 798, name: 'Decorative Metal 3D' },
        { id: 801, name: 'Paint 3D' },
        { id: 802, name: 'Glossy Silver 3D' },
        { id: 803, name: 'Foil Balloon 3D' },
        { id: 817, name: 'Comic 3D' },
    ],
    gaming: [
        { id: 218, name: 'League of Legends' },
        { id: 221, name: 'Overwatch Cover' },
        { id: 231, name: 'LOL Pentakill' },
        { id: 233, name: 'CS:GO' },
        { id: 242, name: 'LOL Avatar' },
        { id: 292, name: 'Overwatch Logo' },
        { id: 293, name: 'Overwatch Avatar' },
        { id: 313, name: 'Galaxy Class' },
        { id: 320, name: 'Polygon Logo' },
        { id: 361, name: 'Icon Logo' },
        { id: 364, name: 'Mascot Logo' },
        { id: 366, name: 'Wolf Galaxy' },
        { id: 384, name: 'Project Yasuo' },
        { id: 401, name: 'PUBG Cover' },
        { id: 402, name: 'PUBG Banner' },
    ],
    metal: [
        { id: 108, name: 'Metal Logo' },
        { id: 156, name: '3D Wooden Logo' },
        { id: 397, name: 'Cute Pig 3D' },
        { id: 685, name: 'Metallic Shiny' },
        { id: 798, name: 'Decorative Metal' },
        { id: 802, name: 'Glossy Silver' },
    ],
};

const ALL_EFFECTS = Object.values(EFFECTS).flat();

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randEffect(category) {
    if (category && EFFECTS[category]) return randFrom(EFFECTS[category]);
    return randFrom(ALL_EFFECTS);
}

// ── API call ──────────────────────────────────────────────────────────────────
async function generateEphoto(effectId, text, timeoutMs = 30000) {
    const url = `${BASE}?effectId=${effectId}&text=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'ToosiiBot/1.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!j.success) throw new Error(j.message || 'Generation failed');
        return j; // { effect, imageUrl, downloadUrl, ... }
    } finally { clearTimeout(timer); }
}

// ── Command ───────────────────────────────────────────────────────────────────
module.exports = {
    name: 'ephoto',
    aliases: ['texteffect', 'textart', 'ep', 'etext', 'fancytext', 'effect360'],
    description: 'Generate stylish text effect images — .ephoto <text> [| category | effectId]',
    category: 'image',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        const H   = `╔═|〔  🎨 EPHOTO 〕`;
        const F   = `╚═|〔 ${name} 〕`;
        const SEP = '║';

        // ── list ──────────────────────────────────────────────────────────────
        if (!args.length || args[0].toLowerCase() === 'list') {
            const cats = Object.entries(EFFECTS).map(([cat, efx]) =>
                `${SEP} ▸ *${cat}* — ${efx.length} effects`
            ).join('\n');
            return sock.sendMessage(chatId, {
                text: [
                    H, SEP,
                    `${SEP} ▸ *Usage* : ${prefix}ephoto <your text>`,
                    `${SEP} ▸ *Category* : add | <category> for themed effects`,
                    `${SEP} ▸ *Specific* : add | <effectId> for a specific effect`,
                    SEP,
                    `${SEP} 📋 *Categories:*`,
                    cats,
                    SEP,
                    `${SEP} 📌 *Examples:*`,
                    `${SEP}  ${prefix}ephoto Toosii`,
                    `${SEP}  ${prefix}ephoto Toosii | neon`,
                    `${SEP}  ${prefix}ephoto Toosii | 3d`,
                    `${SEP}  ${prefix}ephoto Toosii | gaming`,
                    `${SEP}  ${prefix}ephoto Toosii | 68`,
                    SEP, F,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── parse args — split on | ────────────────────────────────────────────
        const raw   = args.join(' ');
        const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
        const text  = parts[0];
        const mod   = (parts[1] || '').toLowerCase().trim();

        if (!text) {
            return sock.sendMessage(chatId, {
                text: `${H}\n${SEP}\n${SEP} ▸ *Usage* : ${prefix}ephoto <your text>\n${SEP} ▸ *Help*  : ${prefix}ephoto list\n${SEP}\n${F}`
            }, { quoted: msg });
        }

        // Resolve effect
        let effect;
        if (mod && !isNaN(mod)) {
            // Specific effectId
            effect = { id: parseInt(mod), name: `Effect #${mod}` };
        } else if (mod && EFFECTS[mod]) {
            // Category
            effect = randFrom(EFFECTS[mod]);
        } else if (mod) {
            // Unknown modifier — still try as effectId fallback
            effect = { id: parseInt(mod) || 68, name: `Effect #${mod}` };
        } else {
            // Random from all
            effect = randFrom(ALL_EFFECTS);
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '🎨', key: msg.key } });

            const data = await generateEphoto(effect.id, text);

            // Download the image
            const buf  = await dlBuffer(data.imageUrl || data.downloadUrl);
            const caption = [
                H, SEP,
                `${SEP} ▸ *Text*   : ${text.length > 50 ? text.substring(0, 50) + '...' : text}`,
                `${SEP} ▸ *Effect* : ${data.effect || effect.name}`,
                `${SEP} ▸ *ID*     : ${effect.id}`,
                SEP, F,
            ].join('\n');

            await sock.sendMessage(chatId, {
                image: buf,
                caption,
                mimetype: 'image/jpeg',
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `${H}\n${SEP}\n${SEP} ▸ *Status* : ❌ Failed\n${SEP} ▸ *Reason* : ${e.message}\n${SEP} ▸ 💡 Try a different effect or shorter text\n${SEP}\n${F}`
            }, { quoted: msg });
        }
    }
};
