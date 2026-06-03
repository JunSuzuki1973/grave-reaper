"""
extract_sprites2.py  — Revised extraction with manually-tuned coordinates.

Column-density analysis revealed that many animation frames are touching inside
their labeled group borders.  This script uses the analysis results to crop
each sprite by its true column group boundaries rather than relying on
automatic gap detection.
"""
import sys, os, json
from pathlib import Path
from PIL import Image

TOOLS_DIR = Path(__file__).parent
ROOT      = TOOLS_DIR.parent
sys.path.insert(0, str(TOOLS_DIR))

from segment import transparent, tighten_v

SRC = ROOT / "assets" / "source"
OUT = ROOT / "assets" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)

THRESH = 28
extracted, skipped = [], []


# ──────────────────────────────────────────────────────────────
# helpers
# ──────────────────────────────────────────────────────────────

def save(img, name):
    img.save(OUT / name)
    extracted.append(name)
    print(f"  saved {name}  {img.size}")

def skip(name, reason):
    skipped.append({"name": name, "reason": reason})
    print(f"  SKIP  {name}: {reason}")

def crop(im, box, pad=0, thresh=THRESH):
    x0, y0, x1, y1 = box
    # vertical-tighten inside the band
    ty, by = tighten_v(im, x0, x1, y0, y1, thresh, min_pix=2, pad=pad)
    return transparent(im, (x0, ty, x1, by), thresh)

def crop_raw(im, box, thresh=THRESH):
    """Crop without vertical tightening."""
    return transparent(im, box, thresh)


# ──────────────────────────────────────────────────────────────
# players.png
# ──────────────────────────────────────────────────────────────

def extract_players():
    print("\n=== players.png ===")
    im = Image.open(SRC / "players.png").convert("RGB")

    # --- Dark Knight ---
    # Column-density analysis (y=280-520):
    #   idle:   x=319-408    (left side, palette at ~0-320)
    #   walk0:  x=640-830
    #   walk1:  x=844-1025
    #   walk2:  x=1036-1207
    #   jump:   x=1291-1499
    #   attack: x=1666-1870
    KY0, KY1 = 220, 545   # knight band y range
    knight = [
        ("player_knight_idle.png",   319,  408),
        ("player_knight_walk0.png",  640,  831),
        ("player_knight_walk1.png",  844, 1026),
        ("player_knight_walk2.png", 1036, 1208),
        ("player_knight_jump.png",  1291, 1500),
        ("player_knight_attack.png",1666, 1871),
    ]
    for name, x0, x1 in knight:
        save(crop(im, (x0, KY0, x1, KY1), pad=2), name)

    # --- Dark Mage ---
    # Column-density analysis (y=670-940):
    #   idle:  x=320-400
    #   walk0: x=627-808
    #   walk1: x=831-1010
    #   walk2: x=1032-1209
    #   jump:  x=1289-1499
    #   cast:  x=1578-1907
    MY0, MY1 = 600, 960
    mage = [
        ("player_mage_idle.png",  320,  401),
        ("player_mage_walk0.png", 627,  809),
        ("player_mage_walk1.png", 831, 1011),
        ("player_mage_walk2.png",1032, 1210),
        ("player_mage_jump.png", 1289, 1500),
        ("player_mage_cast.png", 1578, 1908),
    ]
    for name, x0, x1 in mage:
        save(crop(im, (x0, MY0, x1, MY1), pad=2), name)


# ──────────────────────────────────────────────────────────────
# enemies.png
# ──────────────────────────────────────────────────────────────

def split_half(x0, x1, n=2):
    """Split [x0,x1] into n equal segments."""
    w = (x1 - x0) / n
    return [(int(x0 + i*w), int(x0 + (i+1)*w)) for i in range(n)]

