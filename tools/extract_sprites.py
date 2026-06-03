"""
extract_sprites.py
Extracts individual sprites from all source sprite sheets and saves them
as RGBA transparent PNGs into assets/sprites/.
Uses segment.py utilities for band-based segmentation.
"""
import sys
import os
import json
from pathlib import Path
from PIL import Image

# Add tools dir to path so segment can be imported
TOOLS_DIR = Path(__file__).parent
ROOT = TOOLS_DIR.parent
sys.path.insert(0, str(TOOLS_DIR))

from segment import segment_band, transparent

SRC = ROOT / "assets" / "source"
OUT = ROOT / "assets" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)

INSPECT = TOOLS_DIR  # write _inspect_*.png here

THRESH = 30  # near-black threshold

extracted = []
skipped = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def save(img: Image.Image, name: str):
    path = OUT / name
    img.save(path)
    extracted.append(name)
    print(f"  saved {name}  {img.size}")


def skip(name: str, reason: str):
    skipped.append({"name": name, "reason": reason})
    print(f"  SKIP  {name}: {reason}")


def inspect_boxes(im: Image.Image, boxes, tag: str):
    """Draw colored outlines around detected boxes and save for visual check."""
    from PIL import ImageDraw
    vis = im.convert("RGB").copy()
    draw = ImageDraw.Draw(vis)
    colors = ["#ff0000", "#00ff00", "#0088ff", "#ffff00", "#ff00ff", "#00ffff",
              "#ff8800", "#88ff00", "#0088ff", "#ff0088"]
    for i, box in enumerate(boxes):
        draw.rectangle(box, outline=colors[i % len(colors)], width=3)
        draw.text((box[0] + 2, box[1] + 2), str(i), fill=colors[i % len(colors)])
    path = INSPECT / f"_inspect_{tag}.png"
    vis.save(path)
    print(f"  inspect -> {path}  boxes={len(boxes)}")


def crop_transparent(im: Image.Image, box, thresh=THRESH) -> Image.Image:
    return transparent(im, box, thresh)


# ---------------------------------------------------------------------------
# players.png  (2048x1152)
# Dark Knight (upper band) + Dark Mage (lower band)
# ---------------------------------------------------------------------------

def extract_players():
    print("\n=== players.png ===")
    im = Image.open(SRC / "players.png").convert("RGB")
    W, H = im.size
    print(f"  size: {W}x{H}")

    # --- Dark Knight ---
    # Row spans y~200..545. Left side has "1. DARK KNIGHT" label + palette ~x0..320
    # Sprites start after x~320
    # Labels row (IDLE / WALK CYCLE etc) are at top of band ~ y200..250; actual sprites below
    # Use a slightly tighter y range to avoid text labels
    knight_band = (320, 240, 2000, 545)
    knight_boxes = segment_band(im, knight_band, thresh=THRESH, gap=5, min_w=30, pad=2)
    inspect_boxes(im, knight_boxes, "knight")
    print(f"  Knight raw boxes: {knight_boxes}")

    # Expected: 6 sprites: idle, walk0, walk1, walk2, jump, attack
    # walk frames may merge; we need gap=5 to split them
    knight_names = [
        "player_knight_idle.png",
        "player_knight_walk0.png",
        "player_knight_walk1.png",
        "player_knight_walk2.png",
        "player_knight_jump.png",
        "player_knight_attack.png",
    ]
    _assign_sprites(im, knight_boxes, knight_names, "knight")

    # --- Dark Mage ---
    # Row spans y~580..950. Same left offset ~320 for sprites
    mage_band = (320, 600, 2000, 950)
    mage_boxes = segment_band(im, mage_band, thresh=THRESH, gap=5, min_w=30, pad=2)
    inspect_boxes(im, mage_boxes, "mage")
    print(f"  Mage raw boxes: {mage_boxes}")

    mage_names = [
        "player_mage_idle.png",
        "player_mage_walk0.png",
        "player_mage_walk1.png",
        "player_mage_walk2.png",
        "player_mage_jump.png",
        "player_mage_cast.png",
    ]
    _assign_sprites(im, mage_boxes, mage_names, "mage")


