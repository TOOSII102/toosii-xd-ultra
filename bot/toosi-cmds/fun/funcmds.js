const { keithGet, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

// ── Helpers ────────────────────────────────────────────────────────────────

function box(title, icon, lines) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n` + lines.filter(Boolean).join('\n') + `\n║\n╚═|〔 ${name} 〕`;
}

function err(title, icon, reason) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${reason}\n║\n╚═|〔 ${name} 〕`;
}

// Decode HTML entities (&amp; → &, etc.)
function decode(s) {
    return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

// ── Simple text commands (truth, dare, wyr, paranoia, pickupline, fact, nhie) ──

function makeTextCmd({ name, aliases, path, title, icon, label, description }) {
    return {
        name,
        aliases,
        description: description || `Get a random ${label || name}`,
        category: 'fun',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            try {
                await sock.sendMessage(chatId, { react: { text: icon, key: msg.key } });
                const data = await keithGet(path);
                if (!data.status) throw new Error(data.error || 'No data');
                const text = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
                await sock.sendMessage(chatId, {
                    text: box(title, icon, [`║ ${text}`])
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: err(title, icon, e.message) }, { quoted: msg });
            }
        }
    };
}

const truthCmd = makeTextCmd({
    name: 'truth', aliases: ['truthquestion', 'truthordare', 'asktruth'],
    path: '/fun/truth', title: 'TRUTH', icon: '🙊',
});

const dareCmd = makeTextCmd({
    name: 'dare', aliases: ['darechallenge', 'doit', 'dareq'],
    path: '/fun/dare', title: 'DARE', icon: '🔥',
});

const wyrCmd = makeTextCmd({
    name: 'wyr', aliases: ['wouldyourather', 'rathergame', 'rather'],
    path: '/fun/would-you-rather', title: 'WOULD YOU RATHER', icon: '🤔',
});

const paranoiaCmd = makeTextCmd({
    name: 'paranoia', aliases: ['paranoiagame', 'paraq'],
    path: '/fun/paranoia', title: 'PARANOIA', icon: '👀',
});

const pickuplineCmd = makeTextCmd({
    name: 'pickupline', aliases: ['pickup', 'flirt', 'rizz', 'line'],
    path: '/fun/pickuplines', title: 'PICKUP LINE', icon: '😏',
});

const factCmd = makeTextCmd({
    name: 'fact', aliases: ['randomfact', 'funfact', 'didyouknow'],
    path: '/fun/fact', title: 'FUN FACT', icon: '💡',
});

const nhieCmd = makeTextCmd({
    name: 'nhie', aliases: ['neverhaviever', 'neverihave', 'neverhave'],
    path: '/fun/never-have-i-ever', title: 'NEVER HAVE I EVER', icon: '🤫',
});

// ── Joke ────────────────────────────────────────────────────────────────────

const jokeCmd = {
    name: 'joke',
    aliases: ['jokes', 'funny', 'laugh', 'lol'],
    description: 'Get a random joke with setup and punchline',
    category: 'fun',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '😂', key: msg.key } });
            const data = await keithGet('/fun/jokes');
            if (!data.status || !data.result) throw new Error(data.error || 'No joke');
            const j = data.result;
            const setup    = typeof j === 'string' ? j : (j.setup || j.joke || '');
            const punchline = j.punchline || j.delivery || '';
            await sock.sendMessage(chatId, {
                text: box('JOKE', '😂', [
                    `║ 📣 ${setup}`,
                    punchline ? `║\n║ 😂 ${punchline}` : null,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('JOKE', '😂', e.message) }, { quoted: msg });
        }
    }
};

// ── Meme ────────────────────────────────────────────────────────────────────

const memeCmd = {
    name: 'meme',
    aliases: ['randommeme', 'reditmeme', 'getmeme'],
    description: 'Get a random Reddit meme image',
    category: 'fun',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '😹', key: msg.key } });
            const data = await keithGet('/fun/meme');
            if (!data.status || !data.url) throw new Error(data.error || 'No meme available');
            const m = data;
            if (m.nsfw) throw new Error('NSFW meme — skipped');

            const caption =
                `╔═|〔  😹 MEME 〕\n║\n` +
                `║ ▸ *${m.title}*\n` +
                `║ ▸ r/${m.subreddit} · 👍 ${(m.ups || 0).toLocaleString()} · u/${m.author}\n` +
                `║ ▸ 🔗 ${m.postLink}\n║\n╚═|〔 ${name} 〕`;

            const buf = await dlBuffer(m.url);
            const ext = m.url.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
            const mime = ext === 'gif' ? 'image/gif' : ext === 'png' ? 'image/png' : 'image/jpeg';

            if (ext === 'gif') {
                await sock.sendMessage(chatId, {
                    video: buf, gifPlayback: true, caption
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, {
                    image: buf, caption
                }, { quoted: msg });
            }
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('MEME', '😹', e.message) }, { quoted: msg });
        }
    }
};