def extract_enemies():
    print("\n=== enemies.png ===")
    im = Image.open(SRC / "enemies.png").convert("RGB")

    # ── Upper band: 5 enemies ─────────────────────────────────
    UY0, UY1 = 110, 415

    # Zombie: 2 separate groups found (68-164, 206-284)
    save(crop(im, ( 68, UY0, 165, UY1), pad=2), "enemy_zombie_0.png")
    save(crop(im, (205, UY0, 285, UY1), pad=2), "enemy_zombie_1.png")

    # Red Devil: 1 merged group (378-493) → split in half
    for i, (a,b) in enumerate(split_half(378, 494)):
        save(crop(im, (a, UY0, b, UY1), pad=1), f"enemy_devil_{i}.png")

    # Dracula: 2 groups (505-655, 701-810); 3rd frame ~811-860 (extend band)
    save(crop(im, (505, UY0, 656, UY1), pad=2), "enemy_dracula_0.png")
    save(crop(im, (700, UY0, 811, UY1), pad=2), "enemy_dracula_1.png")
    # 3rd Dracula frame: check if there's content to the right of 810
    save(crop(im, (811, UY0, 870, UY1), pad=2), "enemy_dracula_2.png")

    # Bat: 1 merged group (835-1089) → split in half
    for i, (a,b) in enumerate(split_half(835, 1090)):
        save(crop(im, (a, UY0, b, UY1), pad=1), f"enemy_bat_{i}.png")

    # Dragon (Flying & Fire): groups (1065-1151, 1205-1306, 1315-1437, 1478-1969)
    # Frame 0: compact body pose
    # Frame 1: wings-out pose
    # Frame 2: dragon + fire breath (wider)
    save(crop(im, (1065, UY0, 1152, UY1), pad=2), "enemy_dragon_0.png")
    save(crop(im, (1205, UY0, 1438, UY1), pad=2), "enemy_dragon_1.png")
    save(crop(im, (1478, UY0, 1970, UY1), pad=2), "enemy_dragon_2.png")

    # ── Mid band: 4 enemies ───────────────────────────────────
    MY0, MY1 = 430, 715

    # Skeleton (16x16 x2): 1 merged group (55-319) → split in half
    for i, (a,b) in enumerate(split_half(55, 320)):
        save(crop(im, (a, MY0, b, MY1), pad=1), f"enemy_skeleton_{i}.png")

    # Ghost (16x16 x2): 1 merged group (305-569) → split in half
    for i, (a,b) in enumerate(split_half(305, 570)):
        save(crop(im, (a, MY0, b, MY1), pad=1), f"enemy_ghost_{i}.png")

    # Werewolf (24x24 x2): 1 merged group (555-879) → split in half
    for i, (a,b) in enumerate(split_half(555, 880)):
        save(crop(im, (a, MY0, b, MY1), pad=2), f"enemy_werewolf_{i}.png")

    # Gargoyle (24x24 x2): 1 merged group (865-1209) → split in half
    for i, (a,b) in enumerate(split_half(865, 1210)):
        save(crop(im, (a, MY0, b, MY1), pad=2), f"enemy_gargoyle_{i}.png")

    # ── Boss ──────────────────────────────────────────────────
    # 2 boxes already correctly detected: (62-923, 999-1602)
    BY0, BY1 = 750, 1102
    save(crop(im, ( 62, BY0,  924, BY1), pad=3), "enemy_boss_0.png")
    save(crop(im, (999, BY0, 1603, BY1), pad=3), "enemy_boss_1.png")


# ──────────────────────────────────────────────────────────────
# weapons.png
# ──────────────────────────────────────────────────────────────
#
# Animation frames within each row are touching / gradient-fused,
# so each weapon is saved as ONE full strip.
# The game will use canvas sub-rect drawing to play the animation.
# We also record the strip width so the game can calculate frame count.

