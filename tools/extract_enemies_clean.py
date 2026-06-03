"""Re-extract enemy sprites with label text excluded (fixes flicker)."""
import sys
from collections import deque
from pathlib import Path
from PIL import Image

TOOLS = Path(__file__).parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))
from segment import transparent, tighten_v

OUT = ROOT / "assets" / "sprites"
im = Image.open(ROOT / "assets" / "source" / "enemies.png").convert("RGB")


def remove_small_blobs(img, min_size=45):
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img = img.copy()
    px = img.load()
    w, h = img.size
    seen = [[False] * h for _ in range(w)]
    for sx in range(w):
        for sy in range(h):
            if seen[sx][sy] or px[sx, sy][3] <= 50:
                continue
            q = deque([(sx, sy)])
            seen[sx][sy] = True
            comp = []
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny] and px[nx, ny][3] > 50:
                        seen[nx][ny] = True
                        q.append((nx, ny))
            if len(comp) < min_size:
                for x, y in comp:
                    px[x, y] = (0, 0, 0, 0)
    return img


def grab(name, x0, x1, y0, y1):
    ty, by = tighten_v(im, x0, x1, y0, y1, thresh=30, min_pix=3, pad=2)
    img = transparent(im, (x0, ty, x1, by), 28)
    img = remove_small_blobs(img, 45)
    # trim transparent margins
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(OUT / f"{name}.png")
    print(f"  {name}.png  {img.size}")


# UPPER band: sprite body y = 205..405 (labels at y<200 excluded)
UY0, UY1 = 205, 405
grab("enemy_zombie_0",   66, 160, UY0, UY1)
grab("enemy_zombie_1",  205, 292, UY0, UY1)
grab("enemy_devil_0",   378, 492, UY0, UY1)   # NOTE: devil_0/1 split below
grab("enemy_devil_1",   515, 651, UY0, UY1)
grab("enemy_dracula_0", 690, 805, UY0, UY1)
grab("enemy_dracula_1", 825, 950, UY0, UY1)
grab("enemy_dracula_2", 985, 1130, UY0, UY1)
grab("enemy_bat_0",    1200, 1300, UY0, UY1)
grab("enemy_bat_1",    1320, 1450, UY0, UY1)
grab("enemy_dragon_0", 1450, 1625, UY0, UY1)
grab("enemy_dragon_1", 1635, 1812, UY0, UY1)
grab("enemy_dragon_2", 1818, 1998, UY0, UY1)

# MID band: sprite body y = 520..695 (labels at y 425..515 excluded)
MY0, MY1 = 520, 695
grab("enemy_skeleton_0",  60, 162, MY0, MY1)
grab("enemy_skeleton_1", 205, 300, MY0, MY1)
grab("enemy_ghost_0",    305, 440, MY0, MY1)
grab("enemy_ghost_1",    440, 575, MY0, MY1)
grab("enemy_werewolf_0", 550, 718, MY0, MY1)
grab("enemy_werewolf_1", 718, 885, MY0, MY1)
grab("enemy_gargoyle_0", 860, 1002, MY0, MY1)
grab("enemy_gargoyle_1",1062, 1218, MY0, MY1)

print("Done.")
