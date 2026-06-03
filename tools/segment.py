"""Generic sprite segmentation utility.

Detects sprites against a near-black background inside a band, splits by
column gaps, tightens bounding boxes, and exports transparent PNGs.
"""
from PIL import Image


def luma(px):
    r, g, b = px[0], px[1], px[2]
    return 0.299 * r + 0.587 * g + 0.114 * b


def content_mask_cols(im, x0, y0, x1, y1, thresh, min_pix=2):
    """Return list of bools: True if column has >=min_pix content pixels."""
    px = im.load()
    cols = []
    for x in range(x0, x1):
        cnt = 0
        for y in range(y0, y1):
            if luma(px[x, y]) > thresh:
                cnt += 1
                if cnt >= min_pix:
                    break
        cols.append(cnt >= min_pix)
    return cols


def runs_from_mask(mask, x0, gap=8, min_w=6):
    """Find contiguous True runs, merging gaps < `gap`."""
    runs = []
    start = None
    gapc = 0
    for i, v in enumerate(mask):
        if v:
            if start is None:
                start = i
            gapc = 0
        else:
            if start is not None:
                gapc += 1
                if gapc > gap:
                    runs.append((x0 + start, x0 + i - gapc + 1))
                    start = None
                    gapc = 0
    if start is not None:
        runs.append((x0 + start, x0 + len(mask) - gapc))
    return [(a, b) for a, b in runs if b - a >= min_w]


def tighten_v(im, x0, x1, y0, y1, thresh, min_pix=2, pad=1):
    """Find tight vertical bounds within column range."""
    px = im.load()
    top, bot = None, None
    for y in range(y0, y1):
        cnt = 0
        for x in range(x0, x1):
            if luma(px[x, y]) > thresh:
                cnt += 1
                if cnt >= min_pix:
                    break
        if cnt >= min_pix:
            if top is None:
                top = y
            bot = y
    if top is None:
        return y0, y1
    return max(y0, top - pad), min(y1, bot + 1 + pad)


def transparent(im, box, thresh):
    """Crop box and make near-black transparent."""
    crop = im.crop(box).convert("RGBA")
    px = crop.load()
    w, h = crop.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if luma((r, g, b)) <= thresh:
                px[x, y] = (0, 0, 0, 0)
    return crop


def segment_band(im, band, thresh=28, gap=10, min_w=8, pad=1, min_pix=2):
    """Return list of tight (x0,y0,x1,y1) boxes for sprites in a band."""
    x0, y0, x1, y1 = band
    cols = content_mask_cols(im, x0, y0, x1, y1, thresh, min_pix)
    runs = runs_from_mask(cols, x0, gap=gap, min_w=min_w)
    boxes = []
    for ax, bx in runs:
        ty, by = tighten_v(im, ax, bx, y0, y1, thresh, min_pix, pad)
        boxes.append((max(0, ax - pad), ty, bx + pad, by))
    return boxes
