"""Extract transparent layers from the official NGCX logo (black background).

The logo is NOT redrawn: each layer is the original pixel data, converted to
straight alpha via luminance ("unscreen"), so it composites identically on
dark backgrounds and can be animated part by part.
"""
from PIL import Image
import numpy as np, sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else "public/ngcx-logo-original.jpg"
OUT = "public/logo"
os.makedirs(OUT, exist_ok=True)
rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)

BLACK_POINT = 13.0  # removes JPEG noise in the black background (bg peaks ≈ 12)
FEATHER = 28        # px soft edge so no layer box is ever visible

def unscreen(region):
    a = np.clip((region.max(axis=2) - BLACK_POINT) / (255 - BLACK_POINT), 0, 1)
    h, w = a.shape
    yy = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]
    xx = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
    edge = np.clip(np.minimum(yy, xx) / FEATHER, 0, 1)
    a = a * (edge * edge * (3 - 2 * edge))
    color = np.where(a[..., None] > 1e-3, np.clip(region / np.maximum(a[..., None], 1e-3), 0, 255), 0)
    return color, a

def save(name, box, alpha_mul=None):
    x0, y0, x1, y1 = box
    region = rgb[y0:y1, x0:x1]
    color, a = unscreen(region)
    if alpha_mul is not None:
        a = a * alpha_mul(region)
    out = np.dstack([color, a[..., None] * 255]).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(f"{OUT}/{name}.png")
    print(name, out.shape)

# Boxes measured from the 1179x544 reference
WORDMARK = (236, 96, 980, 318)
save("full", (236, 96, 980, 430))
save("wordmark", WORDMARK)
save("intelligence", (256, 318, 928, 366))
save("claim", (384, 388, 798, 422))

# The X starts at x=746 in the reference (the C ends at x<=745), so split by
# geometry with a 2px feather. This keeps the X's silver-to-blue gradient intact.
SPLIT = 746 - WORDMARK[0]

def x_mask(region):
    cols = np.arange(region.shape[1])[None, :]
    return np.clip((cols - SPLIT + 1) / 2, 0, 1).repeat(region.shape[0], 0)

save("wordmark-x", WORDMARK, x_mask)                      # the electric-blue X
save("wordmark-ngc", WORDMARK, lambda r: 1 - x_mask(r))   # the silver N G C