def _assign_sprites(im, boxes, names, tag):
    """Assign detected boxes to named sprites. Handles mismatch gracefully."""
    if len(boxes) == len(names):
        for box, name in zip(boxes, names):
            save(crop_transparent(im, box), name)
    elif len(boxes) > len(names):
        print(f"  WARNING {tag}: got {len(boxes)} boxes for {len(names)} names - taking first {len(names)}")
        for box, name in zip(boxes[:len(names)], names):
            save(crop_transparent(im, box), name)
        for i, box in enumerate(boxes[len(names):]):
            name = f"{tag}_extra_{i}.png"
            save(crop_transparent(im, box), name)
    else:
        print(f"  WARNING {tag}: got {len(boxes)} boxes for {len(names)} names - saving what we have")
        for box, name in zip(boxes, names):
            save(crop_transparent(im, box), name)
        for name in names[len(boxes):]:
            skip(name, f"{tag}: only {len(boxes)} boxes detected")


# ---------------------------------------------------------------------------
# enemies.png  (2048x1152)
# ---------------------------------------------------------------------------

def extract_enemies():
    print("\n=== enemies.png ===")
    im = Image.open(SRC / "enemies.png").convert("RGB")
    W, H = im.size
    print(f"  size: {W}x{H}")

    # Each enemy group is a labelled cluster. We'll process band by band.
    # Upper band: Zombie, Red Devil, Dracula, Bat, Dragon  (y~100..420)
    # Mid band:   Skeleton, Ghost, Werewolf, Gargoyle      (y~430..700)
    # Lower band: Large Demon Boss                         (y~750..1100)

    # --- Upper band: split into 5 sub-groups by x ---
    # Approximate x-ranges from visual inspection of 2048px image:
    #   Zombie    x~60..270
    #   Red Devil x~280..500
    #   Dracula   x~510..830
    #   Bat       x~840..1060
    #   Dragon    x~1070..1950 (wide, 3 frames)
    upper_y = (110, 420)
    enemy_upper = [
        ("enemy_zombie",  (60,  upper_y[0], 280,  upper_y[1]), 2, THRESH, 4, 20),
        ("enemy_devil",   (280, upper_y[0], 510,  upper_y[1]), 2, THRESH, 4, 20),
        ("enemy_dracula", (510, upper_y[0], 850,  upper_y[1]), 3, THRESH, 4, 20),
        ("enemy_bat",     (840, upper_y[0], 1080, upper_y[1]), 2, THRESH, 4, 20),
        ("enemy_dragon",  (1070,upper_y[0], 1960, upper_y[1]), 3, THRESH, 4, 20),
    ]
    for name_base, band, n_frames, thresh, gap, min_w in enemy_upper:
        boxes = segment_band(im, band, thresh=thresh, gap=gap, min_w=min_w, pad=2)
        inspect_boxes(im, boxes, name_base)
        print(f"  {name_base}: boxes={boxes}")
        names = [f"{name_base}_{i}.png" for i in range(n_frames)]
        _assign_sprites(im, boxes, names, name_base)

    # --- Mid band ---
    mid_y = (430, 710)
    enemy_mid = [
        ("enemy_skeleton",  (60,  mid_y[0], 310,  mid_y[1]), 2, THRESH, 4, 20),
        ("enemy_ghost",     (310, mid_y[0], 560,  mid_y[1]), 2, THRESH, 4, 20),
        ("enemy_werewolf",  (560, mid_y[0], 870,  mid_y[1]), 2, THRESH, 4, 20),
        ("enemy_gargoyle",  (870, mid_y[0], 1200, mid_y[1]), 2, THRESH, 4, 20),
    ]
    for name_base, band, n_frames, thresh, gap, min_w in enemy_mid:
        boxes = segment_band(im, band, thresh=thresh, gap=gap, min_w=min_w, pad=2)
        inspect_boxes(im, boxes, name_base)
        print(f"  {name_base}: boxes={boxes}")
        names = [f"{name_base}_{i}.png" for i in range(n_frames)]
        _assign_sprites(im, boxes, names, name_base)

    # --- Boss (lower band) ---
    boss_band = (60, 750, 1600, 1110)
    boss_boxes = segment_band(im, boss_band, thresh=THRESH, gap=5, min_w=50, pad=2)
    inspect_boxes(im, boss_boxes, "enemy_boss")
    print(f"  enemy_boss: boxes={boss_boxes}")
    names = ["enemy_boss_0.png", "enemy_boss_1.png"]
    _assign_sprites(im, boss_boxes, names, "enemy_boss")


