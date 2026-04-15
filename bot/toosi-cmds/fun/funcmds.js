'use strict';

const { dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

function box(title, icon, lines) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n` + lines.filter(Boolean).join('\n') + `\n║\n╚═╝`;
}

function err(title, icon, reason) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${reason}\n║\n╚═╝`;
}

function decode(s) {
    return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

async function todGet(endpoint) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const res = await fetch(`https://api.truthordarebot.xyz/v1/${endpoint}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        return j?.translations?.en || j?.question || '';
    } finally { clearTimeout(timer); }
}

// ── Simple text commands via TruthOrDare API ──────────────────────────────────

function makeTodCmd({ name, aliases, endpoint, title, icon }) {
    return {
        name, aliases,
        description: `Get a random ${title.toLowerCase()}`,
        category: 'fun',
        async execute(sock, msg) {
            const chatId = msg.key.remoteJid;
            try {
                await sock.sendMessage(chatId, { react: { text: icon, key: msg.key } });
                const text = await todGet(endpoint);
                if (!text) throw new Error('No data');
                await sock.sendMessage(chatId, { text: box(title, icon, [`║ ${text}`]) }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: err(title, icon, e.message) }, { quoted: msg });
            }
        }
    };
}

const truthCmd    = makeTodCmd({ name: 'truth',       aliases: ['truthquestion', 'truthordare', 'asktruth'],  endpoint: 'truth',    title: 'TRUTH',              icon: '🙊' });
const dareCmd     = makeTodCmd({ name: 'dare',        aliases: ['darechallenge', 'doit', 'dareq'],            endpoint: 'dare',     title: 'DARE',               icon: '🔥' });
const wyrCmd      = makeTodCmd({ name: 'wyr',         aliases: ['wouldyourather', 'rathergame', 'rather'],    endpoint: 'wyr',      title: 'WOULD YOU RATHER',   icon: '🤔' });
const paranoiaCmd = makeTodCmd({ name: 'paranoia',    aliases: ['paranoiagame', 'paraq'],                     endpoint: 'paranoia', title: 'PARANOIA',           icon: '👀' });
const nhieCmd     = makeTodCmd({ name: 'nhie',        aliases: ['neverhaviever', 'neverihave', 'neverhave'],  endpoint: 'nhie',     title: 'NEVER HAVE I EVER',  icon: '🤫' });

// ── Pickup Line (Rizz API) ────────────────────────────────────────────────────

const pickuplineCmd = {
    name: 'pickupline', aliases: ['pickup', 'flirt', 'rizz', 'line'],
    description: 'Get a random pickup line',
    category: 'fun',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '😏', key: msg.key } });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const res = await fetch('https://rizzapi.vercel.app/random', { signal: controller.signal });
            clearTimeout(timer);
            const j = await res.json();
            const line = j?.text || j?.line;
            if (!line) throw new Error('No pickup line');
            await sock.sendMessage(chatId, { text: box('PICKUP LINE', '😏', [`║ 😉 ${line}`]) }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('PICKUP LINE', '😏', e.message) }, { quoted: msg });
        }
    }
};

// ── Fact (UselessFacts) ───────────────────────────────────────────────────────

const factCmd = {
    name: 'fact', aliases: ['randomfact', 'funfact', 'didyouknow'],
    description: 'Get a random fun fact',
    category: 'fun',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '💡', key: msg.key } });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en', { signal: controller.signal });
            clearTimeout(timer);
            const j = await res.json();
            if (!j?.text) throw new Error('No fact');
            await sock.sendMessage(chatId, { text: box('FUN FACT', '💡', [`║ 💡 ${j.text}`]) }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('FUN FACT', '💡', e.message) }, { quoted: msg });
        }
    }
};

// ── Joke (JokeAPI) ───────────────────────────────────────────────────────────

const jokeCmd = {
    name: 'joke', aliases: ['jokes', 'funny', 'laugh', 'lol'],
    description: 'Get a random joke',
    category: 'fun',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '😂', key: msg.key } });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const res = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist', { signal: controller.signal });
            clearTimeout(timer);
            const j = await res.json();
            if (j.error) throw new Error('No joke available');
            const lines = j.type === 'twopart'
                ? [`║ 📣 ${decode(j.setup)}`, `║`, `║ 😂 ${decode(j.delivery)}`]
                : [`║ 😂 ${decode(j.joke)}`];
            await sock.sendMessage(chatId, { text: box('JOKE', '😂', lines) }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('JOKE', '😂', e.message) }, { quoted: msg });
        }
    }
};

// ── Meme (Meme-API / Reddit) ──────────────────────────────────────────────────

const memeCmd = {
    name: 'meme', aliases: ['randommeme', 'reditmeme', 'getmeme'],
    description: 'Get a random Reddit meme',
    category: 'fun',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        const name = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '😹', key: msg.key } });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);
            const res = await fetch('https://meme-api.com/gimme', { signal: controller.signal });
            clearTimeout(timer);
            const m = await res.json();
            if (!m?.url) throw new Error('No meme');
            if (m.nsfw) throw new Error('NSFW meme — skipped');

            const caption =
                `╔═|〔  😹 MEME 〕\n║\n` +
                `║ ▸ *${m.title}*\n` +
                `║ ▸ r/${m.subreddit} · 👍 ${(m.ups || 0).toLocaleString()} · u/${m.author}\n` +
                `║ ▸ 🔗 ${m.postLink}\n║\n╚═╝`;

            const buf = await dlBuffer(m.url);
            const ext = m.url.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
            const mime = ext === 'gif' ? 'image/gif' : ext === 'png' ? 'image/png' : 'image/jpeg';

            if (ext === 'gif') {
                await sock.sendMessage(chatId, { video: buf, gifPlayback: true, caption }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { image: buf, caption }, { quoted: msg });
            }
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('MEME', '😹', e.message) }, { quoted: msg });
        }
    }
};

// ── Quiz / Trivia (OpenTDB) ───────────────────────────────────────────────────

const quizCmd = {
    name: 'quiz', aliases: ['trivia', 'question', 'triviaquest', 'q'],
    description: 'Get a random trivia question',
    category: 'fun',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '🧠', key: msg.key } });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const res = await fetch('https://opentdb.com/api.php?amount=1', { signal: controller.signal });
            clearTimeout(timer);
            const j = await res.json();
            if (j.response_code !== 0 || !j.results?.length) throw new Error('No question available');
            const q = j.results[0];

            const question  = decode(q.question);
            const correct   = decode(q.correct_answer);
            const incorrect = q.incorrect_answers.map(decode);
            const all       = [...incorrect, correct].sort(() => Math.random() - 0.5);
            const labels    = ['A', 'B', 'C', 'D'];
            const choices   = all.slice(0, 4).map((a, i) =>
                `║   *${labels[i]}.*  ${a}${a === correct ? '  ✅' : ''}`
            );

            await sock.sendMessage(chatId, {
                text: box('TRIVIA QUIZ', '🧠', [
                    `║ 📚 *Category*   : ${decode(q.category)}`,
                    `║ 🎯 *Difficulty* : ${q.difficulty}`,
                    `║`,
                    `║ ❓ *${question}*`,
                    `║`,
                    ...choices,
                    `║`,
                    `║ 💡 _Answer marked ✅ above_`,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('TRIVIA QUIZ', '🧠', e.message) }, { quoted: msg });
        }
    }
};

// ── Quote (ZenQuotes) ─────────────────────────────────────────────────────────

const quoteCmd = {
    name: 'zenquote', aliases: ['randomquote', 'zenq', 'qod'],
    description: 'Get a random inspirational quote',
    category: 'fun',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const res = await fetch('https://zenquotes.io/api/random', { signal: controller.signal });
            clearTimeout(timer);
            const [item] = await res.json();
            if (!item?.q) throw new Error('No quote');
            await sock.sendMessage(chatId, {
                text: box('QUOTE', '✨', [
                    `║ 💬 _"${item.q}"_`,
                    `║`,
                    `║ — *${item.a || 'Unknown'}*`,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('QUOTE', '✨', e.message) }, { quoted: msg });
        }
    }
};

// ── Roast (local) ─────────────────────────────────────────────────────────────

const ROASTS = [
    "You're the human equivalent of a participation trophy — nobody asked for you, you serve no real purpose, and yet here you are, taking up space on the shelf.",
    "I'd roast you, but my mama said I'm not allowed to burn trash.",
    "You have the energy of a phone at 2% battery — barely alive, constantly complaining, and nobody wants to deal with you right now.",
    "You're proof that God has a sense of humor. He looked at the blueprint for a human being and said 'let's see what happens if we remove the charming parts.'",
    "Scientists say the universe is made up of protons, neutrons, and electrons. They forgot morons. You're filling that gap admirably.",
    "Your WiFi password is probably something like 'iamthebest' because you need to remind yourself of things nobody else believes.",
    "I've seen better-looking things crawl out of a gym bag at the end of the week — and those at least served a purpose.",
    "You're like a software update notification. Everyone ignores you, and when they finally pay attention, they regret it immediately.",
    "Calling you an idiot would be an insult to idiots. At least they have the decency to not know better. You choose this.",
    "You're the type of person who brings a fork to a soup kitchen and then complains the soup isn't finger food.",
    "If brains were petrol, you wouldn't have enough to power a toy car around the inside of a Cheerio.",
    "Your birth certificate should come with a refund policy.",
    "You're like a broken pencil: completely pointless, and people only pick you up when there's absolutely nothing else available.",
    "The last time someone was happy to see you, they were mixing you up with someone else.",
    "You speak like someone translated your thoughts from a dead language using a dictionary written by someone who had never spoken to a human.",
    "Your confidence is truly inspiring. It takes a special kind of person to be that wrong about themselves for that long.",
    "I heard your IQ test came back negative. The machine crashed, couldn't calculate results that low.",
    "You're like a cloud — when you disappear, it's a beautiful day.",
    "If personality was currency, you'd be broke AND in debt AND somehow still asking to borrow money.",
    "You're the type of person who googles their own name and is genuinely surprised there's no results.",
    "You bring nothing to the table. Literally. I've seen you at buffets. You don't even bring yourself a plate.",
    "If common sense was a superpower, you'd be the least threatening villain in the Marvel universe.",
    "You have the social awareness of a parking cone — fixed in one spot, impossible to reason with, and everyone just drives around you.",
    "Your vibe is like a wet sock — nobody wants it near them, and when they're stuck with it, it ruins their entire day.",
    "You're the human embodiment of laggy internet — constantly buffering, never delivering, and everyone's already closed the tab.",
    "I'd challenge you to a battle of wits, but I don't like fighting unarmed opponents.",
    "You're like a Monday morning — unwanted, exhausting, and way too loud about it.",
    "If overthinking was a skill, you'd be a genius. Unfortunately, results are what matter.",
    "You're the reason group chats have a mute button.",
    "Your greatest skill is starting things you never finish, which is ironic because even that sentence describes you perfectly.",
    "You have the kind of energy that makes plants lean away from you.",
    "Your advice is so useless, people thank you and then immediately do the opposite and somehow end up fine.",
    "You're so basic even your WiFi router gets bored of you and disconnects on purpose.",
    "You call yourself a vibe but you're more of a mild inconvenience on a Tuesday afternoon.",
    "You're the reason people pretend to be on their phone when they see you approaching from across the street.",
    "Scientists discovered a new element. They're calling it Roastium. It's unstable, dense, and embarrassingly bad under pressure. They named it after you.",
    "You're like expired milk — the moment people get close enough, they immediately know something is wrong.",
    "Your most productive moment today was probably picking which side of the bed to get up from — and you still managed to get that wrong.",
    "You walk into a room and the vibe doesn't shift — it gasps, buckles, and files for early retirement.",
];

const roastCmd = {
    name: 'roast', aliases: ['flame', 'diss', 'burnit', 'draghim', 'savage'],
    description: 'Get roasted hard',
    category: 'fun',
    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🔥', key: msg.key } }); } catch {}
        const pick   = ROASTS[Math.floor(Math.random() * ROASTS.length)];
        const header = `╔═|〔  🔥 ROAST 〕\n║\n`;
        await sock.sendMessage(chatId, {
            text: `${header}║ ${pick}\n║\n╚═╝`
        }, { quoted: msg });
    }
};

module.exports = [
    truthCmd, dareCmd, wyrCmd, paranoiaCmd, nhieCmd,
    pickuplineCmd, factCmd, jokeCmd, memeCmd, quizCmd, quoteCmd, roastCmd,
];
