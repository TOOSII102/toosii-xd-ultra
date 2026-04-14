const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { get, set }             = require('../../lib/autoconfig');
const { getBotName }           = require('../../lib/botname');
const { resolveDisplay }       = require('../../lib/groupUtils');
const { isBotDeleted }         = require('../../lib/bot-delete-guard');
const config                   = require('../../config');

// ── In-memory message store (last 500) ──────────────────────────────────────
const _store      = new Map();
const MAX_MSGS    = 500;
let   _sock       = null;

// ── Dedup: prevent double-processing the same revoke ────────────────────────
// Baileys fires revokes from BOTH messages.upsert (protocol msg) AND
// messages.update — same ID arrives twice within milliseconds.
const _revokedIds = new Set();
function _markRevoked(id) {
    if (_revokedIds.has(id)) return false; // already handled
    _revokedIds.add(id);
    setTimeout(() => _revokedIds.delete(id), 10_000);
    return true;
}

function _resolveContent(message) {
    if (!message) return null;
    return message.ephemeralMessage?.message
        || message.viewOnceMessage?.message
        || message.viewOnceMessageV2?.message?.viewOnceMessage?.message
        || message;
}

function _addToStore(msg) {
    if (!msg?.key?.id) return;
    const content = _resolveContent(msg.message);
    if (!content) return;
    _store.set(msg.key.id, { msg, content, at: Date.now() });
    if (_store.size > MAX_MSGS) _store.delete(_store.keys().next().value);
}

// ── Config helpers (fully per-group) ────────────────────────────────────────
/*
 * Storage shape (v2):
 * {
 *   global: false,
 *   chats: {
 *     "<chatId>": { enabled: bool, mode: "chat"|"owner" }
 *   }
 * }
 * Old shape had chats[chatId] = true (bool) — migrated on read.
 */

function _getCfg() {
    const raw = get('antidelete') || {};
    // Migrate old top-level `enabled` → `global`
    if (typeof raw.enabled === 'boolean' && raw.global === undefined) {
        raw.global = raw.enabled;
        delete raw.enabled;
    }
    if (!raw.chats) raw.chats = {};
    return raw;
}

/** Migrate old boolean entry to object, return the chat-level config or null */
function _chatCfg(cfg, chatId) {
    const c = cfg.chats?.[chatId];
    if (!c) return null;
    if (c === true) return { enabled: true, mode: 'owner' }; // old bool → default owner
    return c;
}

function _isChatEnabled(chatId) {
    const cfg = _getCfg();
    if (cfg.global === true) return true;
    const c = _chatCfg(cfg, chatId);
    return c?.enabled === true;
}

function _getChatMode(cfg, chatId) {
    const c = _chatCfg(cfg, chatId);
    return c?.mode || 'owner'; // default: forward to owner DM
}

// ── Exported event handler functions (index.js imports these) ────────────────

const _adRegistered = new WeakSet();

function initAntidelete(sock) {
    _sock = sock;
    if (_adRegistered.has(sock)) {
        console.log('[ANTIDELETE] Self-listener already registered for this sock — skipping duplicate');
        return Promise.resolve();
    }
    _adRegistered.add(sock);
    sock.ev.on('messages.upsert', ({ messages }) => {
        for (const msg of messages) {
            try {
                if (msg?.key?.remoteJid === 'status@broadcast') continue;
                if (!msg?.key?.id || !msg.message) continue;
                if (msg.messageStubType) continue;
                const proto = msg.message?.protocolMessage;
                if (proto && (proto.type === 0 || proto.type === 4)) continue;
                _addToStore(msg);
            } catch {}
        }
    });
    console.log('[ANTIDELETE] Self-listener registered — storing from connect-time');
    return Promise.resolve();
}

async function antideleteStoreMessage(msg) {
    if (msg?.message) _addToStore(msg);
}