# ---------------------------------------------------------------------------
# weapons.png  (2048x1152)
# ---------------------------------------------------------------------------

def extract_weapons():
    print("\n=== weapons.png ===")
    im = Image.open(SRC / "weapons.png").convert("RGB")
    W, H = im.size
    print(f"  size: {W}x{H}")

    # Rows (approx):
    # Sword row   y~80..280  : weapon icon x~30..180, knight figure ~180..310, downward slash ~310..850, horizontal swing ~900..1950
    # Spear row   y~280..450 : icon x~30..180, knight ~180..310, thrust frames ~310..1400
    # Battle Axe  y~450..650 : icon x~30..180, knight ~180..310, swing frames ~310..1400
    # Fireball    y~650..800 : icon x~30..180, fireball frames ~180..1000, lightning ~1050..1900
    # Dagger      y~800..950 : icon x~30..180, dagger frames ~180..900

    # We only want the FX frames (not the reference knight figure or icon).
    # Sword: horizontal swing only (named fx_sword_*)
    # The knight "demo" figures should be skipped – they are to the LEFT of the fx.

    # Sword horizontal swing row
    sword_horiz_band = (900, 80, 1960, 280)
    sword_boxes = segment_band(im, sword_horiz_band, thresh=THRESH, gap=6, min_w=30, pad=2)
    inspect_boxes(im, sword_boxes, "fx_sword")
    print(f"  fx_sword: {sword_boxes}")
    names = [f"fx_sword_{i}.png" for i in range(len(sword_boxes))]
    _assign_sprites(im, sword_boxes, names, "fx_sword")

    # Spear thrust
    spear_band = (310, 280, 1450, 460)
    spear_boxes = segment_band(im, spear_band, thresh=THRESH, gap=6, min_w=30, pad=2)
    inspect_boxes(im, spear_boxes, "fx_spear")
    print(f"  fx_spear: {spear_boxes}")
    names = [f"fx_spear_{i}.png" for i in range(len(spear_boxes))]
    _assign_sprites(im, spear_boxes, names, "fx_spear")

    # Battle axe swing
    axe_band = (310, 455, 1450, 655)
    axe_boxes = segment_band(im, axe_band, thresh=THRESH, gap=6, min_w=30, pad=2)
    inspect_boxes(im, axe_boxes, "fx_axe")
    print(f"  fx_axe: {axe_boxes}")
    names = [f"fx_axe_{i}.png" for i in range(len(axe_boxes))]
    _assign_sprites(im, axe_boxes, names, "fx_axe")

    # Fireball frames
    fireball_band = (180, 650, 1000, 800)
    fireball_boxes = segment_band(im, fireball_band, thresh=THRESH, gap=6, min_w=25, pad=2)
    inspect_boxes(im, fireball_boxes, "fx_fireball")
    print(f"  fx_fireball: {fireball_boxes}")
    names = [f"fx_fireball_{i}.png" for i in range(len(fireball_boxes))]
    _assign_sprites(im, fireball_boxes, names, "fx_fireball")

    # Lightning bolt
    lightning_band = (1050, 650, 1950, 800)
    lightning_boxes = segment_band(im, lightning_band, thresh=THRESH, gap=6, min_w=25, pad=2)
    inspect_boxes(im, lightning_boxes, "fx_lightning")
    print(f"  fx_lightning: {lightning_boxes}")
    names = [f"fx_lightning_{i}.png" for i in range(len(lightning_boxes))]
    _assign_sprites(im, lightning_boxes, names, "fx_lightning")

    # Throwing dagger
    dagger_band = (180, 800, 950, 960)
    dagger_boxes = segment_band(im, dagger_band, thresh=THRESH, gap=6, min_w=20, pad=2)
    inspect_boxes(im, dagger_boxes, "fx_dagger")
    print(f"  fx_dagger: {dagger_boxes}")
    # Take only first frame for dagger (static weapon, no animation expected)
    if dagger_boxes:
        save(crop_transparent(im, dagger_boxes[0]), "fx_dagger_0.png")
    else:
        skip("fx_dagger_0.png", "no box detected in dagger band")


