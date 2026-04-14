# TOOSII-XD ULTRA — WhatsApp Bot

> A powerful, free, open-source WhatsApp bot with 900+ commands — AI, games, utility, group management, media, and more.

---

## Features

- **Toosii AI** — AI chatbot powered by Pollinations (free, no API key needed)
- **900+ commands** across 15+ categories
- **Group management** — antilink, antispam, antidemote, welcome/goodbye, polls
- **Media tools** — stickers, image effects, TTS, video download, voice notes
- **Games & fun** — 8ball, truth or dare, ship, compliment, RPS, riddle
- **Search** — GitHub, news (8 topics), crypto prices, weather, recipes, Wikipedia
- **Utility** — calculator, translator, QR code, currency, horoscope, countdown
- **Owner tools** — broadcast, sudo users, mode switch, auto-update, eval
- **Automation** — auto-read, auto-react, anti-delete, anti-view-once, auto-status

---

## Quick Setup

### 1. Get your Session ID
Visit the session generator and pair your WhatsApp number:
**https://toosiitechdevelopertools.zone.id/session**

### 2. Clone the repo
```bash
git clone https://github.com/TOOSII102/toosii-xd-ultra.git
cd toosii-xd-ultra/bot
```

### 3. Configure
```bash
cp .env.example .env
```
Open `.env` and fill in at minimum:
```env
SESSION_ID=your_session_id_here
OWNER_NUMBER=254712345678
```

### 4. Install and run
```bash
npm install
node index.js
```

---

## Deploy to Heroku

1. Fork this repo
2. Create a new Heroku app
3. Connect to GitHub → select the **`heroku` branch**
4. Add Config Vars (Settings tab):

| Key | Value |
|---|---|
| `SESSION_ID` | Your session ID from the generator |
| `OWNER_NUMBER` | Your number (no + or spaces) |
| `PREFIX` | `,` |
| `BOT_NAME` | `TOOSII-XD` |

5. Deploy Branch → done

> The `heroku` branch has bot files at root — no pnpm workspace, no build steps needed.

---

## Deploy to Koyeb / Railway

Same process — connect GitHub to the **`heroku` branch**, set the same 4 environment variables.

> Works on any container-based platform. Does NOT work on Vercel, Netlify, or other serverless platforms.

---

## Commands (sample)

| Command | Description |
|---|---|
| `,menu` | Full command list |
| `,ai <question>` | Chat with Toosii AI |
| `,sticker` | Convert image/video to sticker |
| `,weather <city>` | Current weather |
| `,crypto <coin>` | Crypto price |
| `,play <song>` | Download YouTube audio |
| `,github <user>` | GitHub profile info |
| `,news <topic>` | Latest news (world/tech/sport/health…) |
| `,tts <text>` | Text to speech |
| `,8ball <question>` | Magic 8-ball |
| `,translate <text>` | Auto-detect & translate |
| `,recipe <dish>` | Recipe search |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SESSION_ID` | ✅ | — | From session generator |
| `OWNER_NUMBER` | ✅ | — | Your WhatsApp number |
| `PREFIX` | no | `,` | Command prefix |
| `BOT_NAME` | no | `TOOSII-XD` | Bot display name |
| `MODE` | no | `public` | `public` or `private` |
| `TIME_ZONE` | no | `Africa/Nairobi` | Timezone |
| `OPENAI_API_KEY` | no | — | For OpenAI chatbot (Pollinations is free fallback) |
| `WEATHER_API_KEY` | no | — | OpenWeatherMap (free tier available) |

---

## Branches

| Branch | Purpose |
|---|---|
| `main` | Development — monorepo structure |
| `heroku` | Deploy-ready — bot files at root, no workspace files |

---

## Stack

- **WhatsApp**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) v7
- **Runtime**: Node.js 20.x
- **AI**: Pollinations.ai (free), OpenAI (optional), Gemini (optional)
- **APIs**: CoinGecko, BBC RSS, OpenWeatherMap, GitHub, TheMealDB, Wikipedia

---

## License

MIT — free to use, modify, and distribute.
