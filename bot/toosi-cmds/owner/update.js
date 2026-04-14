'use strict';

  // GitHub-based auto-updater — downloads files directly from GitHub API.
  // Works on any platform (Heroku, bot-hosting, VPS) — no git required.

  const https   = require('https');
  const fs      = require('fs');
  const path    = require('path');
  const { spawn } = require('child_process');
  const { getBotName } = require('../../lib/botname');

  const REPO   = 'TOOSII102/toosii-xd-ultra';
  const BRANCH = 'main';

  // Absolute path to the bot/ directory (2 levels up from toosi-cmds/owner/)
  const BOT_DIR = path.resolve(__dirname, '../..');

  // Files/dirs inside bot/ that should NEVER be overwritten during update
  const PROTECTED = [
      'session',        // WhatsApp auth — overwriting = logout
      'data',           // runtime config set by the owner
      'yt-dlp',         // binary executable
      'package-lock.json',
      '.env',           // owner secrets
  ];

  function httpsGetBuffer(url) {
      return new Promise((resolve, reject) => {
          https.get(url, { headers: { 'User-Agent': 'TOOSII-XD-Bot' } }, res => {
              if (res.statusCode === 301 || res.statusCode === 302) {
                  return httpsGetBuffer(res.headers.location).then(resolve).catch(reject);
              }
              if (res.statusCode !== 200) {
                  return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
              }
              const chunks = [];
              res.on('data', c => chunks.push(c));
              res.on('end', () => resolve(Buffer.concat(chunks)));
          }).on('error', reject);
      });
  }

  async function getJson(url) {
      const buf = await httpsGetBuffer(url);
      return JSON.parse(buf.toString('utf8'));
  }

  async function getLatestCommit() {
      const json = await getJson(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`);
      return { sha: json.sha, message: json.commit?.message?.split('\n')[0] || '' };
  }

  async function getRepoTree(sha) {
      const json = await getJson(`https://api.github.com/repos/${REPO}/git/trees/${sha}?recursive=1`);
      return json.tree || [];
  }

  function getSavedSha() {
      try { return fs.readFileSync(path.join(BOT_DIR, '.last_update'), 'utf8').trim(); } catch { return null; }
  }

  function saveSha(sha) {
      try { fs.writeFileSync(path.join(BOT_DIR, '.last_update'), sha, 'utf8'); } catch {}
  }

  function isProtected(repoPath) {
      // repoPath is like "bot/session/creds.json" or "bot/.env"
      const rel = repoPath.slice('bot/'.length); // "session/creds.json"
      return PROTECTED.some(p => rel === p || rel.startsWith(p + '/') || rel.startsWith('.' + p));
  }

  module.exports = {
      name:        'update',
      aliases:     ['upgrade', 'pullupdate'],
      description: 'Download latest code from GitHub and restart',
      category:    'owner',
      ownerOnly:   true,

      async execute(sock, msg, args, prefix, ctx) {
          const chatId  = msg.key.remoteJid;
          const botName = getBotName();
          const foot    = `╚═|〔 ${botName} 〕`;

          try { await sock.sendMessage(chatId, { react: { text: '🔄', key: msg.key } }); } catch {}

          if (!ctx.isOwner()) {
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n${foot}`
              }, { quoted: msg });
          }

          // Step 1 — get latest commit from GitHub
          let latest;
          try { latest = await getLatestCommit(); }
          catch (err) {
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Cannot reach GitHub\n║ ▸ *Reason* : ${err.message}\n║\n${foot}`
              }, { quoted: msg });
          }

          const shortSha = latest.sha.slice(0, 7);
          const savedSha = getSavedSha();

          if (savedSha === latest.sha) {
              return sock.sendMessage(chatId, {
                  text: [
                      `╔═|〔  UPDATE 〕`,
                      `║`,
                      `║ ▸ *Status*  : ✅ Already up to date`,
                      `║ ▸ *Commit*  : ${shortSha}`,
                      `║ ▸ *Changes* : ${latest.message}`,
                      `║`,
                      `${foot}`,
                  ].join('\n')
              }, { quoted: msg });
          }

          // Step 2 — notify and start downloading
          await sock.sendMessage(chatId, {
              text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : 📥 Downloading from GitHub...\n║ ▸ *Commit* : ${shortSha}\n║ ▸ ${latest.message}\n║\n${foot}`
          }, { quoted: msg });

          // Step 3 — fetch file tree
          let tree;
          try { tree = await getRepoTree(latest.sha); }
          catch (err) {
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Failed to fetch file list\n║ ▸ *Reason* : ${err.message}\n║\n${foot}`
              }, { quoted: msg });
          }

          // Step 4 — filter to bot/ files only, skip protected paths
          const botFiles = tree.filter(f =>
              f.type === 'blob' &&
              f.path.startsWith('bot/') &&
              !isProtected(f.path)
          );

          // Step 5 — download and write each file
          let updated = 0, failed = 0;
          for (const file of botFiles) {
              try {
                  const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${file.path}`;
                  const content = await httpsGetBuffer(rawUrl);
                  const localPath = path.join(BOT_DIR, file.path.slice('bot/'.length));
                  fs.mkdirSync(path.dirname(localPath), { recursive: true });
                  fs.writeFileSync(localPath, content);
                  updated++;
              } catch { failed++; }
          }

          // Step 6 — save new commit SHA so next .update knows what version is installed
          saveSha(latest.sha);

          // Step 7 — confirm and restart
          await sock.sendMessage(chatId, {
              text: [
                  `╔═|〔  UPDATE 〕`,
                  `║`,
                  `║ ▸ *Status*  : ✅ Updated successfully`,
                  `║ ▸ *Commit*  : ${shortSha}`,
                  `║ ▸ *Changes* : ${latest.message}`,
                  `║ ▸ *Files*   : ${updated} updated${failed ? `, ${failed} skipped` : ''}`,
                  `║`,
                  `║ ▸ 🔄 Restarting in 3s...`,
                  `║`,
                  `${foot}`,
              ].join('\n')
          }, { quoted: msg });

          setTimeout(() => {
              const child = spawn(process.execPath, process.argv.slice(1), {
                  detached: true,
                  stdio:    'inherit',
                  env:      process.env,
                  cwd:      process.cwd()
              });
              child.unref();
              setTimeout(() => process.exit(0), 1000);
          }, 3000);
      },
  };
  