'use strict';
  const fs   = require('fs');
  const path = require('path');
  const { registerBotDelete } = require('../../lib/bot-delete-guard');

  const CFG_FILE = path.join(__dirname, '../../data/slowmode.json');
  const _tracker = new Map();
  function loadCfg()  { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return {}; } }
  function saveCfg(d) { try { fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true }); fs.writeFileSync(CFG_FILE, JSON.stringify(d, null, 2)); } catch {} }
  function defaultG() { return { enabled: false, limit: 1, window: 30 }; }

  // Reset all groups to OFF on every bot startup
  try {
      const _b = loadCfg(); let _c = false;
      for (const id of Object.keys(_b)) { if (_b[id]?.enabled) { _b[id].enabled = false; _c = true; } }
      if (_c) saveCfg(_b);
  } catch {}

  const _smReg = new WeakSet();
  function setupSlowModeListener(sock) {
      if (_smReg.has(sock)) return;
      _smReg.add(sock);
      const startedAt = Math.floor(Date.now() / 1000);
      sock.ev.on('messages.upsert', async ({ messages }) => {
          for (const msg of messages) {
              if (!msg.message || msg.key.fromMe) continue;
              const ts = Number(msg.messageTimestamp || 0);
              if (ts && ts < startedAt - 5) continue;
              const chatId = msg.key.remoteJid;
              if (!chatId?.endsWith('@g.us')) continue;
              const gcfg = loadCfg()[chatId];
              if (!gcfg?.enabled) continue;
              const sender = msg.key.participant || '';
              try {
                  const meta    = await sock.groupMetadata(chatId);
                  const isAdmin = meta.participants.find(p => p.id === sender && p.admin);
                  if (isAdmin) continue;
              } catch {}
              const key = `${chatId}::${sender}`;
              const now = Date.now();
              const win = (gcfg.window || 30) * 1000;
              const t   = _tracker.get(key) || { count: 0, start: now };
              if (now - t.start > win) { t.count = 1; t.start = now; }
              else { t.count++; }
              _tracker.set(key, t);
              if (t.count > (gcfg.limit || 1)) {
                  registerBotDelete(msg.key.id);
                  try { await sock.sendMessage(chatId, { delete: msg.key }); } catch {}
              }
          }
      });
  }

  module.exports = {
      setupSlowModeListener,
      name: 'slowmode', aliases: ['slow','slowchat'],
      description: 'Limit message rate per member in groups',
      category: 'group',
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          if (!chatId?.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  SLOW MODE 〕\n║\n║ ▸ Groups only\n║\n╚═╝` }, { quoted: msg });
          if (!ctx?.isOwnerUser && !ctx?.isSudoUser && !ctx?.isGroupAdmin)
              return sock.sendMessage(chatId, { text: `╔═|〔  SLOW MODE 〕\n║\n║ ▸ Admins/Owner only\n║\n╚═╝` }, { quoted: msg });
          const cfg  = loadCfg();
          const gcfg = Object.assign(defaultG(), cfg[chatId] || {});
          const save = () => { cfg[chatId] = gcfg; saveCfg(cfg); };
          const sub  = args[0]?.toLowerCase();
          if (!sub || sub === 'status') {
              return sock.sendMessage(chatId, { text: [`╔═|〔  SLOW MODE 〕`,`║`,`║ ▸ *State* : ${gcfg.enabled?'✅ ON':'❌ OFF'}`,`║ ▸ *Limit* : ${gcfg.limit} msg / ${gcfg.window}s`,`║`,`║ ▸ *Usage*:`,`║   ${prefix}slowmode on/off`,`║   ${prefix}slowmode set <msgs> <secs>`,`║   e.g. ${prefix}slowmode set 2 10`,`║`,`╚═╝`].join('\n') }, { quoted: msg });
          }
          if (sub === 'on' ) { gcfg.enabled = true;  save(); return sock.sendMessage(chatId, { text: `╔═|〔  SLOW MODE 〕\n║\n║ ▸ *State* : ✅ ON\n║ ▸ *Limit* : ${gcfg.limit} msg / ${gcfg.window}s\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'off') { gcfg.enabled = false; save(); return sock.sendMessage(chatId, { text: `╔═|〔  SLOW MODE 〕\n║\n║ ▸ *State* : ❌ OFF\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'set') {
              const limit = parseInt(args[1]); const window = parseInt(args[2]);
              if (!limit||!window||limit<1||window<1) return sock.sendMessage(chatId, { text: `╔═|〔  SLOW MODE 〕\n║\n║ ▸ Usage: ${prefix}slowmode set <msgs> <secs>\n║\n╚═╝` }, { quoted: msg });
              gcfg.limit = limit; gcfg.window = window; save();
              return sock.sendMessage(chatId, { text: `╔═|〔  SLOW MODE 〕\n║\n║ ▸ ✅ Updated\n║ ▸ *Rate* : ${limit} msg / ${window}s\n║\n╚═╝` }, { quoted: msg });
          }
      }
  };