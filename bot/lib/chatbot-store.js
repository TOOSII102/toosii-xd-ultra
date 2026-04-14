'use strict';
const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/chatbot.json');

function load() {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function save(d) {
    try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); } catch {}
}

function isEnabled(chatId) { return load()[chatId]?.enabled === true; }

function setEnabled(chatId, val) {
    const d = load();
    if (!d[chatId]) d[chatId] = {};
    d[chatId].enabled = !!val;
    save(d);
}

function listEnabled() {
    const d = load();
    return Object.keys(d).filter(k => d[k]?.enabled === true);
}

module.exports = { isEnabled, setEnabled, listEnabled };
