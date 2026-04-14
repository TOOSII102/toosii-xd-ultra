
<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,5,30&height=120&section=header&text=TOOSII-XD%20ULTRA&fontSize=42&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=WhatsApp%20Bot%20v1.2.0&descAlignY=60&descSize=18" width="100%"/>

<img src="https://img.shields.io/badge/version-1.2.0-blueviolet?style=for-the-badge&logo=whatsapp&logoColor=white"/>
<img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/Commands-947+-25D366?style=for-the-badge&logo=whatsapp&logoColor=white"/>
<img src="https://img.shields.io/badge/Made%20by-TOOSII%20TECH-FF6B6B?style=for-the-badge"/>
<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge"/>

❤️🧡💛💚💙💜🤍💗❤️🧡💛💚💙💜🤍💗❤️🧡💛💚💙💜🤍💗❤️🧡💛💚💙💜

**A powerful, free, open-source WhatsApp bot with 947+ commands**
*AI · Games · Utility · Group Management · Media · Search · and more*

🔴🟠🟡🟢🔵🟣🔴🟠🟡🟢🔵🟣🔴🟠🟡🟢🔵🟣🔴🟠🟡🟢🔵🟣🔴🟠🟡🟢🔵🟣

</div>

<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=4" width="100%"/>

## ⚡ Features

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   🤖  Toosii AI        Free AI chatbot — no API key needed         │
│   🎮  Games & Fun      8ball, truth/dare, ship, RPS, riddles       │
│   👥  Group Tools      Antilink, antispam, welcome, polls          │
│   🎵  Media            Stickers, TTS, video/audio download         │
│   🔍  Search           GitHub, news, crypto, weather, recipes      │
│   🛠️  Utility          Calculator, translator, QR, currency        │
│   👑  Owner Tools      Broadcast, sudo users, eval, auto-update    │
│   🤖  Automation       Auto-read, anti-delete, auto-react          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

💫⭐🌟✨💫⭐🌟✨💫⭐🌟✨💫⭐🌟✨💫⭐🌟✨💫⭐🌟✨💫⭐🌟✨💫⭐🌟✨

## 🚀 Quick Setup

### ◈ Step 1 — Get your Session ID

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌐  https://toosiitechdevelopertools.zone.id/session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Pair your WhatsApp number and copy the `SESSION_ID` shown.

### ◈ Step 2 — Clone & configure

```bash
git clone https://github.com/TOOSII102/toosii-xd-ultra.git
cd toosii-xd-ultra/bot
cp .env.example .env
```

Open `.env` and fill in:

```env
SESSION_ID=your_session_id_here
OWNER_NUMBER=254712345678
```

### ◈ Step 3 — Install & run

```bash
npm install
node index.js
```

🔥❤️🔥🧡🔥💛🔥💚🔥💙🔥💜🔥❤️🔥🧡🔥💛🔥💚🔥💙🔥💜🔥❤️🔥🧡🔥💛🔥

<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=6,11,20&height=4" width="100%"/>

## ☁️ Deploy to Heroku

```
┌─────────────────────────────────────────────────────┐
│  1. Fork this repo                                  │
│  2. Create a new Heroku app                         │
│  3. Connect GitHub → select the "heroku" branch     │
│  4. Set Config Vars (below)                         │
│  5. Click Deploy Branch — done ✅                   │
└─────────────────────────────────────────────────────┘
```

**Required Config Vars:**

| Key | Value |
|:---|:---|
| `SESSION_ID` | Your session from the generator |
| `OWNER_NUMBER` | Your number (no `+` or spaces) |
| `PREFIX` | `,` |
| `BOT_NAME` | `TOOSII-XD` |

> ✅ Also works on **Koyeb**, **Railway**, and **Render** — same steps, same env vars.
>
> ❌ Does **not** work on Vercel, Netlify, or serverless platforms.

🌸💜🌸💙🌸💚🌸💛🌸🧡🌸❤️🌸💜🌸💙🌸💚🌸💛🌸🧡🌸❤️🌸💜🌸💙🌸💚🌸

<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=12,20,2,5&height=4" width="100%"/>

## 🔑 Environment Variables

