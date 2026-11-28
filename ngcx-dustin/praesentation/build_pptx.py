import os
from pptx import Presentation
from pptx.util import Inches

BASE = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(BASE, "slide_images")
OUT = os.path.join(BASE, "Roland-AI-x-NGCX.pptx")

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

files = sorted(f for f in os.listdir(IMG_DIR) if f.endswith(".png"))
for f in files:
    slide = prs.slides.add_slide(blank_layout)
    slide.shapes.add_picture(
        os.path.join(IMG_DIR, f),
        0, 0,
        width=prs.slide_width,
        height=prs.slide_height,
    )

prs.save(OUT)
print("PPTX geschrieben:", OUT)
