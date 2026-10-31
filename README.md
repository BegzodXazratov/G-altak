# G'altak o'yinlari — Telegram Mini App

Uchta 1 vs 1 o'yin: **Shashka** (tasodifiy raqib, do'st, kompyuter, bitta telefon), **Topqir** (9×9 harflardan
istalgan o'zbekcha so'zni chizish, 1 daqiqa) va **Gugurt** (bitta cho'pni ko'chirib tenglamani to'g'rilash, 1 daqiqada kim ko'p).

- Akkaunt: ism + telefon (bot chatidagi standart «📱 Raqamni yuborish» tugmasi orqali).
- Ball: 0–100. G'alaba +1, mag'lubiyat −1 (0 dan pastga tushmaydi), durang 0. 100 ballda yutsangiz — «Siz chempionsiz!».
- `api/game.js` — barcha yozish amallari: Telegram `initData` imzosi tekshiriladi, keyin Supabase RPC server kaliti (`G_SERVER_KEY`) bilan.
- `admin.html` — ro'yxatdan o'tganlar (parol: Vercel'dagi `ADMIN_PASSWORD`).
- Supabase: `g_players`, `g_stats`, `g_rooms`.

## Ishga tushirish
1. @BotFather → `/newbot` → token.
2. Vercel → loyiha → Settings → Environment Variables:
   - `BOT_TOKEN` — bot tokeni
   - `WEBHOOK_SECRET`, `G_SERVER_KEY` — allaqachon qo'shilgan
3. Redeploy, keyin brauzerda bir marta oching: `https://<domen>/api/setup?key=<WEBHOOK_SECRET>`
4. Botga `/start` yozing.
