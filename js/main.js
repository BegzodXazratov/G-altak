import { app, setupTelegram, show, startParam } from "./core.js";
import { shashkaMenu, joinRoom } from "./shashka.js";
import { game2048 } from "./g2048.js";
import { rostMenu } from "./rost.js";

setupTelegram();

const menu = {
  render() {
    app().innerHTML = `
      <section class="hero">
        <h1>G'altak <span>o'yinlari</span></h1>
        <p>Yolg'iz, do'st bilan yoki davrada — bittasini tanlang.</p>
      </section>
      <div class="games">
        <button class="game g-shashka" data-go="shashka">
          <span class="tag">Yolg'iz · Do'st bilan</span>
          <h2>Shashka</h2><p>Kompyuterga qarshi yoki do'stingizni havola bilan chaqiring</p>
          <span class="art" aria-hidden="true">⚫</span>
        </button>
        <button class="game g-2048" data-go="2048">
          <span class="tag">Yolg'iz</span>
          <h2>2048</h2><p>Kataklarni surib, raqamlarni qo'shing. Rekordingizni yangilang</p>
          <span class="art" aria-hidden="true">🔢</span>
        </button>
        <button class="game g-rost" data-go="rost">
          <span class="tag">Davra · 2–8 kishi</span>
          <h2>Rost yoki jur'at</h2><p>Do'stlar, juftlik yoki oila davrasi uchun savol va topshiriqlar</p>
          <span class="art" aria-hidden="true">🎲</span>
        </button>
      </div>`;
    app().querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
      const g = b.dataset.go;
      if (g === "shashka") show(shashkaMenu());
      if (g === "2048") show(game2048());
      if (g === "rost") show(rostMenu());
    });
  },
};

show(menu, false);
const room = startParam();
if (room) joinRoom(room);
