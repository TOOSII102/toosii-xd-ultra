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

// ── Roast ────────────────────────────────────────────────────────────────────

const ROASTS = [
    "You're the human equivalent of a participation trophy — nobody asked for you, you serve no real purpose, and yet here you are, taking up space on the shelf.",
    "I'd roast you, but my mama said I'm not allowed to burn trash.",
    "You have the energy of a phone at 2% battery — barely alive, constantly complaining, and nobody wants to deal with you right now.",
    "You're proof that God has a sense of humor. He looked at the blueprint for a human being and said 'let's see what happens if we remove the charming parts.'",
    "Scientists say the universe is made up of protons, neutrons, and electrons. They forgot to include morons. You're filling that gap admirably.",
    "Your WiFi password is probably something like 'iamthebest' because you need to remind yourself of things nobody else believes.",
    "I've seen better-looking things crawl out of a gym bag at the end of the week — and those at least served a purpose.",
    "You're like a software update notification. Everyone ignores you, and when they finally pay attention, they regret it immediately.",
    "Calling you an idiot would be an insult to idiots. At least they have the decency to not know better. You choose this.",
    "You're the type of person who brings a fork to a soup kitchen and then complains the soup isn't finger food.",
    "If brains were petrol, you wouldn't have enough to power a toy car around the inside of a Cheerio.",
    "You have a face that could make onions cry — not because it's sad, but because it's that aggressively unpleasant.",
    "Your birth certificate should come with a refund policy.",
    "I would ask how old you are, but I can already count your rings from the outside — the ones under your eyes.",
    "You're like a broken pencil: completely pointless, and people only pick you up when there's absolutely nothing else available.",
    "The last time someone was happy to see you, they were mixing you up with someone else.",
    "You speak like someone translated your thoughts from a dead language using a dictionary written by someone who had never spoken to a human.",
    "You're the reason instructions on shampoo bottles say 'lather, rinse, repeat' — because apparently the obvious needs explaining twice.",
    "Your confidence is truly inspiring. I mean, it takes a special kind of person to be that wrong about themselves for that long.",
    "I heard your IQ test came back negative. The machine crashed, couldn't calculate results that low.",
    "You're like a cloud — when you disappear, it's a beautiful day.",
    "Your life is like a pizza with no cheese, no sauce, no toppings, no base — just a concept that never followed through.",
    "If personality was currency, you'd be broke AND in debt AND somehow still asking to borrow money.",
    "You're the type of person who googles their own name and is genuinely surprised there's no results.",
    "You bring nothing to the table. Literally. I've seen you at buffets. You don't even bring yourself a plate.",
    "If common sense was a superpower, you'd be the least threatening villain in the Marvel universe.",
    "I'm not saying you're stupid, but you once tried to put M&Ms in alphabetical order and got mad when they didn't taste different.",
    "You have the social awareness of a parking cone — fixed in one spot, impossible to reason with, and everyone just drives around you.",
    "Your vibe is like a wet sock — nobody wants it near them, and when they're stuck with it, it ruins their entire day.",
    "Your jokes land like a drunk man trying to parallel park — multiple attempts, wrong angle every time, and someone always ends up hurt.",
    "You must be the world's greatest miracle — somehow millions of brain cells joined forces and produced absolutely nothing.",
    "You're the kind of person who reads the word 'gullible' on the ceiling. And then checks again to make sure.",
    "The bags under your eyes are so heavy, you could charge an airline fee to carry them.",
    "You're like a Monday morning — unwanted, exhausting, and way too loud about it.",
    "Your fashion sense screams 'I got dressed in the dark, in a wind, in someone else's house, in a country I'd never visited.'",
    "I've met walls with better listening skills and more interesting things to say.",
    "You're the type of person who microwaves fish in the office and then acts confused when nobody invites you to lunch.",
    "You have a resting face that makes people immediately reconsider their career choices in healthcare.",
    "If I had a dollar for every smart thing you've said, I'd still owe you money.",
    "You're like a speed bump — you slow everyone down, serve no real purpose in modern society, and everyone groans when they see you coming.",
    "Your selfies don't need a filter. They need a complete renovation, an architect, and planning permission.",
    "You're like a book with a great cover, but when you open it, all the pages are just the word 'nothing' repeated in Comic Sans.",
    "I'd say you're funny, but that would be a lie, and unlike you, I have standards.",
    "You're the human version of a footnote — technically present, completely ignored, and utterly irrelevant to the main point.",
    "You talk so much but say so little, scientists are studying you as proof that words can be both abundant and empty simultaneously.",
    "Your cooking is so bad, your microwave filed a restraining order.",
    "If awkwardness was an Olympic sport, you'd still somehow trip on the podium during the medal ceremony.",
    "You're like a Wikipedia page for a minor historical footnote — technically existing, rarely visited, and not particularly accurate.",
    "I've seen better arguments come from fortune cookies. At least those are brief.",
    "You have the attention span of a goldfish, the wisdom of a parking meter, and the charisma of a broken elevator.",
    "You remind me of a broken calculator — nothing adds up, nothing works, and yet you keep showing up on my desk.",
    "Your handwriting looks like a spider fell in ink and then had a panic attack across the page.",
    "You're like a hotel pool — shallow, cold, and full of people who probably shouldn't be there.",
    "I would tell you to go outside and touch grass, but I'm afraid you'd manage to trip on it and somehow injure twelve strangers.",
    "You type like someone is using your fingers to translate morse code written in a language they don't speak.",
    "You're the type of person who listens to music on full volume through one earphone and has strong opinions about it.",
    "Your playlist probably has no skip buttons because you physically can't tell good music from bad.",
    "You're like a compass with no needle — everyone follows you for a second then immediately realizes they're going the wrong direction.",
    "You're the human equivalent of laggy internet — constantly buffering, never delivering, and everyone's already closed the tab.",
    "You're not the sharpest tool in the shed. You're not even in the shed. You're just kind of... near the shed, confused about why there's a shed.",
    "If your life was a movie, critics would walk out during the opening credits and demand a refund for their popcorn.",
    "You're so basic even your WiFi router gets bored of you and disconnects on purpose.",
    "Your presence in a room is like finding out the Wi-Fi is down — everyone notices, nobody's happy about it, and it takes too long to fix.",
    "You call yourself a vibe but you're more of a mild inconvenience on a Tuesday afternoon.",
    "I'd challenge you to a battle of wits, but I don't like fighting unarmed opponents.",
    "You look like you argue with people in YouTube comment sections and then screenshot your own responses to send to yourself.",
    "You're the type who finishes other people's sentences — always late, always wrong, always proud about it.",
    "Scientists discovered a new element. They're calling it Roastium. It's unstable, dense, and embarrassingly bad under pressure. They named it after you.",
    "You're the kind of person who shows up to a potluck with an empty dish and then goes home with a full plate and zero shame.",
    "Your morning routine probably consists of waking up, checking your phone for notifications that aren't there, and then staring at the ceiling wondering why nobody texts first.",
    "You have the consistency of a broken vending machine — you take people's energy, make a lot of noise, and fail to deliver anything of value.",
    "You're the human version of Terms and Conditions — people scroll past you without reading, and nobody's life is better for having engaged.",
    "If you were a spice, you'd be flour. Technically it counts, but it doesn't belong on that list at all.",
    "Your sense of direction is so bad, you once got lost scrolling through your own camera roll.",
    "You're the type of person who claps when the plane lands. In a bus.",
    "I've heard of 'thinking outside the box' but you, my friend, don't even know there is a box. You're just wandering in an open field wondering why nothing makes sense.",
    "You look like you rehearse conversations in the shower that you then completely abandon in real life.",
    "Somewhere out there, a tree is working extremely hard to produce the oxygen you breathe. You owe that tree an apology.",
    "Your ego is so fragile it comes with a 'handle with care' sticker and a 48-hour return window.",
    "You're not the main character. You're not even a recurring side character. You're the extra in the background who ruins a scene by looking directly into the camera.",
    "Your plan every day is just yesterday's plan with the date changed.",
    "You have the emotional depth of a puddle in a car park on a hot afternoon — barely there, evaporating fast, and nobody misses it when it's gone.",
    "I've seen more backbone in a jellyfish than I've ever seen in a decision you've made.",
    "You're the type of person who sends a voice note when a 'yes' would have done perfectly fine.",
    "If overthinking was a skill, you'd be a genius. Unfortunately, results are what matter.",
    "Your life motto seems to be 'why be on time when you can be chronically, passionately, spectacularly late to everything forever.'",
    "You have the mysterious ability to walk into a room full of solutions and somehow create new problems.",
    "Your bedroom is a crime scene and the only suspect is your inability to make a single decision about where things go.",
    "You're the reason people pretend to be on their phone when they see you approaching from across the street.",
    "Talking to you is like trying to open a bag of crisps quietly in church — awkward, drawn out, and nobody's comfortable.",
    "You post motivational quotes online and then live the exact opposite life offline. The contrast is truly cinematic.",
    "You're so predictable that your plot twist would be doing something on time.",
    "I'd roast you harder but I was raised not to make fun of things people can't change — and apparently, everything about you qualifies.",
    "You're like expired milk — the moment people get close enough, they immediately know something is wrong.",
    "Your posture in photos looks like someone told you to act natural and you'd never heard the word before.",
    "You're the reason group chats have a mute button.",
    "You have a unique talent for turning a two-minute story into a forty-five-minute ordeal that ends without a point.",
    "Your fashion icon is clearly 'just woke up' but on a bad day, in a time zone nobody asked for.",
    "You're like a ringtone — loud, annoying, and the first thing people try to silence when you show up.",
    "You put the 'dis' in 'disappointment,' the 'pain' in 'explanation,' and absolutely nothing in 'useful contribution.'",
    "You're the type who says 'we should hang out sometime!' with absolutely no intention of following through, for the rest of eternity.",
    "Your group chat messages are always either a meme from three weeks ago or a one-word reply that contributes nothing. Sometimes both.",
    "You're so dry that cacti look at you and feel seen.",
    "Your most productive moment today was probably picking which side of the bed to get up from — and you still managed to get that wrong.",
    "I've seen traffic jams move faster and more gracefully than your thought process.",
    "You walk into a room and the vibe doesn't shift — it gasps, buckles, and files for early retirement.",
    "You're the type who takes 47 photos, hates all of them, posts none, and then spends three hours editing one to post at 11:47pm for 'visibility.'",
    "You're the human embodiment of a 'loading' screen that never finishes. People wait, then give up, then forget you were ever running.",
    "Your greatest skill is starting things you never finish, which is ironic because even that sentence describes you perfectly and you probably didn't finish reading—",
    "You have the kind of energy that makes plants lean away from you.",
    "Your advice is so useless, people thank you and then immediately do the opposite and somehow end up fine.",
    "You're the person who shows up to a 7pm event at 7:52, says 'sorry I'm late!' with a huge smile, and has no idea why people are already on their second drink and deeply over it.",
    "Your idea of multitasking is scrolling through your phone while pretending to listen.",
    "You have the discipline of melting ice cream — in the end, you're just a puddle of what you almost could have been.",
    "You're not a bad person. You're just a strong reminder that not every story needs a sequel.",
    "Your life is a constant work in progress. The problem is the work never happens, and the progress is entirely imaginary.",
    "You're the type who quotes movies in conversation and then explains that you're quoting a movie. Immediately. Every time.",
    "You move through life like a shopping trolley with a broken wheel — technically functional, but exhausting for everyone involved.",
    "Your WiFi connection is more reliable than your word, and your WiFi drops every time it rains.",
    "You could turn a compliment into an argument in under four seconds. It's honestly impressive, like watching a disaster unfold in slow motion.",
    "You've mastered the art of asking questions immediately after someone just answered them.",
    "Your punchlines arrive so late they need to apply for a visa.",
    "You're not difficult to love — you're just impossible to like on consecutive days.",
    "You have the presence of someone who showed up to the wrong party and hasn't realized it yet because they're too busy eating the snacks.",
    "You're the kind of person who forwards chain messages and genuinely believes the luck part applies to you specifically.",
    "If your energy was a weather forecast, it would be 'overcast with a high chance of unnecessary drama and zero productivity.'",
    "You remember every detail about things nobody cares about and forget everything that actually matters. It's a gift, really. A terrible one.",
    "Your LinkedIn profile is four paragraphs of saying nothing with extreme confidence.",
    "You're the type who spells out 'lol' when nothing about what you said was remotely close to funny.",
    "You've never been the smartest person in the room. But to be fair, you've also never had great taste in rooms.",
    "You're the type of person who hears advice, nods intensely, says 'facts, facts, I hear you,' and then does the exact thing they were just told not to do.",
    "Your decision-making process has all the structure and logic of a toddler choosing a crayon.",
    "You act like a limited edition but you're more of a clearance item — marked down repeatedly and still not moving off the shelf.",
    "I've met kettles with better self-awareness than you demonstrate on your best day.",
    "You're the type who turns 'I'm fine' into a personality trait and then wonders why nobody checks in on you.",
    "Your emotional intelligence is so low it needs a step stool to reach average.",
    "You give off the energy of someone who reads the terms and conditions and still gets surprised by the charges.",
    "You're the reason some people prefer texting. You're also the reason some people prefer silence.",
    "You're the type to walk into a library and ask where the WiFi is louder.",
    "Your comebacks need a loading screen, a buffering bar, and still arrive corrupted.",
    "You treat deadlines like suggestions and feedback like personal attacks — which explains why nothing in your life works.",
    "You narrate your own life like a documentary but your daily schedule has the drama of watching paint dry in real time.",
    "Your toxic trait is thinking everyone else's problem is their fault and every one of your problems is also their fault.",
    "You're the type who brings drama to a situation that had none, then leaves before helping clean it up.",
    "You've never had an original idea. Even your personality is a bootleg copy of someone more interesting.",
    "You're like a group project — everyone else does the work, you put your name on it, and somehow you're still the one who shows up late.",
    "Your sense of humor is like a WiFi signal in a basement — technically present but completely useless.",
    "You argue with receipts like they made a mistake. You argue with facts like they're opinions. You are the last person who should be confident.",
    "The only thing longer than your list of excuses is the list of things you were supposed to do six months ago.",
    "You're the type of person who loses an argument and then says 'I was just playing' like the whole thing was a game you invented.",
    "You give off the energy of someone who read the first chapter of a self-help book and now considers themselves a life coach.",
    "You are at your most dangerous in a conversation you haven't fully understood yet.",
    "You're so far behind the times that your breaking news is already a history lesson.",
    "You speak in half-sentences, unfinished thoughts, and loud silences — and call it depth.",
    "You once said something so painfully obvious that the room went quiet out of collective second-hand embarrassment.",
    "Your greatest achievement this week was probably remembering which day it was. Barely.",
    "You're the type who has seventeen unread emails, fourteen unfinished tasks, and zero awareness that this is a problem.",
    "You treat 'I'll do it tomorrow' like a complete, satisfying answer that requires no follow-up.",
    "You're the human equivalent of a 'NEW AND IMPROVED!' label on something that was already bad and is now somehow worse.",
    "Your confidence walks in ahead of you and your competence never shows up at all.",
    "You have the organizational skills of a tornado and the follow-through of a raindrop on a hot pavement.",
    "You're the type of person who finds out about trends six months late, goes all in, and calls people who moved on 'fake fans.'",
    "You manage to make every conversation about yourself without ever saying anything interesting about yourself.",
    "You don't read the room — you walk in, rearrange the furniture, and wonder why everyone looks uncomfortable.",
    "You're not a morning person OR an afternoon person OR an evening person. You're basically an 'inconvenient at all hours' person.",
    "Your sense of urgency is missing in action and your procrastination has a seven-page business plan.",
    "You could be replaced by a sticky note that says 'nah' and nobody would notice for at least three weeks.",
    "You're the type who says 'I don't like drama' while being the primary source of drama in any room you enter.",
    "You have the patience of a microwave that can't handle one extra second and the calmness of a car alarm at 3am.",
    "Your attention to detail is so poor you missed the point of this entire roast and are now waiting for a compliment.",
    "You're the person who rates a restaurant one star because the parking was difficult. The food was fine. You were the problem.",
    "You make plans with the energy of someone who's definitely going to cancel, and cancel with the energy of someone who planned it all along.",
    "You look like you've read exactly one article about nutrition and now feel qualified to comment on other people's plates.",
    "Your body language in meetings screams 'I have no idea what's happening but I'm nodding to seem engaged.'",
    "You treat silence in a conversation like a bug that needs fixing, which is ironic because your words are usually the bigger problem.",
    "You're the type who shows up to an argument with feelings instead of facts and then leaves saying they won.",
    "You have the range of a broken piano — technically lots of keys, but only three work and they're all the wrong ones.",
    "Your camera roll has 4,000 blurry photos and not a single one worth keeping, which is a perfect metaphor for your output in general.",
    "You're the type who says 'I'm brutally honest' as a warning, but the only thing brutal about you is the honesty you lack about yourself.",
    "You spend so much energy managing your image that you have none left for actually improving what's underneath it.",
    "You give the same advice repeatedly to yourself and ignore it every single time, like your brain is in a subscription loop it can't cancel.",
    "You have big dreams and even bigger alibis for why none of them have happened yet.",
    "Your personality has the shelf life of an open bag of crisps — fine for a moment, stale immediately, and nobody wants to finish it.",
    "You're the type who forgets the word for something and instead describes it in twelve words, none of which are helpful.",
    "You treat your potential like a gym membership — paid for, never used, renewed every year out of guilt.",
    "You could make an awkward silence in an empty room by yourself.",
    "Your hindsight is perfect and your foresight is absolutely nonexistent — you're always shocked by things everyone else saw coming from a mile away.",
    "You've told the same three stories so many times even YOU look bored while telling them.",
    "You're the type who makes a big deal about being unbothered, which is the most bothered thing anyone can possibly do.",
    "Your tolerance for other people's nonsense is zero and your output of it is infinite.",
    "You move through conversations like a pinball — fast, noisy, bouncing off every surface, and somehow never landing anywhere meaningful.",
    "You overthink the small stuff and underthink the big stuff, which means every decision you make is approximately the wrong size.",
    "You've got more opinions than experience, more noise than knowledge, and more excuses than outcomes.",
    "Your 'five-minute task' always takes forty-five minutes and involves three unrelated detours and a mini existential crisis.",
    "You're the type who brings up something from three years ago in an argument like it's fresh evidence at a trial.",
    "Your problem isn't that people don't understand you — it's that they understand you perfectly and that's what concerns them.",
    "You treat eye contact like a competitive sport you've never trained for.",
    "You're the type of person who says 'no offense' and then says the most offensive thing they've said all week.",
    "You have the self-awareness of someone wearing sunglasses indoors and thinking it looks fine.",
    "You're like a broken escalator — technically a staircase, but so much more disappointing.",
    "Your biggest character arc so far is switching from one bad habit to a slightly different bad habit and calling it growth.",
    "You remember every wrong done to you in perfect HD detail and forget every favor you owe in standard definition.",
    "You're the person at the party who turns every conversation into a monologue, every monologue into a lecture, and every lecture into a reason people check their watches.",
    "You walk into situations with maximum confidence and minimum preparation, which is genuinely a skill, just a very useless one.",
    "You're not emotionally unavailable — you're emotionally in a different country with no data plan and no plans to return.",
    "You're the type who double-texts an 'ok' four hours after the conversation ended. The ok wasn't necessary. Nothing about this was necessary.",
    "Your default setting is 'just vibing,' which is code for 'I have not made a conscious decision in several days.'",
    "You've mastered the art of looking busy while producing absolutely nothing.",
    "You're the reason some conversations end with 'anyway…' and a long, slow pivot to literally anything else.",
    "You take 'fake it till you make it' very seriously. The only issue is you've been faking it for years and the making it part has yet to begin.",
    "You're like a disclaimer at the bottom of an ad — technically part of the content, but specifically designed to be skipped.",
    "You're the background character who thinks they're the protagonist, and the writers haven't had the heart to tell you otherwise.",
    "You could lose an argument to a stop sign and walk away thinking the sign was being unreasonable.",
    "Your vibe is 'someone just woke up from a nap they didn't mean to take and doesn't know what year it is.'",
];

const roastCmd = {
    name: 'roast',
    aliases: ['flame', 'diss', 'burnit', 'draghim', 'draghim', 'savage'],
    description: 'Get a long savage roast — optionally target someone',
    category: 'fun',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const target = args.join(' ').trim();
        const pick   = ROASTS[Math.floor(Math.random() * ROASTS.length)];
        const header = target
            ? `╔═|〔  🔥 ROAST 〕\n║\n║ 🎯 *Target:* ${target}\n║`
            : `╔═|〔  🔥 ROAST 〕\n║`;
        await sock.sendMessage(chatId, {
            text: `${header}\n║ ${pick}\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
    }
};

module.exports = [
    truthCmd, dareCmd, wyrCmd, paranoiaCmd, pickuplineCmd,
    factCmd, nhieCmd, jokeCmd, memeCmd,
    quizCmd, quoteCmd, quoteAudioCmd, roastCmd,
];