async function antideleteHandleUpdate(update) {
    try {
        const looksLikeDelete = update?.update?.message === null
            || update?.update?.messageStubType != null;
        if (!looksLikeDelete) return;

        const key    = update?.key;
        if (!key?.id) return;
        const chatId = key.remoteJid;

        // Deduplicate — Baileys fires this from both upsert AND update for the same revoke
        if (!_markRevoked(key.id)) {
            console.log(`[ANTIDELETE] ⏭️ Dedup skip for ${key.id}`);
            return;
        }

        if (!_isChatEnabled(chatId)) return;
        if (!_sock) { console.log('[ANTIDELETE] Sock not ready'); return; }

        // Skip intentional bot deletions (antitag, antilink, etc.)
        if (isBotDeleted(key.id)) {
            console.log(`[ANTIDELETE] ⏭️ Skipped — bot-deleted: ${key.id}`);
            _store.delete(key.id);
            return;
        }

        console.log(`[ANTIDELETE] Revoke for ${key.id} | store: ${_store.size}`);

        const cached = _store.get(key.id);
        if (!cached) {
            const sample = [..._store.keys()].slice(0, 4).join(', ');
            console.log(`[ANTIDELETE] ⚠️ Not in store | sample: [${sample}]`);
            return;
        }
        _store.delete(key.id);

        const { msg, content } = cached;
        const realChatId = key.remoteJid || msg.key.remoteJid;
        if (!realChatId || realChatId === 'status@broadcast') return;

        // Per-group mode
        const cfg      = _getCfg();
        const mode     = _getChatMode(cfg, realChatId);
        const ownerJid = `${(config.OWNER_NUMBER || '').replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        const dest     = mode === 'owner' ? ownerJid : realChatId;
        if (!dest || dest === '@s.whatsapp.net') {
            console.log('[ANTIDELETE] ⚠️ No valid destination — set OWNER_NUMBER in config');
            return;
        }
        const botNum  = (_sock?.user?.id || '').split(':')[0].split('@')[0];
        const destNum = dest.split('@')[0];
        const isSelf  = botNum && destNum === botNum;
        console.log(`[ANTIDELETE] Dest: ${destNum} | mode: ${mode}${isSelf ? ' (→ Saved Messages on your WhatsApp)' : ''}`);

        const rawSender     = msg.key.participant || msg.key.remoteJid || '';
        const isFromMe      = msg.key.fromMe;
        const senderDisplay = isFromMe
            ? 'You'
            : await resolveDisplay(_sock, realChatId, rawSender).catch(() => rawSender.split('@')[0].split(':')[0]);

        let chatLabel = 'DM';
        if (realChatId.endsWith('@g.us')) {
            try {
                const meta = await _sock.groupMetadata(realChatId);
                chatLabel  = meta?.subject || realChatId.split('@')[0];
            } catch { chatLabel = realChatId.split('@')[0]; }
        }

        const header = `╔═|〔  ANTI DELETE 〕\n║\n║ ▸ *From* : ${senderDisplay}\n║ ▸ *Chat* : ${chatLabel}\n║\n╚═╝`;

        // Text
        const text = content?.conversation || content?.extendedTextMessage?.text
                  || content?.buttonsResponseMessage?.selectedDisplayText
                  || content?.listResponseMessage?.title
                  || content?.templateButtonReplyMessage?.selectedDisplayText;
        if (text) {
            console.log(`[ANTIDELETE] ✅ Text → ${dest.split('@')[0]}`);
            await _sock.sendMessage(dest, { text: `${header}\n\n${text}` });
            return;
        }

        // Media
        const hasImg = content?.imageMessage;
        const hasVid = content?.videoMessage;
        const hasAud = content?.audioMessage;
        const hasStk = content?.stickerMessage;
        const hasDoc = content?.documentMessage;

        if (hasImg || hasVid || hasAud || hasStk || hasDoc) {
            const mtype = hasImg ? 'image' : hasVid ? 'video' : hasAud ? 'audio' : hasStk ? 'sticker' : 'doc';
            console.log(`[ANTIDELETE] ✅ Media (${mtype}) → ${dest.split('@')[0]}`);
            try {
                const buf = await downloadMediaMessage({ key: msg.key, message: content }, 'buffer', {});
                if (!buf?.length) throw new Error('empty buffer');
                if (hasImg)      await _sock.sendMessage(dest, { image:    buf, caption: header });
                else if (hasVid) await _sock.sendMessage(dest, { video:    buf, caption: header, mimetype: hasVid.mimetype || 'video/mp4' });
                else if (hasAud) await _sock.sendMessage(dest, { audio:    buf, mimetype: hasAud.mimetype || 'audio/ogg; codecs=opus', ptt: !!hasAud.ptt });
                else if (hasStk) await _sock.sendMessage(dest, { sticker:  buf });
                else if (hasDoc) await _sock.sendMessage(dest, { document: buf, mimetype: hasDoc.mimetype || 'application/octet-stream', fileName: hasDoc.fileName || 'file', caption: header });
            } catch (e) {
                console.log(`[ANTIDELETE] ⚠️ Media dl: ${e.message}`);
                await _sock.sendMessage(dest, { text: `${header}\n\n⚠️ [Media — download failed]` });
            }
            return;
        }

        const contentKeys = Object.keys(content || {}).join(', ');
        console.log(`[ANTIDELETE] ⚠️ Unknown type: ${contentKeys}`);
        await _sock.sendMessage(dest, { text: `${header}\n\n⚠️ [Unsupported type: ${contentKeys}]` });

    } catch (err) {
        console.log(`[ANTIDELETE] ❌ ${err.message}`);
    }
}

function updateAntideleteSock(sock) { _sock = sock; }

// ── Command export ────────────────────────────────────────────────────────────
module.exports = {
    initAntidelete,
    antideleteStoreMessage,
    antideleteHandleUpdate,
    updateAntideleteSock,

    name:        'antidelete',
    aliases:     ['antidel'],
    description: 'Recover deleted messages — fully per-group',
    category:    'owner',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🗑️', key: msg.key } }); } catch {}
        const name    = getBotName();
        const isGroup = chatId.endsWith('@g.us');
        const chatLbl = isGroup ? 'This group' : 'This DM';

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI DELETE 〕\n║\n║ ▸ *Status* : ❌ Owner/sudo only\n║\n╚═╝`
            }, { quoted: msg });
        }

        let action = (args[0] ?? '').toLowerCase().trim();
        let arg1   = (args[1] ?? '').toLowerCase().trim();

        // Normalize reversed order: "chat on" → "on chat", "owner on" → "on owner"
        // Also bare mode words: "chat" → "on chat", "owner" → "on owner"
        const _isModeWord = w => w === 'chat' || w === 'owner';
        const _isOnOff    = w => w === 'on' || w === 'off';
        if (_isModeWord(action) && (_isOnOff(arg1) || !arg1)) {
            // e.g. "chat on" → action="on" arg1="chat"
            // e.g. "chat"    → action="on" arg1="chat"  (bare mode = enable)
            const modeWord = action;
            action = arg1 || 'on';
            arg1   = modeWord;
        }

        console.log(`[ANTIDELETE CMD] action="${action}" arg1="${arg1}" from ${chatId.split('@')[0]}`);
        const cfg    = _getCfg();
        const cCfg   = _chatCfg(cfg, chatId) || { enabled: false, mode: 'owner' };

        // ── status ──────────────────────────────────────────────────────────
        if (!action || action === 'status') {
            const enabledList = Object.entries(cfg.chats || {})
                .filter(([, v]) => (v === true || v?.enabled))
                .map(([jid, v]) => {
                    const m = (v === true) ? 'owner' : (v?.mode || 'owner');
                    return `║ ▸ ${jid.endsWith('@g.us') ? '👥' : '💬'} ${jid.split('@')[0]} [${m}]`;
                }).join('\n');
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI DELETE 〕\n║\n` +
                      `║ ▸ *${chatLbl}* : ${cCfg.enabled ? '✅ ON' : '❌ OFF'}\n` +
                      `║ ▸ *Mode*      : ${cCfg.mode || 'owner'} (chat/owner)\n` +
                      `║ ▸ *Global*    : ${cfg.global ? '✅ ON' : '❌ OFF'}\n` +
                      `║ ▸ *Cached*   : ${_store.size} messages\n║\n` +
                      (enabledList ? `${enabledList}\n║\n` : '') +
                      `║ ▸ *Usage*:\n` +
                      `║   ${prefix}antidelete on          → enable here (owner DM)\n` +
                      `║   ${prefix}antidelete on chat     → enable here (same chat)\n` +
                      `║   ${prefix}antidelete off         → disable here\n` +
                      `║   ${prefix}antidelete mode owner  → change mode this chat\n` +
                      `║   ${prefix}antidelete mode chat   → change mode this chat\n` +
                      `║   ${prefix}antidelete on all      → global on\n` +
                      `║   ${prefix}antidelete off all     → global off\n` +
                      `║\n╚═╝`
            }, { quoted: msg });
        }

        // ── on / off ────────────────────────────────────────────────────────
        if (action === 'on' || action === 'off') {
            const enable = action === 'on';

            if (arg1 === 'all') {
                cfg.global = enable;
                set('antidelete', cfg);
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI DELETE 〕\n║\n║ ▸ *Global* : ${enable ? '✅ Enabled for ALL chats' : '❌ Disabled globally'}\n║\n╚═╝`
                }, { quoted: msg });
            }

            cfg.chats = cfg.chats || {};
            if (!enable) {
                delete cfg.chats[chatId];
            } else {
                // arg1 may be 'chat' or 'owner' as the mode
                const mode = (arg1 === 'chat') ? 'chat' : 'owner';
                cfg.chats[chatId] = { enabled: true, mode };
            }
            set('antidelete', cfg);
            const newCfg = _chatCfg(cfg, chatId) || { enabled: false, mode: 'owner' };
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI DELETE 〕\n║\n` +
                      `║ ▸ *${chatLbl}* : ${enable ? '✅ Enabled' : '❌ Disabled'}\n` +
                      (enable ? `║ ▸ *Mode*      : ${newCfg.mode}\n` : '') +
                      `║ ▸ *Global*    : ${cfg.global ? '✅ ON' : '❌ OFF'}\n` +
                      `║\n╚═╝`
            }, { quoted: msg });
        }

        // ── mode ────────────────────────────────────────────────────────────
        if (action === 'mode' && arg1) {
            const mode = arg1 === 'chat' ? 'chat' : 'owner';
            cfg.chats = cfg.chats || {};
            const existing = _chatCfg(cfg, chatId) || { enabled: false, mode: 'owner' };
            cfg.chats[chatId] = { ...existing, mode };
            set('antidelete', cfg);
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI DELETE 〕\n║\n` +
                      `║ ▸ *Mode* : *${mode}* saved for this chat\n` +
                      `║ ▸ chat  = recover in same chat\n` +
                      `║ ▸ owner = forward to owner DM\n` +
                      `║\n╚═╝`
            }, { quoted: msg });
        }

        // ── unknown arg → ignore silently ────────────────────────────────────
        return;
    }
};
