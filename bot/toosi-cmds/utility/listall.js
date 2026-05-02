'use strict';

const {
  resolveDisplayWithName
} = require("../../lib/groupUtils");
const {
  getBotName
} = require("../../lib/botname");
module.exports = {
  name: "listall",
  aliases: ["memberlist", "listmembers", "members", "la"],
  description: "List all members in the group with their names — .listall",
  category: "group",
  async execute(_0x4d4e4a, _0x1ac894, _0x29cc82, _0x227c35) {
    const _0x2b28b7 = _0x1ac894.key.remoteJid;
    const _0xc3f06c = getBotName();
    try {
      await _0x4d4e4a.sendMessage(_0x2b28b7, {
        react: {
          text: "📋",
          key: _0x1ac894.key
        }
      });
    } catch {}
    if (!_0x2b28b7.endsWith("@g.us")) {
      return _0x4d4e4a.sendMessage(_0x2b28b7, {
        text: "╔═|〔  📋 MEMBER LIST 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═|〔 " + _0xc3f06c + " 〕"
      }, {
        quoted: _0x1ac894
      });
    }
    try {
      const _0x30bd2d = await _0x4d4e4a.groupMetadata(_0x2b28b7);
      const _0x55a0da = _0x30bd2d.participants;
      const _0x28dcd2 = _0x55a0da.length;
      const _0x580e70 = _0x55a0da.filter(_0x573380 => _0x573380.admin).length;
      const _0x2aeaa3 = await Promise.all(_0x55a0da.map(async (_0x2067bc, _0x267c62) => {
        const _0x19042a = await resolveDisplayWithName(_0x4d4e4a, _0x2b28b7, _0x2067bc.id || "", _0x2067bc.notify || null).catch(() => (_0x2067bc.id || "").split("@")[0].split(":")[0] || "Unknown");
        const _0x2f4082 = _0x2067bc.admin === "superadmin" ? "👑" : _0x2067bc.admin === "admin" ? "⭐" : "👤";
        return {
          i: _0x267c62 + 1,
          badge: _0x2f4082,
          display: _0x19042a
        };
      }));
      _0x2aeaa3.sort((_0x274cf4, _0x10573b) => {
        const _0x15907c = _0xbb8eb2 => _0xbb8eb2.badge === "👑" ? 0 : _0xbb8eb2.badge === "⭐" ? 1 : 2;
        return _0x15907c(_0x274cf4) - _0x15907c(_0x10573b) || _0x274cf4.display.localeCompare(_0x10573b.display);
      });
      _0x2aeaa3.forEach((_0x244e60, _0x2096bd) => {
        _0x244e60.i = _0x2096bd + 1;
      });
      const _0x121f9a = ["╔═|〔  📋 MEMBER LIST 〕", "║", "║ ▸ *Group*   : " + _0x30bd2d.subject, "║ ▸ *Members* : " + _0x28dcd2 + "  (👑⭐ Admins: " + _0x580e70 + ")", "║"];
      const _0xb51565 = _0x2aeaa3.map(_0x469fb9 => "║  " + _0x469fb9.i.toString().padStart(3, " ") + ". " + _0x469fb9.badge + " " + _0x469fb9.display);
      const _0xb328fb = ["║", "║ 👑 = Owner  ⭐ = Admin  👤 = Member", "║", "╚═|〔 " + _0xc3f06c + " 〕"];
      const _0x39a9bb = [..._0x121f9a, ..._0xb51565, ..._0xb328fb];
      const _0x37eea9 = _0x39a9bb.join("\n");
      if (_0x37eea9.length <= 4000) {
        return _0x4d4e4a.sendMessage(_0x2b28b7, {
          text: _0x37eea9
        }, {
          quoted: _0x1ac894
        });
      }
      const _0x3899f0 = 3600;
      let _0x232596 = _0x121f9a.join("\n") + "\n";
      let _0x8edd18 = 1;
      let _0x13df82 = true;
      for (const _0x527aca of _0xb51565) {
        if ((_0x232596 + _0x527aca + "\n").length > _0x3899f0) {
          await _0x4d4e4a.sendMessage(_0x2b28b7, {
            text: _0x232596.trim()
          }, _0x13df82 ? {
            quoted: _0x1ac894
          } : {});
          _0x13df82 = false;
          _0x232596 = "╔═|〔  📋 MEMBER LIST — part " + ++_0x8edd18 + " 〕\n║\n";
          await new Promise(_0x5aa855 => setTimeout(_0x5aa855, 700));
        }
        _0x232596 += _0x527aca + "\n";
      }
      _0x232596 += _0xb328fb.join("\n");
      await _0x4d4e4a.sendMessage(_0x2b28b7, {
        text: _0x232596.trim()
      }, _0x13df82 ? {
        quoted: _0x1ac894
      } : {});
    } catch (_0x4a9fb6) {
      await _0x4d4e4a.sendMessage(_0x2b28b7, {
        text: "╔═|〔  📋 MEMBER LIST 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : " + _0x4a9fb6.message + "\n║\n╚═|〔 " + _0xc3f06c + " 〕"
      }, {
        quoted: _0x1ac894
      });
    }
  }
};