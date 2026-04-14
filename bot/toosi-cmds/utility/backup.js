'use strict';

  module.exports = {
      name: 'backup', aliases: ['exportmembers','vcfexport','groupvcf'],
      description: 'Export group member list as a VCF contacts file',
      category: 'utility',
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          if (!chatId?.endsWith('@g.us'))
              return sock.sendMessage(chatId, { text: `╔═|〔  BACKUP 〕\n║\n║ ▸ Groups only\n║\n╚═╝` }, { quoted: msg });
          if (!ctx?.isOwnerUser && !ctx?.isSudoUser && !ctx?.isGroupAdmin)
              return sock.sendMessage(chatId, { text: `╔═|〔  BACKUP 〕\n║\n║ ▸ Admins/Owner only\n║\n╚═╝` }, { quoted: msg });
          try { await sock.sendMessage(chatId, { react: { text: '💾', key: msg.key } }); } catch {}
          let meta;
          try { meta = await sock.groupMetadata(chatId); }
          catch { return sock.sendMessage(chatId, { text: `╔═|〔  BACKUP 〕\n║\n║ ▸ ❌ Failed to fetch group info\n║\n╚═╝` }, { quoted: msg }); }
          const members = meta.participants.map(p => p.id.split('@')[0].split(':')[0]).filter(n => /^\d+$/.test(n));
          const vcf      = members.map((num, i) => `BEGIN:VCARD\nVERSION:3.0\nFN:Member ${i+1}\nTEL;TYPE=CELL:+${num}\nEND:VCARD`).join('\n');
          const gname    = (meta.subject||'group').replace(/[^a-zA-Z0-9]/g,'_');
          await sock.sendMessage(chatId, {
              document: Buffer.from(vcf,'utf8'), mimetype: 'text/vcard',
              fileName: `${gname}_members.vcf`,
              caption: [`╔═|〔  BACKUP 〕`,`║`,`║ ▸ *Group*   : ${meta.subject}`,`║ ▸ *Members* : ${members.length}`,`║ ▸ *File*    : ${gname}_members.vcf`,`║`,`╚═╝`].join('\n')
          }, { quoted: msg });
      }
  };