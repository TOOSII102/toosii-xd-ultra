'use strict';

const { getBotName } = require('../../lib/botname');

// Common city → IANA timezone mapping (covers most popular requests)
const CITIES = {
    // Africa
    nairobi: 'Africa/Nairobi', lagos: 'Africa/Lagos', cairo: 'Africa/Cairo',
    accra: 'Africa/Accra', johannesburg: 'Africa/Johannesburg', jburg: 'Africa/Johannesburg',
    joburg: 'Africa/Johannesburg', addis: 'Africa/Addis_Ababa', ababa: 'Africa/Addis_Ababa',
    kampala: 'Africa/Kampala', dar: 'Africa/Dar_es_Salaam', mombasa: 'Africa/Nairobi',
    kigali: 'Africa/Kigali', lusaka: 'Africa/Lusaka', harare: 'Africa/Harare',
    casablanca: 'Africa/Casablanca', tunis: 'Africa/Tunis', algiers: 'Africa/Algiers',
    dakar: 'Africa/Dakar', abidjan: 'Africa/Abidjan', accra: 'Africa/Accra',
    // Americas
    newyork: 'America/New_York', nyc: 'America/New_York', new_york: 'America/New_York',
    losangeles: 'America/Los_Angeles', la: 'America/Los_Angeles', lax: 'America/Los_Angeles',
    chicago: 'America/Chicago', houston: 'America/Chicago', denver: 'America/Denver',
    toronto: 'America/Toronto', vancouver: 'America/Vancouver', montreal: 'America/Montreal',
    mexico: 'America/Mexico_City', saopaulo: 'America/Sao_Paulo', sp: 'America/Sao_Paulo',
    buenosaires: 'America/Argentina/Buenos_Aires', ba: 'America/Argentina/Buenos_Aires',
    lima: 'America/Lima', bogota: 'America/Bogota', santiago: 'America/Santiago',
    miami: 'America/New_York', boston: 'America/New_York', atlanta: 'America/New_York',
    // Europe
    london: 'Europe/London', paris: 'Europe/Paris', berlin: 'Europe/Berlin',
    madrid: 'Europe/Madrid', rome: 'Europe/Rome', amsterdam: 'Europe/Amsterdam',
    moscow: 'Europe/Moscow', istanbul: 'Europe/Istanbul', athens: 'Europe/Athens',
    stockholm: 'Europe/Stockholm', oslo: 'Europe/Oslo', helsinki: 'Europe/Helsinki',
    warsaw: 'Europe/Warsaw', prague: 'Europe/Prague', budapest: 'Europe/Budapest',
    vienna: 'Europe/Vienna', zurich: 'Europe/Zurich', lisbon: 'Europe/Lisbon',
    // Asia
    dubai: 'Asia/Dubai', abudhabi: 'Asia/Dubai', riyadh: 'Asia/Riyadh',
    mumbai: 'Asia/Kolkata', delhi: 'Asia/Kolkata', india: 'Asia/Kolkata',
    kolkata: 'Asia/Kolkata', bangalore: 'Asia/Kolkata', hyderabad: 'Asia/Kolkata',
    beijing: 'Asia/Shanghai', shanghai: 'Asia/Shanghai', china: 'Asia/Shanghai',
    tokyo: 'Asia/Tokyo', japan: 'Asia/Tokyo', osaka: 'Asia/Tokyo',
    seoul: 'Asia/Seoul', korea: 'Asia/Seoul', singapore: 'Asia/Singapore',
    jakarta: 'Asia/Jakarta', bangkok: 'Asia/Bangkok', kualalumpur: 'Asia/Kuala_Lumpur',
    kl: 'Asia/Kuala_Lumpur', manila: 'Asia/Manila', hongkong: 'Asia/Hong_Kong',
    hk: 'Asia/Hong_Kong', taipei: 'Asia/Taipei', tehran: 'Asia/Tehran',
    karachi: 'Asia/Karachi', lahore: 'Asia/Karachi', dhaka: 'Asia/Dhaka',
    kathmandu: 'Asia/Kathmandu', colombo: 'Asia/Colombo', tashkent: 'Asia/Tashkent',
    // Oceania
    sydney: 'Australia/Sydney', melbourne: 'Australia/Melbourne', brisbane: 'Australia/Brisbane',
    perth: 'Australia/Perth', auckland: 'Australia/Auckland', nz: 'Pacific/Auckland',
    // UTC / popular zones
    utc: 'UTC', gmt: 'UTC', est: 'America/New_York', pst: 'America/Los_Angeles',
    ist: 'Asia/Kolkata', eat: 'Africa/Nairobi', wat: 'Africa/Lagos',
    cat: 'Africa/Harare', cet: 'Europe/Paris', eest: 'Europe/Helsinki',
    jst: 'Asia/Tokyo', cst: 'Asia/Shanghai', sgt: 'Asia/Singapore',
    aest: 'Australia/Sydney', msk: 'Europe/Moscow',
};

