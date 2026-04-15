'use strict';
  module.exports = {
      name: 'tts', aliases: ['speak','voice','say','readthis'],
      description: 'Convert text to a voice audio message',
      category: 'utility',
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          if (!args.length)
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  TEXT TO SPEECH 〕\n║\n║ ▸ Usage: ${prefix}tts <text>\n║ ▸ Example: ${prefix}tts Hello everyone\n║\n╚═╝`
              }, { quoted: msg });

          const text    = args.join(' ').slice(0, 200); // Google TTS limit
          const lang    = 'en';
          const encoded = encodeURIComponent(text);
          const url     = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;

          try {
              const res = await fetch(url, {
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                  signal: AbortSignal.timeout(20000)
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const buf = Buffer.from(await res.arrayBuffer());
              await sock.sendMessage(chatId, {
                  audio: buf,
                  mimetype: 'audio/mpeg',
                  ptt: true   // sends as voice note
              }, { quoted: msg });
          } catch (e) {
              await sock.sendMessage(chatId, {
                  text: `╔═|〔  TEXT TO SPEECH 〕\n║\n║ ▸ ❌ TTS failed. Try shorter text\n║\n╚═╝`
              }, { quoted: msg });
          }
      }
  };