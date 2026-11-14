#!/usr/bin/env python3
"""Molekula uchun harf to'plamlarini lug'atdan (data/words.json) yaratadi -> data/molekula.json

To'plam: markaziy harf + 6 ta atrof harf (jami 7 ta turli harf; O' va G' bitta harf).
So'z: kamida 2 harf, faqat shu 7 harfdan (takrorlash mumkin), markaziy harfni o'z ichiga oladi.
Ko'plik (-LAR) ham hisoblanadi (o'yin ichida ham shunday).
Ishga tushirish:  python3 tools/gen_molekula.py
"""
import json, re, random, itertools, sys
import numpy as np

random.seed(20261114)
WORDS = json.load(open("data/words.json", encoding="utf-8"))
TOK = re.compile(r"[OG]'|[A-Z]")
LETTERS = ["A","B","D","E","F","G","G'","H","I","J","K","L","M","N","O","O'","P","Q","R","S","T","U","V","X","Y","Z","C"]
IDX = {t: i for i, t in enumerate(LETTERS)}
VOW = {"A","E","I","O","U","O'"}

def toks(w): return TOK.findall(w)

# lug'at (+ko'plik): so'z -> token mask
base = set(WORDS)
valid = set(base)
for w in base:
    if len(w) >= 2: valid.add(w + "LAR")          # ko'plik: KITOB -> KITOBLAR (o'yin ichidagi isWord bilan bir xil emas, pastga qarang)
# o'yin ichidagi qoida: w LAR bilan tugasa, uzunligi >= 5 va w[:-3] lug'atda bo'lsa. Shuni aynan takrorlaymiz:
valid = set(base) | {w + "LAR" for w in base if len(w + "LAR") >= 5}

masks, cents = [], []
allw = []
for w in valid:
    t = toks(w)
    if len(t) < 2 or "".join(t) != w: continue
    m = 0
    for x in t:
        if x not in IDX: break
        m |= 1 << IDX[x]
    else:
        allw.append(w); masks.append(m)
masks = np.array(masks, dtype=np.uint32)
print("so'zlar:", len(allw), file=sys.stderr)

def popc(x): return bin(x).count("1")

# nomzod to'plamlar: 4..7 turli harfli so'zlar maskasi + qo'shimcha harflar
from collections import Counter
cnt = Counter(int(m) for m in masks)
freq_letters = [IDX[x] for x in ["A","I","O","R","L","S","T","M","N","H","Q","K","U","Y","B","D","E","G","Z"]]
cands = set()
for m in cnt:
    k = popc(m)
    if k == 7: cands.add(m)
    elif k in (5, 6):
        need = 7 - k
        free = [i for i in freq_letters if not (m >> i) & 1]
        for extra in itertools.combinations(free, need):
            mm = m
            for e in extra: mm |= 1 << e
            cands.add(mm)
print("nomzodlar:", len(cands), file=sys.stderr)

vmask = sum(1 << IDX[v] for v in VOW)
good = []
for S in cands:
    nv = popc(S & vmask)
    if nv < 2 or nv > 4: continue
    if (S >> IDX["C"]) & 1 and not (S >> IDX["H"]) & 1: continue   # C faqat CH bilan ma'noli                         # kamida 2 unli, 3 undosh bo'lsin
    inside = masks[(masks & np.uint32(~S & 0xFFFFFFFF)) == 0]
    if len(inside) < 50: continue
    bits = [i for i in range(len(LETTERS)) if (S >> i) & 1]
    per = {i: int(((inside >> np.uint32(i)) & np.uint32(1)).sum()) for i in bits}
    good.append((S, bits, per, len(inside)))
print("yaxshi to'plamlar:", len(good), file=sys.stderr)

# har to'plamdan bittadan unli va bittadan undosh markazli variant (30..260 ta so'z oralig'ida)
puzzles = []
for S, bits, per, tot in good:
    for want_vowel in (True, False):
        opts = [i for i in bits if ((LETTERS[i] in VOW) == want_vowel) and 32 <= per[i] <= 300]
        if not opts: continue
        c = random.choice(opts)
        puzzles.append((S, c, per[c]))
random.shuffle(puzzles)

# bir xil to'plam (turli markaz) ko'p takrorlanmasin; harf kombinatsiyalarini aralashtirib tanlaymiz
seen_sets = Counter(); out = []
for S, c, n in puzzles:
    if seen_sets[S] >= 2: continue
    seen_sets[S] += 1
    out.append((S, c, n))
print("jami:", len(out), file=sys.stderr)

TARGET = 2400
random.shuffle(out)
out = out[:TARGET]
res = []
for S, c, n in out:
    others = [LETTERS[i] for i in range(len(LETTERS)) if (S >> i) & 1 and i != c]
    random.shuffle(others)
    res.append([LETTERS[c], others, n])
res.sort(key=lambda r: r[2])
json.dump(res, open("data/molekula.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
vc = sum(1 for r in res if r[0] in VOW)
print(f"yozildi: {len(res)} ta to'plam ({vc} unli markaz, {len(res)-vc} undosh markaz); so'z soni min/med/max:",
      res[0][2], res[len(res)//2][2], res[-1][2], file=sys.stderr)
