'use strict';

const { getBotName } = require('../../lib/botname');

const COMPLIMENTS = [
    'You have the kind of energy that makes every room brighter ☀️',
    'Your smile could charge a dead phone 😄🔋',
    'You\'re the reason someone smiles today 💫',
    'You give off main character energy and it shows 👑',
    'If kindness were money, you\'d be a billionaire 💰',
    'The world is genuinely better with you in it 🌍',
    'Your vibe is immaculate and you know it 💅',
    'You\'re built different — in the best way possible 🔥',
    'You have a rare combination of intelligence and heart 🧠❤️',
    'People feel safe around you — that\'s a superpower 💪',
    'Not everyone can radiate warmth without trying — you do it effortlessly 🌟',
    'Your energy is contagious in the most positive way 🌈',
    'You\'re the type of person that makes memories just by being present 📸',
    'If you were a song, you\'d be everyone\'s favourite 🎵',
    'You\'re the reason the word "amazing" was invented 🏆',
    'You\'re a whole vibe and a half 😍',
    'Even on your bad days you\'re still someone\'s favourite person 💖',
    'Your personality is a gift and I hope you never return it 🎁',
    'You\'re low-key one of the most underrated people around 💎',
    'Being around you feels like finding money in an old jacket 💸',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports = {
    name: 'compliment',
    aliases: ['hype', 'biggup', 'appreciate', 'complimentme', 'loveon'],
    description: 'Get or give a genuine compliment — .compliment [@mention]',
    category: 'fun',

    async execute(sock, msg, args, prefix) {
        const chatId  = msg.key.remoteJid;
        const name    = getBotName();
        const self    = (msg.key.participant || msg.key.remoteJid).split('@')[0].split(':')[0];

        // Check if tagging someone
        const tagged  = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const target  = tagged
            ? tagged.split('@')[0].split(':')[0]
            : args.join(' ').trim().replace(/^@/, '') || self;

        const compliment = pick(COMPLIMENTS);

        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  COMPLIMENT 💖 〕`,
                `║`,
                `║ To @${target}:`,
                `║`,
                `║ ✨ ${compliment}`,
                `║`,
                `╚═╝`,
            ].join('\n'),
            mentions: [`${target}@s.whatsapp.net`],
        }, { quoted: msg });
    }
};