# ---------------------------------------------------------------------------
# items.png  (2048x1152)  – 3x3 grid of large items on black
# ---------------------------------------------------------------------------

def extract_items():
    print("\n=== items.png ===")
    im = Image.open(SRC / "items.png").convert("RGB")
    W, H = im.size
    print(f"  size: {W}x{H}")

    # Items appear to be evenly distributed in a 3x3 grid across the image.
    # The image is relatively clean – single band covering all items should work.
    full_band = (30, 30, W - 30, H - 30)
    boxes = segment_band(im, full_band, thresh=THRESH, gap=20, min_w=40, pad=3)
    inspect_boxes(im, boxes, "items")
    print(f"  items boxes: {boxes}")

    # Expected order (left-to-right, top-to-bottom): 9 items
    item_names = [
        "item_gem_red.png",
        "item_gem_blue.png",
        "item_gem_green.png",
        "item_chest_closed.png",
        "item_chest_open.png",
        "item_potion.png",
        "icon_shield.png",
        "icon_wind.png",
        "icon_sword.png",
    ]

    if len(boxes) == 9:
        # Sort by row then column
        boxes_sorted = sorted(boxes, key=lambda b: (b[1], b[0]))
        for box, name in zip(boxes_sorted, item_names):
            save(crop_transparent(im, box), name)
    elif len(boxes) > 0:
        # Try row-by-row segmentation for better control
        print("  Falling back to per-row segmentation")
        _items_per_row(im, W, H, item_names)
    else:
        for name in item_names:
            skip(name, "no boxes detected in full band")


def _items_per_row(im, W, H, item_names):
    """Segment items row by row (3 rows of 3)."""
    row_ranges = [
        (30, int(H * 0.05), W - 30, int(H * 0.38)),   # row 1: gems
        (30, int(H * 0.38), W - 30, int(H * 0.68)),   # row 2: chests + potion
        (30, int(H * 0.68), W - 30, H - 30),           # row 3: icons
    ]
    all_boxes = []
    for band in row_ranges:
        row_boxes = segment_band(im, band, thresh=THRESH, gap=15, min_w=40, pad=3)
        # Sort by x within row
        row_boxes.sort(key=lambda b: b[0])
        all_boxes.extend(row_boxes)

    print(f"  per-row boxes: {all_boxes}")
    if len(all_boxes) >= len(item_names):
        for box, name in zip(all_boxes[:len(item_names)], item_names):
            save(crop_transparent(im, box), name)
    else:
        for box, name in zip(all_boxes, item_names):
            save(crop_transparent(im, box), name)
        for name in item_names[len(all_boxes):]:
            skip(name, "row segmentation: not enough boxes")


# ---------------------------------------------------------------------------
# tiles.png  (2048x1152)  – extract key background / decoration elements
# ---------------------------------------------------------------------------