```
┌──────────────────┬──────────────┬───────────────────────────────────────┐
│ Variable         │ Required     │ Description                           │
├──────────────────┼──────────────┼───────────────────────────────────────┤
│ SESSION_ID       │ ✅ Yes       │ From session generator                │
│ OWNER_NUMBER     │ ✅ Yes       │ Your WhatsApp number                  │
│ PREFIX           │ optional     │ Command prefix (default: ,)           │
│ BOT_NAME         │ optional     │ Bot display name                      │
│ MODE             │ optional     │ public or private                     │
│ TIME_ZONE        │ optional     │ e.g. Africa/Nairobi                   │
│ OPENAI_API_KEY   │ optional     │ OpenAI (free fallback available)      │
│ WEATHER_API_KEY  │ optional     │ OpenWeatherMap free tier              │
│ NEWSAPI_API_KEY  │ optional     │ NewsAPI free tier                     │
└──────────────────┴──────────────┴───────────────────────────────────────┘
```

✨🌈🔴🌈🟠🌈🟡🌈🟢🌈🔵🌈🟣🌈✨🌈🔴🌈🟠🌈🟡🌈🟢🌈🔵🌈🟣🌈✨🌈

<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=2,5,30,11&height=4" width="100%"/>

## 📋 Command Highlights

```
 ╭──────────────────────────────────────────────────────╮
 │  ,menu             →  Full command list              │
 │  ,ai  <question>   →  Chat with Toosii AI            │
 │  ,sticker          →  Image/video to sticker         │
 │  ,play  <song>     →  YouTube audio download         │
 │  ,weather  <city>  →  Current weather                │
 │  ,crypto  <coin>   →  Live crypto price              │
 │  ,github  <user>   →  GitHub profile                 │
 │  ,news  <topic>    →  Latest news headlines          │
 │  ,tts  <text>      →  Text to speech                 │
 │  ,translate  <text>→  Auto-detect & translate        │
 │  ,8ball  <q>       →  Magic 8-ball                   │
 │  ,tod              →  Truth or dare                  │
 │  ,recipe  <dish>   →  Recipe search                  │
 │  ,riddle           →  Random riddle                  │
 │  ,qr  <text>       →  Generate QR code               │
 ╰──────────────────────────────────────────────────────╯
```

💎🔷💜🔶💎🔷💙🔶💎🔷💚🔶💎🔷💛🔶💎🔷🧡🔶💎🔷❤️🔶💎🔷💜🔷💎

<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=4" width="100%"/>

## 🌿 Branches

| Branch | Purpose |
|:---|:---|
| `main` | Development branch — monorepo |
| `heroku` | Deploy-ready — bot files at root, no build steps |

🌟⭐💫✨🌟⭐💫✨🌟⭐💫✨🌟⭐💫✨🌟⭐💫✨🌟⭐💫✨🌟⭐💫✨🌟⭐💫

<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=6,12,20,2&height=4" width="100%"/>

## ⚙️ Built With

```
  ◆  @whiskeysockets/baileys v7   —  WhatsApp Web API
  ◆  Node.js 20.x                —  Runtime
  ◆  Pollinations AI             —  Free AI (no key needed)
  ◆  CoinGecko API               —  Crypto prices (free)
  ◆  OpenWeatherMap              —  Weather (free tier)
  ◆  BBC RSS                     —  News feeds (free)
  ◆  TheMealDB                   —  Recipe search (free)
  ◆  GitHub API                  —  Developer search (free)
```

🔴🌟🟠⭐🟡💫🟢✨🔵🌟🟣⭐🔴💫🟠✨🟡🌟🟢⭐🔵💫🟣✨🔴🌟🟠⭐🟡💫🟢

<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=4" width="100%"/>

<div align="center">

```
  ✦ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ✦
  │                                                                │
  │               Crafted with ❤️  by  TOOSII TECH                │
  │                                                                │
  ✦ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ✦
```

### 📬 Contact & Support

[![Telegram](https://img.shields.io/badge/Telegram-%40toosiitech-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/toosiitech)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Chat%20Us-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/254746677793)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Chat%20Us-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/254748340864)
[![Session Generator](https://img.shields.io/badge/Session-Get%20Session%20ID-FF6B6B?style=for-the-badge&logo=whatsapp&logoColor=white)](https://toosiitechdevelopertools.zone.id/session)

❤️🧡💛💚💙💜🤍💗❤️🧡💛💚💙💜🤍💗❤️🧡💛💚💙💜🤍💗❤️🧡💛💚💙💜

**⭐ Star this repo if you find it useful — it means a lot!**

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,5,30&height=80&section=footer" width="100%"/>

</div>
