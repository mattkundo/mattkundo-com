#!/usr/bin/env python3
"""One weekly market report in, one vertical social short out.

Reads the structured facts a report already contains and renders a 9:16 sequence.
Every number on screen comes from report.json, so the short cannot drift from the
article it repurposes. Swap the json, re-run, get next week's cut.
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
BG      = (11, 13, 16)
INK     = (245, 246, 248)
MUTED   = (138, 146, 158)
ACCENT  = (94, 200, 138)     # down / cheaper
WARN    = (232, 122, 96)     # up / costlier
RULE    = (34, 38, 44)

FONT = "/System/Library/Fonts/HelveticaNeue.ttc"
def f(size, idx=0):
    try: return ImageFont.truetype(FONT, size, index=idx)
    except Exception: return ImageFont.load_default()
BOLD, REG = 1, 0

def ease(t):                       # cubic ease-out
    return 1 - pow(1 - max(0.0, min(1.0, t)), 3)

def center(d, y, text, font, fill, spacing=12):
    lines = text.split("\n")
    for ln in lines:
        w = d.textbbox((0, 0), ln, font=font)[2]
        d.text(((W - w) / 2, y), ln, font=font, fill=fill)
        y += d.textbbox((0, 0), ln, font=font)[3] + spacing
    return y

def fade(img, a):
    if a >= 1.0: return img
    base = Image.new("RGB", (W, H), BG)
    return Image.blend(base, img, max(0.0, min(1.0, a)))

# ----------------------------------------------------------------- scenes
def scene_hook(d, p, r):
    a = ease(p * 3)
    center(d, 700, "The average Texas", f(96, BOLD), tuple(int(c*a) for c in INK))
    center(d, 820, "commercial electricity", f(96, BOLD), tuple(int(c*a) for c in INK))
    center(d, 940, "rate is", f(96, BOLD), tuple(int(c*a) for c in INK))
    if p > 0.35:
        b = ease((p - 0.35) * 3)
        val = r["avg_cents"] * b
        center(d, 1090, f"{val:.2f}¢", f(190, BOLD), ACCENT)
        center(d, 1310, "per kWh", f(52, REG), MUTED)

def scene_dont(d, p, r):
    a = ease(p * 4)
    center(d, 830, "Don't use it.", f(130, BOLD), tuple(int(c*a) for c in INK))
    if p > 0.4:
        b = ease((p - 0.4) * 2.5)
        center(d, 1010, "It's the wrong number", f(58, REG), tuple(int(c*b) for c in MUTED))
        center(d, 1085, "for what you'll actually pay.", f(58, REG), tuple(int(c*b) for c in MUTED))

def scene_gap(d, p, r):
    center(d, 380, "Average vs median", f(64, BOLD), INK)
    center(d, 470, f"{r['plans_tracked']:,} plans, {r['reps']} providers", f(42, REG), MUTED)
    x0, x1 = 150, W - 150
    for i, (label, val, col) in enumerate([
            ("AVERAGE", r["avg_cents"], WARN),
            ("MEDIAN",  r["median_cents"], ACCENT)]):
        y = 720 + i * 330
        b = ease((p - i * 0.22) * 2.2)
        if b <= 0: continue
        d.text((x0, y - 62), label, font=f(38, BOLD), fill=MUTED)
        full = (x1 - x0) * (val / 10.0)
        d.rounded_rectangle([x0, y, x0 + max(6, full * b), y + 76], 12, fill=col)
        d.text((x0, y + 100), f"{val * b:.2f}¢", font=f(78, BOLD), fill=INK)
    if p > 0.62:
        b = ease((p - 0.62) * 2.6)
        gap = r["avg_cents"] - r["median_cents"]
        d.line([(150, 1420), (W - 150, 1420)], fill=RULE, width=3)
        center(d, 1470, f"A {gap:.2f}¢ gap", f(70, BOLD), tuple(int(c*b) for c in INK))
        center(d, 1570, "A few high-priced month-to-month plans", f(44, REG), tuple(int(c*b) for c in MUTED))
        center(d, 1630, "drag the average up. The median is", f(44, REG), tuple(int(c*b) for c in MUTED))
        center(d, 1690, "closer to what you'd sign.", f(44, REG), tuple(int(c*b) for c in MUTED))

def scene_curve(d, p, r):
    center(d, 300, "Now the part that matters", f(64, BOLD), INK)
    center(d, 390, "Average rate by contract length", f(42, REG), MUTED)
    bands = r["term_curve"]
    lo = min(b["cents"] for b in bands)
    base_y, gap_y, barw = 640, 300, W - 300
    for i, b in enumerate(bands):
        y = base_y + i * gap_y
        t = ease((p - i * 0.16) * 2.4)
        if t <= 0: continue
        cheap = abs(b["cents"] - lo) < 1e-6
        col = ACCENT if cheap else (74, 80, 92)
        d.text((150, y - 58), b["band"].upper(), font=f(40, BOLD), fill=MUTED)
        d.text((W - 150 - d.textbbox((0,0), f"{b['plans']} plans", font=f(34, REG))[2], y - 54),
               f"{b['plans']} plans", font=f(34, REG), fill=(88, 94, 106))
        full = barw * (b["cents"] / 10.0)
        d.rounded_rectangle([150, y, 150 + max(6, full * t), y + 84], 12, fill=col)
        d.text((150, y + 106), f"{b['cents'] * t:.1f}¢", font=f(72, BOLD),
               fill=INK if cheap else MUTED)
    if p > 0.66:
        t = ease((p - 0.66) * 3)
        d.line([(150, 1600), (W - 150, 1600)], fill=RULE, width=3)
        center(d, 1650, "Locking longer is cheaper", f(72, BOLD), tuple(int(c*t) for c in ACCENT))
        center(d, 1750, "right now. That's backwards", f(46, REG), tuple(int(c*t) for c in MUTED))
        center(d, 1810, "from most years.", f(46, REG), tuple(int(c*t) for c in MUTED))

def scene_close(d, p, r):
    a = ease(p * 2.5)
    center(d, 620, "Week of", f(46, REG), tuple(int(c*a) for c in MUTED))
    center(d, 690, r["week"], f(62, BOLD), tuple(int(c*a) for c in INK))
    d.line([(300, 830), (W - 300, 830)], fill=RULE, width=3)
    center(d, 890, f"{r['repriced']} of {r['matched']} plans repriced.", f(56, REG), tuple(int(c*a) for c in INK))
    if p > 0.3:
        b = ease((p - 0.3) * 2.5)
        center(d, 990, "Every one moved down.", f(72, BOLD), tuple(int(c*b) for c in ACCENT))
    if p > 0.55:
        b = ease((p - 0.55) * 2.5)
        center(d, 1320, "texascommercialplans.com", f(56, BOLD), tuple(int(c*b) for c in INK))
        center(d, 1400, "Full report, free, every Monday", f(42, REG), tuple(int(c*b) for c in MUTED))

SCENES = [(scene_hook, 6.0), (scene_dont, 5.0), (scene_gap, 12.0),
          (scene_curve, 14.0), (scene_close, 8.0)]

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "frames"
    r = json.load(open(os.path.join(os.path.dirname(out) or ".", "report.json")))
    os.makedirs(out, exist_ok=True)
    n = 0
    for fn, secs in SCENES:
        total = int(secs * FPS)
        for i in range(total):
            p = i / total
            img = Image.new("RGB", (W, H), BG)
            d = ImageDraw.Draw(img)
            fn(d, p, r)
            # scene-level fade in/out
            a = 1.0
            if i < 8: a = i / 8
            if i > total - 9: a = (total - i) / 9
            img = fade(img, a)
            img.save(os.path.join(out, f"f{n:05d}.png"))
            n += 1
    dur = n / FPS
    print(f"rendered {n} frames = {dur:.1f}s at {FPS}fps into {out}")

main()