def extract_tiles():
    print("\n=== tiles.png ===")
    im = Image.open(SRC / "tiles.png").convert("RGB")
    W, H = im.size
    print(f"  size: {W}x{H}")

    # tiles.png is a dense atlas. We extract:
    #   1. tile_ground.png      – representative graveyard ground tile row (top-left area)
    #   2. bg_moon.png          – Full Moon (top-right area)
    #   3. bg_castle.png        – Castle Silhouette (mid-right)
    #   4. bg_sky.png           – full nightscape background element (large box)
    #   5. deco_gravestone0/1/2 – three gravestones (mid area)
    #   6. deco_tree0/1         – two dead trees

    # From visual inspection of the tiles sheet:
    #   - Graveyard Ground Tiles: top-left  ~x=5..410, y=5..130
    #   - Gravestones & Crosses: ~x=420..780, y=5..260
    #   - Dead Trees: ~x=780..1060, y=5..280
    #   - Background Elements (nightscape): ~x=1060..1900, y=5..450
    #   - Forest Ground Tiles: ~x=5..410, y=130..260
    #   - Castle Silhouette strip: ~x=1060..1900, y=450..580  (narrower strip)
    #   - Full Moon: ~x=1810..1900, y=5..130
    #   - Platform & Terrain Tiles: bottom half ~y=600..800

    # --- tile_ground: save the entire graveyard tile section as one sheet ---
    tile_box = (5, 5, 415, 130)
    tile_crop = crop_transparent(im, tile_box)
    save(tile_crop, "tile_ground.png")

    # --- bg_sky: full nightscape background ---
    sky_box = (1060, 5, 1900, 450)
    sky_crop = crop_transparent(im, sky_box)
    save(sky_crop, "bg_sky.png")

    # --- bg_moon: full moon (appears right side of background band) ---
    # Segment the moon sub-region
    moon_band = (1810, 5, 1960, 200)
    moon_boxes = segment_band(im, moon_band, thresh=THRESH, gap=5, min_w=30, pad=3)
    print(f"  moon boxes: {moon_boxes}")
    if moon_boxes:
        save(crop_transparent(im, moon_boxes[0]), "bg_moon.png")
    else:
        # Fallback: just crop the expected area
        save(crop_transparent(im, (1810, 10, 1955, 180)), "bg_moon.png")

    # --- bg_castle: castle silhouette strip ---
    castle_box = (1060, 450, 1900, 580)
    castle_crop = crop_transparent(im, castle_box)
    save(castle_crop, "bg_castle.png")

    # --- Gravestones ---
    grave_band = (420, 5, 790, 265)
    grave_boxes = segment_band(im, grave_band, thresh=THRESH, gap=8, min_w=15, pad=2)
    inspect_boxes(im, grave_boxes, "gravestones")
    print(f"  gravestone boxes: {grave_boxes}")
    for i, box in enumerate(grave_boxes[:3]):
        save(crop_transparent(im, box), f"deco_gravestone{i}.png")
    if len(grave_boxes) < 3:
        for i in range(len(grave_boxes), 3):
            skip(f"deco_gravestone{i}.png", f"only {len(grave_boxes)} gravestone boxes found")

    # --- Dead Trees ---
    tree_band = (790, 5, 1070, 285)
    tree_boxes = segment_band(im, tree_band, thresh=THRESH, gap=8, min_w=15, pad=2)
    inspect_boxes(im, tree_boxes, "trees")
    print(f"  tree boxes: {tree_boxes}")
    for i, box in enumerate(tree_boxes[:2]):
        save(crop_transparent(im, box), f"deco_tree{i}.png")
    if len(tree_boxes) < 2:
        for i in range(len(tree_boxes), 2):
            skip(f"deco_tree{i}.png", f"only {len(tree_boxes)} tree boxes found")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"Output dir: {OUT}")
    extract_players()
    extract_enemies()
    extract_weapons()
    extract_items()
    extract_tiles()

    inventory = {"extracted": sorted(extracted), "skipped": skipped}
    inv_path = TOOLS_DIR / "sprite_inventory.json"
    with open(inv_path, "w", encoding="utf-8") as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)
    print(f"\nInventory saved: {inv_path}")
    print(f"\nDone: {len(extracted)} extracted, {len(skipped)} skipped.")
    if skipped:
        print("Skipped:")
        for s in skipped:
            print(f"  {s['name']}: {s['reason']}")


if __name__ == "__main__":
    main()