def extract_weapons():
    print("\n=== weapons.png ===")
    im = Image.open(SRC / "weapons.png").convert("RGB")

    # Sword horizontal swing strip  (exclude the knight figure on the left)
    save(crop_raw(im, ( 900,  78, 1962, 282)), "fx_sword_0.png")

    # Spear thrust strip (exclude icon x<300 and knight figure)
    save(crop_raw(im, ( 480, 278, 1462, 462)), "fx_spear_0.png")

    # Battle Axe swing strip
    save(crop_raw(im, ( 480, 453, 1462, 657)), "fx_axe_0.png")

    # Fireball frames
    save(crop_raw(im, ( 170, 645, 1012, 803)), "fx_fireball_0.png")

    # Lightning bolt frames
    save(crop_raw(im, (1040, 645, 1962, 803)), "fx_lightning_0.png")

    # Throwing dagger (just the 3 dagger images)
    save(crop_raw(im, ( 170, 795,  962, 962)), "fx_dagger_0.png")


# ──────────────────────────────────────────────────────────────
# items.png
# ──────────────────────────────────────────────────────────────
#
# 3×3 grid.  Use column positions derived from the correctly-detected
# chest/icon rows to align gem crops in row 1.

def extract_items():
    print("\n=== items.png ===")
    im = Image.open(SRC / "items.png").convert("RGB")

    # Column x-ranges (from chest and icon rows):
    #   col0: 412–795   col1: 846–1266   col2: 1277–1600
    # Row y-ranges:
    #   row0 (gems):  57–437
    #   row1 (chests): 437–783
    #   row2 (icons):  783–1077

    COL = [(412, 800), (846, 1267), (1277, 1601)]
    ROW = [(57, 437), (437, 783), (783, 1077)]

    grid = [
        ["item_gem_red.png",      "item_gem_blue.png",    "item_gem_green.png"],
        ["item_chest_closed.png", "item_chest_open.png",  "item_potion.png"   ],
        ["icon_shield.png",       "icon_wind.png",        "icon_sword.png"    ],
    ]
    for r, (y0, y1) in enumerate(ROW):
        for c, (x0, x1) in enumerate(COL):
            name = grid[r][c]
            save(crop(im, (x0, y0, x1, y1), pad=4), name)


# ──────────────────────────────────────────────────────────────
# tiles.png
# ──────────────────────────────────────────────────────────────

def extract_tiles():
    print("\n=== tiles.png ===")
    im = Image.open(SRC / "tiles.png").convert("RGB")

    # Graveyard ground tile strip (top-left)
    save(crop_raw(im, (5, 5, 415, 130)), "tile_ground.png")

    # Night sky background (large scene, right half of sheet)
    save(crop_raw(im, (1060, 5, 1900, 450)), "bg_sky.png")

    # Full moon (nested inside the background area, top-right)
    save(crop_raw(im, (1810, 10, 1960, 195)), "bg_moon.png")

    # Castle silhouette strip below the sky scene
    save(crop_raw(im, (1060, 450, 1900, 585)), "bg_castle.png")

    # Gravestones (2 detected: 418-523, 545-792)
    save(crop(im, (418,  18, 524, 265), pad=2), "deco_gravestone0.png")
    save(crop(im, (545,  19, 793, 265), pad=2), "deco_gravestone1.png")
    save(crop(im, (418, 265, 793, 380), pad=2), "deco_gravestone2.png")

    # Dead trees (3 groups detected: 788-915, 920-1019, 1043-1072)
    save(crop(im, (788,  19,  916, 285), pad=2), "deco_tree0.png")
    save(crop(im, (920,  54, 1020, 285), pad=2), "deco_tree1.png")


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main():
    print(f"Output dir: {OUT}")
    extract_players()
    extract_enemies()
    extract_weapons()
    extract_items()
    extract_tiles()

    inventory = {"extracted": sorted(extracted), "skipped": skipped}
    with open(TOOLS_DIR / "sprite_inventory.json", "w", encoding="utf-8") as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)

    print(f"\nDone: {len(extracted)} extracted, {len(skipped)} skipped.")
    if skipped:
        print("Skipped:")
        for s in skipped:
            print(f"  {s['name']}: {s['reason']}")

if __name__ == "__main__":
    main()
