# G'altak o'yinlari — Telegram Mini App

Uchta o'yin: **Shashka** (kompyuterga qarshi 3 darajada, bitta telefonda yoki do'st bilan onlayn — havola orqali),
**2048** va **Rost yoki jur'at** (do'stlar / juftlik / oila davrasi).

- Frontend: oddiy HTML/CSS/JS (`index.html`, `js/`, `css/`) — Vercel'da statik.
- Bot: `api/bot.js` (Vercel funksiyasi, webhook) — `/start` ga "O'ynash" tugmasi; `/start r_KOD` — shashka xonasiga taklif.
- Onlayn xonalar: Supabase `g_rooms` jadvali + `g_room_*` RPC'lar.

## Ishga tushirish
1. @BotFather → `/newbot` → token.
2. Vercel → loyiha → Settings → Environment Variables:
   - `BOT_TOKEN` — bot tokeni
   - `WEBHOOK_SECRET` — o'zingiz o'ylab topgan uzun so'z (faqat harf/raqam)
3. Redeploy, keyin brauzerda bir marta oching: `https://<domen>/api/setup?key=<WEBHOOK_SECRET>`
4. Botga `/start` yozing.
