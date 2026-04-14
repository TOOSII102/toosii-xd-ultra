'use strict';

const { getBotName } = require('../../lib/botname');

const TYPES = {
    trivia: 'trivia', math: 'math', date: 'date', year: 'year',
    random: 'random',
};

async function getNumberFact(number, type = 'trivia') {
    const n   = number === 'random' ? 'random' : encodeURIComponent(number);
    const url = `http://numbersapi.com/${n}/${type}?json=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.text) throw new Error('No fact returned');
    return data;
}

module.exports = {
    name: 'numfact',
    aliases: ['numberfact', 'numtrivia', 'mathfact', 'numberinfo', 'nfact'],
    description: 'Get an interesting fact about any number — .numfact <number> [type]',
    category: 'utility',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🔢', key: msg.key } }); } catch {}

        const raw  = args[0] || 'random';
        const type = TYPES[(args[1] || '').toLowerCase()] || 'trivia';

        const isNum = raw === 'random' || /^-?\d+(\.\d+)?$/.test(raw);
        if (!isNum) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  NUMBER FACT 🔢 〕`,
                    `║`,
                    `║ ▸ *Usage*   : ${prefix}numfact <number> [type]`,
                    `║ ▸ *Types*   : trivia | math | year | date`,
                    `║ ▸ *Example* : ${prefix}numfact 42`,
                    `║ ▸ *Example* : ${prefix}numfact 1969 year`,
                    `║ ▸ *Example* : ${prefix}numfact random math`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        try {
            const data = await getNumberFact(raw, type);

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  NUMBER FACT 🔢 〕`,
                    `║`,
                    `║ ▸ *Number* : ${data.number}`,
                    `║ ▸ *Type*   : ${type[0].toUpperCase() + type.slice(1)}`,
                    `║`,
                    `║ ${data.text}`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  NUMBER FACT 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