// ── Quiz (Trivia) ────────────────────────────────────────────────────────────

const quizCmd = {
    name: 'quiz',
    aliases: ['trivia', 'question', 'triviaquest', 'q'],
    description: 'Get a random trivia question with multiple choice answers',
    category: 'fun',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '🧠', key: msg.key } });
            const data = await keithGet('/fun/question');
            if (!data.status || !data.result) throw new Error(data.error || 'No question');
            const q = data.result;

            const question = decode(q.question || q.quest || '');
            const correct  = decode(q.correctAnswer || q.correct_answer || '');
            const allAns   = (q.allAnswers || q.all_answers || [correct]).map(decode);
            const incorrect = (q.incorrectAnswers || q.incorrect_answers || []).map(decode);

            // Shuffle answers (they may already be shuffled)
            const labels = ['A', 'B', 'C', 'D'];
            const choiceLines = allAns.slice(0, 4).map((a, i) =>
                `║   *${labels[i]}.*  ${a}${a === correct ? '  ✅' : ''}`
            );

            await sock.sendMessage(chatId, {
                text: box('TRIVIA QUIZ', '🧠', [
                    `║ 📚 *Category*   : ${q.category || 'General'}`,
                    `║ 🎯 *Difficulty* : ${q.difficulty || 'N/A'}`,
                    `║ 🔤 *Type*       : ${q.type || 'multiple'}`,
                    `║`,
                    `║ ❓ *${question}*`,
                    `║`,
                    ...choiceLines,
                    `║`,
                    `║ 💡 _Answer marked ✅ above_`,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('TRIVIA QUIZ', '🧠', e.message) }, { quoted: msg });
        }
    }
};

// ── Quote ────────────────────────────────────────────────────────────────────

const quoteCmd = {
    name: 'quote',
    aliases: ['randomquote', 'inspire', 'motivation', 'qod'],
    description: 'Get a random inspirational quote',
    category: 'fun',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } });
            const data = await keithGet('/fun/quote');
            if (!data.status || !data.result) throw new Error(data.error || 'No quote');
            const { quote, author } = data.result;
            await sock.sendMessage(chatId, {
                text: box('QUOTE', '✨', [
                    `║ 💬 _"${quote}"_`,
                    `║`,
                    `║ — *${author || 'Unknown'}*`,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('QUOTE', '✨', e.message) }, { quoted: msg });
        }
    }
};

// ── Quote Audio ──────────────────────────────────────────────────────────────

const quoteAudioCmd = {
    name: 'quoteaudio',
    aliases: ['audioquote', 'inspiraudio', 'qaudiovision'],
    description: 'Get an inspirational quote as an audio clip',
    category: 'fun',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } });
            const data = await keithGet('/quote/audio');
            if (!data.status || !data.result?.mp3) throw new Error(data.error || 'No audio available');
            const { mp3, data: scenes } = data.result;

            // Extract the quote text from scenes
            const quoteLine = (scenes || []).find(s => s.type === 'quote' && s.text);
            const quoteText = quoteLine?.text || '';

            const buf = await dlBuffer(mp3);
            const caption =
                `╔═|〔  🎵 QUOTE AUDIO 〕\n║\n` +
                (quoteText ? `║ 💬 _"${quoteText}"_\n║\n` : '') +
                `╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, {
                audio: buf,
                mimetype: 'audio/mpeg',
                ptt: false,
            }, { quoted: msg });

            // Send text caption separately so it's readable
            if (quoteText) {
                await sock.sendMessage(chatId, {
                    text: caption
                }, { quoted: msg });
            }
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('QUOTE AUDIO', '🎵', e.message) }, { quoted: msg });
        }
    }
};

module.exports = [
    truthCmd, dareCmd, wyrCmd, paranoiaCmd, pickuplineCmd,
    factCmd, nhieCmd, jokeCmd, memeCmd,
    quizCmd, quoteCmd, quoteAudioCmd,
];