function fmtTime(tz) {
    try {
        const now = new Date();
        const opts = { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        const time = now.toLocaleTimeString('en-US', opts);
        const date = now.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        return { time, date };
    } catch { return null; }
}

const WORLD_ZONES = [
    { city: 'Nairobi 🇰🇪',     tz: 'Africa/Nairobi' },
    { city: 'Lagos 🇳🇬',       tz: 'Africa/Lagos' },
    { city: 'London 🇬🇧',      tz: 'Europe/London' },
    { city: 'Dubai 🇦🇪',       tz: 'Asia/Dubai' },
    { city: 'India 🇮🇳',       tz: 'Asia/Kolkata' },
    { city: 'Singapore 🇸🇬',   tz: 'Asia/Singapore' },
    { city: 'Tokyo 🇯🇵',       tz: 'Asia/Tokyo' },
    { city: 'New York 🇺🇸',    tz: 'America/New_York' },
    { city: 'Los Angeles 🇺🇸', tz: 'America/Los_Angeles' },
    { city: 'Sydney 🇦🇺',      tz: 'Australia/Sydney' },
];

module.exports = [
    {
        name: 'time',
        aliases: ['worldtime', 'timezone', 'clock', 'whatsthetime', 'timein'],
        description: 'Get the current time in any city — .time <city>',
        category: 'utility',

        async execute(sock, msg, args, prefix) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            try { await sock.sendMessage(chatId, { react: { text: '🕐', key: msg.key } }); } catch {}

            const query = args.join('').toLowerCase().replace(/\s+/g, '').trim();

            if (!query) {
                // Show world clock snapshot
                const rows = WORLD_ZONES.map(({ city, tz }) => {
                    const t = fmtTime(tz);
                    return t ? `║ ▸ *${city}* : ${t.time}` : null;
                }).filter(Boolean).join('\n');

                return sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  WORLD CLOCK 🕐 〕`,
                        `║`,
                        rows,
                        `║`,
                        `║ 💡 ${prefix}time <city> for any city`,
                        `║ 💡 ${prefix}time nairobi | london | tokyo`,
                        `║`,
                        `╚═╝`,
                    ].join('\n')
                }, { quoted: msg });
            }

            // Look up timezone
            const tz = CITIES[query] || (() => {
                // Try partial match
                const key = Object.keys(CITIES).find(k => k.includes(query) || query.includes(k));
                return key ? CITIES[key] : null;
            })();

            if (!tz) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  TIME 〕\n║\n║ ▸ ❌ City not found: *${args.join(' ')}*\n║ ▸ Try: nairobi, london, dubai, tokyo, new york\n║\n╚═╝`
                }, { quoted: msg });
            }

            const t = fmtTime(tz);
            if (!t) return sock.sendMessage(chatId, {
                text: `╔═|〔  TIME 〕\n║\n║ ▸ ❌ Could not get time for ${args.join(' ')}\n║\n╚═╝`
            }, { quoted: msg });

            const cityLabel = args.join(' ').replace(/\b\w/g, c => c.toUpperCase());

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  WORLD CLOCK 🕐 〕`,
                    `║`,
                    `║ ▸ *City*     : ${cityLabel}`,
                    `║ ▸ *Timezone* : ${tz}`,
                    `║`,
                    `║ 🕐 *Time*    : ${t.time}`,
                    `║ 📅 *Date*    : ${t.date}`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }
    },

    {
        name: 'worldclock',
        aliases: ['timezones', 'alltimes', 'globaltimes', 'timeworld'],
        description: 'Show current time in major world cities — .worldclock',
        category: 'utility',

        async execute(sock, msg, args, prefix) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();

            const rows = WORLD_ZONES.map(({ city, tz }) => {
                const t = fmtTime(tz);
                return t ? `║ ▸ *${city}* : ${t.time}\n║      📅 ${t.date}` : null;
            }).filter(Boolean).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  WORLD CLOCK 🌍 〕`,
                    `║`,
                    rows,
                    `║`,
                    `║ 💡 ${prefix}time <city> — any city`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }
    }
];
