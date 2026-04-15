'use strict';

  // Runtime globals read by getPresenceType() in index.js
  // global.AUTOTYPING_ENABLED          — all chats
  // global.AUTOTYPING_GROUP_ENABLED    — groups only
  // global.AUTOTYPING_DM_ENABLED       — DMs only
  // global.AUTORECORDING_ENABLED       — all chats (recording indicator)

  module.exports = {
      name: 'autotyping',
      aliases: ['autotype', 'typing', 'typingindicator', 'autorecording', 'autorecord'],
      description: 'Toggle typing/recording indicator shown before bot replies',
      category: 'owner', ownerOnly: true, sudoAllowed: true,

      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;

          if (!ctx?.isOwnerUser && !ctx?.isSudoUser)
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  AUTO TYPING 〕\n║\n║ ▸ ❌ Owner/sudo only\n║\n╚═╝`
              }, { quoted: msg });

          const cmdName = (msg.message?.conversation ||
                           msg.message?.extendedTextMessage?.text || '')
                           .trim().slice(prefix.length).split(/\s+/)[0].toLowerCase();

          const isRecording = cmdName === 'autorecording' || cmdName === 'autorecord';
          const title  = isRecording ? 'AUTO RECORDING' : 'AUTO TYPING';
          const gKey   = isRecording ? 'AUTORECORDING_ENABLED'       : 'AUTOTYPING_ENABLED';
          const grpKey = isRecording ? 'AUTORECORDING_GROUP_ENABLED'  : 'AUTOTYPING_GROUP_ENABLED';
          const dmKey  = isRecording ? 'AUTORECORDING_DM_ENABLED'     : 'AUTOTYPING_DM_ENABLED';

          const sub    = (args[0] || '').toLowerCase();
          const scope  = (args[1] || 'all').toLowerCase(); // all | group | dm

          if (!sub || sub === 'status') {
              return sock.sendMessage(chatId, {
                  text: [
                      `╔═|〔  ${title} 〕`, `║`,
                      `║ ▸ *All*   : ${global[gKey]   ? '✅ ON' : '❌ OFF'}`,
                      `║ ▸ *Group* : ${global[grpKey] ? '✅ ON' : '❌ OFF'}`,
                      `║ ▸ *DM*    : ${global[dmKey]  ? '✅ ON' : '❌ OFF'}`, `║`,
                      `║ ▸ *Usage*:`,
                      `║   ${prefix}autotyping on           → all chats`,
                      `║   ${prefix}autotyping on group     → groups only`,
                      `║   ${prefix}autotyping on dm        → DMs only`,
                      `║   ${prefix}autotyping off`,
                      `║`, `╚═╝`
                  ].join('\n')
              }, { quoted: msg });
          }

          if (sub === 'on') {
              if (scope === 'group') {
                  global[grpKey] = true;
                  return sock.sendMessage(chatId, { text: `╔═|〔  ${title} 〕\n║\n║ ▸ ✅ ON (groups only)\n║\n╚═╝` }, { quoted: msg });
              }
              if (scope === 'dm') {
                  global[dmKey] = true;
                  return sock.sendMessage(chatId, { text: `╔═|〔  ${title} 〕\n║\n║ ▸ ✅ ON (DMs only)\n║\n╚═╝` }, { quoted: msg });
              }
              global[gKey] = true;
              return sock.sendMessage(chatId, { text: `╔═|〔  ${title} 〕\n║\n║ ▸ ✅ ON (all chats)\n║\n╚═╝` }, { quoted: msg });
          }

          if (sub === 'off') {
              global[gKey] = global[grpKey] = global[dmKey] = false;
              return sock.sendMessage(chatId, { text: `╔═|〔  ${title} 〕\n║\n║ ▸ ❌ OFF\n║\n╚═╝` }, { quoted: msg });
          }

          return sock.sendMessage(chatId, {
              text: `╔═|〔  ${title} 〕\n║\n║ ▸ Usage: ${prefix}autotyping on/off [group|dm]\n║\n╚═╝`
          }, { quoted: msg });
      }
  };