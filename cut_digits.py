#!/usr/bin/env python3
"""Cut digit sprites from sprite sheet with transparent backgrounds."""
from PIL import Image
from collections import deque

SHEET = "/home/ubuntu/.hermes/image_cache/img_32b36293b99d.jpg"
OUT_DIR = "/home/ubuntu/tebu/public/game/timer/digits"
PAD = 10
THRESH = 180  # brightness threshold for "background"

img = Image.open(SHEET).convert("RGBA")
w, h = img.size
pixels = img.load()

# Find bounding boxes: non-light-gray columns (brightness < 200)
col_has_dark = []
for x in range(w):
    dark = False
    for y in range(h):
        r, g, b = pixels[x, y][:3]
        if max(r, g, b) < 200:
            dark = True
            break
    col_has_dark.append(dark)

# Split into digit regions
digits = []
in_digit = False
start = 0
for x in range(w):
    if col_has_dark[x] and not in_digit:
        start = x
        in_digit = True
    elif not col_has_dark[x] and in_digit:
        digits.append((start, x))
        in_digit = False
if in_digit:
    digits.append((start, w))

print(f"Found {len(digits)} digit regions")

for idx, (x1, x2) in enumerate(digits[:10]):
    # Tight bbox
    min_x, max_x = w, 0
    min_y, max_y = h, 0
    for x in range(x1, x2):
        for y in range(h):
            if max(pixels[x, y][:3]) < 200:
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)

    px1 = max(0, min_x - PAD)
    py1 = max(0, min_y - PAD)
    px2 = min(w, max_x + PAD + 1)
    py2 = min(h, max_y + PAD + 1)

    crop = img.crop((px1, py1, px2, py2))
    cw, ch = crop.size
    cpix = crop.load()

    # BFS flood fill from edges for edge-connected background
    visited = set()
    q = deque()
    for x in range(cw):
        for y in [0, ch - 1]:
            if max(cpix[x, y][:3]) >= THRESH:
                q.append((x, y)); visited.add((x, y))
    for y in range(ch):
        for x in [0, cw - 1]:
            if max(cpix[x, y][:3]) >= THRESH and (x, y) not in visited:
                q.append((x, y)); visited.add((x, y))
    while q:
        cx, cy = q.popleft()
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = cx+dx, cy+dy
            if 0<=nx<cw and 0<=ny<ch and (nx,ny) not in visited:
                if max(cpix[nx,ny][:3]) >= THRESH:
                    visited.add((nx,ny)); q.append((nx,ny))

    # Apply transparency: BFS-visited + any remaining bright pixels (enclosed holes)
    for x in range(cw):
        for y in range(ch):
            r, g, b, a = cpix[x, y]
            if (x, y) in visited or max(r, g, b) >= THRESH:
                cpix[x, y] = (r, g, b, 0)
            else:
                cpix[x, y] = (r, g, b, 255)

    out = f"{OUT_DIR}/{idx}.png"
    crop.save(out)
    t_count = sum(1 for x in range(cw) for y in range(ch) if cpix[x,y][3]==0)
    print(f"Digit {idx}: {cw}x{ch}, transparent: {t_count}/{cw*ch}")

print("Done!")
