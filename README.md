# G'altak o'yinlari — Telegram Mini App

Uchta o'yin: **Shashka** (tezkor o'yin — tasodifiy raqib, do'st bilan havola orqali, kompyuter, bitta telefonda),
**So'z jangi** (10×10 harflar ichidan o'zbekcha so'zlarni raqibdan oldin topish, 3 daqiqa) va **2048**.
Akkaunt: ism + Telegram orqali telefon raqami. Onlayn o'yinlar Elo reytingiga ta'sir qiladi.

- Frontend: oddiy HTML/CSS/JS (`index.html`, `js/`, `css/`) — Vercel'da statik.
- Bot: `api/bot.js` (Vercel funksiyasi, webhook) — `/start` ga "O'ynash" tugmasi; `/start r_KOD` — shashka xonasiga taklif.
- `api/game.js` — barcha yozish amallari: Telegram `initData` imzosi tekshiriladi, keyin Supabase RPC server kaliti (`G_SERVER_KEY`) bilan chaqiriladi.
- Supabase: `g_players`, `g_stats` (reyting), `g_rooms` (onlayn xonalar).

## Ishga tushirish
1. @BotFather → `/newbot` → token.
2. Vercel → loyiha → Settings → Environment Variables:
   - `BOT_TOKEN` — bot tokeni
   - `WEBHOOK_SECRET`, `G_SERVER_KEY` — allaqachon qo'shilgan
3. Redeploy, keyin brauzerda bir marta oching: `https://<domen>/api/setup?key=<WEBHOOK_SECRET>`
4. Botga `/start` yozing.
