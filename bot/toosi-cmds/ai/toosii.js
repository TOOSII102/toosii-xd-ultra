'use strict';

const { getBotName } = require('../../lib/botname');

async function pollinationsAI(prompt, model = 'openai', timeoutMs = 30000) {
    const encoded = encodeURIComponent(prompt);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`https://text.pollinations.ai/${encoded}?model=${model}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'ToosiiBot/1.0', Accept: 'text/plain,*/*' }
        });
        if (!res.ok) throw new Error(`AI service returned HTTP ${res.status}`);
        const text = await res.text();
        if (!text?.trim()) throw new Error('No response from AI');
        return text.trim();
    } finally { clearTimeout(timer); }
}

module.exports = {
    name: 'ai',
    aliases: ['toosii', 'toosiiAi', 'toosiiai', 'ask'],
    description: 'Chat with Toosii AI — built from scratch',
    category: 'ai',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const prompt = args.join(' ').trim();

        if (!prompt) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  🤖 TOOSII AI 〕\n║\n║ ▸ *Usage*   : ${prefix}ai <your question>\n║ ▸ *Example* : ${prefix}ai what is the meaning of life?\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '🤖', key: msg.key } });
            const reply = await pollinationsAI(prompt, 'openai');
            const fmtReply = reply.split('\n').map(l => `║ ${l}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🤖 TOOSII AI 〕\n║\n${fmtReply}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🤖 TOOSII AI 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
