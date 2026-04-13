'use strict';

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getBotName }           = require('../../lib/botname');
const { getPhoneFromLid }      = require('../../lib/sudo-store');
const config                   = require('../../config');

const H = '╔═|〔  💾 SAVE STATUS 〕';
const F = () => `╚═|〔 ${getBotName()} 〕`;

function unwrapViewOnce(msg) {
    return msg?.viewOnceMessageV2?.message
        || msg?.viewOnceMessageV2Extension?.message
        || msg?.viewOnceMessage?.message
        || msg;
}

function detectMedia(msg) {
    const unwrapped = unwrapViewOnce(msg);
    if (unwrapped?.imageMessage)    return { type: 'image',    inner: unwrapped };
    if (unwrapped?.videoMessage)    return { type: 'video',    inner: unwrapped };
    if (unwrapped?.audioMessage)    return { type: 'audio',    inner: unwrapped };
    if (unwrapped?.stickerMessage)  return { type: 'sticker',  inner: unwrapped };
    if (unwrapped?.documentMessage) return { type: 'document', inner: unwrapped };
    return null;
}

/** Resolve a LID JID to a real phone number, fall back to raw numeric part */
function resolveNumber(jid, sock) {
    if (!jid) return 'unknown';
    const raw = jid.split('@')[0].split(':')[0];

    if (!jid.includes('@lid')) return raw;

    // 1. Try sudo-store persistent map
    const stored = getPhoneFromLid(raw);
    if (stored) return stored;

    // 2. Try signal repository LID mapping
    try {
        const pn = sock?.signalRepository?.lidMapping?.getPNForLID?.(jid)
                || sock?.signalRepository?.lidMapping?.getPNForLID?.(`${raw}@lid`)
                || sock?.signalRepository?.lidMapping?.getPNForLID?.(`${raw}:0@lid`);
        if (pn) {
            const num = String(pn).split('@')[0].replace(/[^0-9]/g, '');
            if (num && num.length >= 7) return num;
        }
    } catch {}

    // 3. Try sock.contacts lookup
    try {
        const candidates = [`${raw}@lid`, `${raw}:0@lid`];
        for (const key of candidates) {
            const c = sock?.contacts?.[key];
            const phone = (c?.phone || c?.number || '').replace(/[^0-9]/g, '');
            if (phone && phone.length >= 7) return phone;
        }
    } catch {}

    return raw;
}

module.exports = {
    name:        'save',
    aliases:     ['savestatus', 'savedl', 'dlstatus'],
    description: 'Save a status by replying to it — sends media to your DM',
    category:    'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId   = msg.key.remoteJid;
        const ownerNum = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
        const ownerJid = `${ownerNum}@s.whatsapp.net`;

        try { await sock.sendMessage(chatId, { react: { text: '💾', key: msg.key } }); } catch {}

        const ctx2 = msg.message?.extendedTextMessage?.contextInfo
                  || msg.message?.imageMessage?.contextInfo
                  || msg.message?.videoMessage?.contextInfo;

        const quotedMsg   = ctx2?.quotedMessage;
        const quotedId    = ctx2?.stanzaId;
        // Poster is ctx2.participant; skip 'status@broadcast' fallback (not a phone JID)
        const quotedOwner = ctx2?.participant
                         || (ctx2?.remoteJid !== 'status@broadcast' ? ctx2?.remoteJid : '')
                         || '';
        const _raw = quotedOwner.split('@')[0].split(':')[0];
        const _resolved = resolveNumber(quotedOwner, sock);
        console.log('[SAVE-DBG4] statusAttributions=' + JSON.stringify(ctx2?.statusAttributions));
        console.log('[SAVE-DBG4] imgCtx participant=' + quotedMsg?.imageMessage?.contextInfo?.participant);
        console.log('[SAVE-DBG4] imgCtx remoteJid=' + quotedMsg?.imageMessage?.contextInfo?.remoteJid);
        console.log('[SAVE-DBG4] participant=' + ctx2?.participant + ' | resolved=' + _resolved);

        if (!quotedMsg) {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Usage* : Reply to a status with ${prefix}save\n║\n${F()}`
            }, { quoted: msg });
        }

        const detected = detectMedia(quotedMsg);

        if (!detected) {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Status* : ❌ No media found\n║ ▸ *Tip*    : Only images, videos, audio and stickers can be saved\n║\n${F()}`
            }, { quoted: msg });
        }

        try {
            const { type, inner } = detected;

            const syntheticMsg = {
                key: {
                    remoteJid:   'status@broadcast',
                    participant: quotedOwner,
                    id:          quotedId || '',
                    fromMe:      false,
                },
                message: inner,
            };

            const buf = await downloadMediaMessage(syntheticMsg, 'buffer', {});
            if (!buf || !buf.length) throw new Error('Empty download buffer');

            // Resolve LID → real phone for display
            const senderPhone = resolveNumber(quotedOwner, sock);

            const typeLabel =
                type === 'image'   ? '🖼️ Image'   :
                type === 'video'   ? '📹 Video'   :
                type === 'audio'   ? '🎵 Audio'   :
                type === 'sticker' ? '🪄 Sticker' : '📄 File';

            const caption = `${H}\n║\n║ ▸ *From* : +${senderPhone}\n║ ▸ *Type* : ${typeLabel}\n║\n${F()}`;

            // Send to owner DM — not to the current chat
            if (type === 'image') {
                await sock.sendMessage(ownerJid, { image: buf, caption });
            } else if (type === 'video') {
                await sock.sendMessage(ownerJid, { video: buf, caption });
            } else if (type === 'audio') {
                await sock.sendMessage(ownerJid, {
                    audio:    buf,
                    mimetype: inner.audioMessage?.mimetype || 'audio/mp4',
                    ptt:      inner.audioMessage?.ptt || false,
                });
                await sock.sendMessage(ownerJid, { text: caption });
            } else if (type === 'sticker') {
                await sock.sendMessage(ownerJid, { sticker: buf });
                await sock.sendMessage(ownerJid, { text: caption });
            } else {
                const docMsg = inner.documentMessage;
                await sock.sendMessage(ownerJid, {
                    document: buf,
                    mimetype: docMsg?.mimetype || 'application/octet-stream',
                    fileName: docMsg?.fileName || `status_${Date.now()}`,
                    caption,
                });
            }

            // Only react in original chat — full info is in the media caption sent to ownerJid
            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Status* : ❌ Failed to save\n║ ▸ *Reason* : ${e.message}\n║\n${F()}`
            }, { quoted: msg });
        }
    }
};
