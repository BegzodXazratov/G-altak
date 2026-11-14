// SH-chyot mantig'i js/shch-engine.js da (mijoz ham, server ham ishlatadi)
export { SECONDS, makeShch } from "../js/shch-engine.js";

export const makeKim = (b = {}) => { const mode = b.mode === "abc" ? "abc" : "num", len = Number(b.len) === 6 ? 6 : 5; return { phase: "setup", ready: {}, pref: {}, guesses: { p1: [], p2: [] }, turn: null, max: mode === "abc" ? 20 : 15, mode, len }; };
