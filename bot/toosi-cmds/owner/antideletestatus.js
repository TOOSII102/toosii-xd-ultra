const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { get, toggle }          = require('../../lib/autoconfig');
const { getBotName }           = require('../../lib/botname');
const config                   = require('../../config');

const _store   = new Map();
const MAX_MSGS = 200;
let   _sock    = null;
let   _resolveLid = null;

function _addToStore(msg) {
    if (!msg?.key?.id || !msg.message) return;
    _store.set(msg.key.id, { msg, at: Date.now() });
    if (_store.size > MAX_MSGS) {
        const first = _store.keys().next().value;
        _store.delete(first);
    }
}

function _resolveNum(jid) {
    if (!jid) return null;
    const raw = jid.split('@')[0].split(':')[0];
    if (jid.includes('@lid') && _resolveLid) {
        const resolved = _resolveLid(jid);
        if (resolved && resolved !== raw) return resolved;
    }
    return raw;
}

function initStatusAntidelete(sock, resolveLidFn) {
    _sock = sock;
    if (resolveLidFn) _resolveLid = resolveLidFn;
    return Promise.resolve();
}

async function statusAntideleteStoreMessage(msg) {
    if (msg?.message) _addToStore(msg);
}

async function statusAntideleteHandleUpdate(update) {
    try {
        const cfg = get('antideletestatus');
        if (!cfg?.enabled) return;
        if (!_sock) return;

        const key  = update?.key;
        if (!key?.id) return;

        const cached = _store.get(key.id);
        if (!cached) return;
        _store.delete(key.id);

        const { msg } = cached;
        const ownerJid = `${(config.OWNER_NUMBER || '').replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        if (!ownerJid || ownerJid === '@s.whatsapp.net') return;

        const senderJid = msg.key.participant || msg.key.remoteJid || '';
        const sender    = _resolveNum(senderJid) || senderJid.split('@')[0].split(':')[0] || 'Unknown';

        const deletedByJid = update?.key?.participant || update?.key?.fromMe ? senderJid : senderJid;
        const deletedBy    = _resolveNum(deletedByJid) || sender;

        const header =
            `╔═|〔  STATUS RECOVERED 〕\n║\n` +
            `║ ▸ *Posted By*  : +${sender}\n` +
            `║ ▸ *Deleted By* : +${deletedBy}\n` +
            `║\n╚═╝`;

        const content = msg.message?.ephemeralMessage?.message || msg.message;
        const text    = content?.conversation || content?.extendedTextMessage?.text;
        if (text) { await _sock.sendMessage(ownerJid, { text: `${header}\n\n${text}` }); return; }

        const hasMedia = content?.imageMessage || content?.videoMessage || content?.audioMessage;
        if (hasMedia) {
            try {
                const synth = { key: msg.key, message: content };
                const buf   = await downloadMediaMessage(synth, 'buffer', {});
                if (content?.imageMessage)  await _sock.sendMessage(ownerJid, { image: buf, caption: header });
                else if (content?.videoMessage) await _sock.sendMessage(ownerJid, { video: buf, caption: header });
                else if (content?.audioMessage) await _sock.sendMessage(ownerJid, { audio: buf, mimetype: content.audioMessage.mimetype || 'audio/ogg; codecs=opus' });
            } catch { await _sock.sendMessage(ownerJid, { text: header + '\n\n[Status media could not be recovered]' }); }
            return;
        }
        await _sock.sendMessage(ownerJid, { text: header + '\n\n[Status deleted]' });
    } catch {}
}

function updateStatusAntideleteSock(sock, resolveLidFn) {
    _sock = sock;
    if (resolveLidFn) _resolveLid = resolveLidFn;
}

module.exports = {
    initStatusAntidelete,
    statusAntideleteStoreMessage,
    statusAntideleteHandleUpdate,
    updateStatusAntideleteSock,

    name:        'antideletestatus',
    aliases:     ['ads2', 'antistatusdelete'],
    description: 'Recover deleted WhatsApp statuses',
    category:    'owner',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '📋', key: msg.key } }); } catch {}
        const name   = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, { text: `╔═|〔  ANTI DELETE STATUS 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═╝` }, { quoted: msg });
        }

        const now = toggle('antideletestatus');
        return sock.sendMessage(chatId, {
            text: `╔═|〔  ANTI DELETE STATUS 〕\n║\n║ ▸ *State*  : ${now ? '✅ Enabled' : '❌ Disabled'}\n║ ▸ *Note*   : Deleted statuses sent to your DM\n║\n╚═╝`
        }, { quoted: msg });
    }
};
