import os
from PIL import Image, ImageDraw, ImageFont

SIZES = [16, 32, 48, 128]
OUTPUT_DIRS = [
    "/run/media/scorpion/Venom/Project/extension/public/icons",
    "/run/media/scorpion/Venom/Project/frontend/public/icons"
]

def draw_icon(size: int) -> Image.Image:
    # High resolution canvas for smooth anti-aliasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = canvas_size * 0.08
    cx, cy = canvas_size / 2, canvas_size / 2
    r = canvas_size / 2 - margin

    # Shield background (Dark charcoal #0B0B0F)
    shield_pts = [
        (cx, margin),
        (canvas_size - margin, margin + r * 0.3),
        (canvas_size - margin, margin + r * 1.0),
        (cx, canvas_size - margin),
        (margin, margin + r * 1.0),
        (margin, margin + r * 0.3),
    ]
    draw.polygon(shield_pts, fill=(11, 11, 15, 255), outline=(229, 9, 20, 255), width=int(3 * scale))

    # Spider Web Geometry Lines (Red #E50914)
    red_color = (229, 9, 20, 220)
    blue_color = (21, 101, 192, 220)

    # Concentric web octagons
    for factor in [0.3, 0.55, 0.8]:
        w_pts = [
            (cx, cy - r * factor * 0.7),
            (cx + r * factor * 0.6, cy - r * factor * 0.35),
            (cx + r * factor * 0.6, cy + r * factor * 0.35),
            (cx, cy + r * factor * 0.7),
            (cx - r * factor * 0.6, cy + r * factor * 0.35),
            (cx - r * factor * 0.6, cy - r * factor * 0.35),
        ]
        draw.polygon(w_pts, outline=red_color, width=max(1, int(1.5 * scale)))

    # Radial web spokes
    spokes = [
        (cx, cy, cx, cy - r * 0.7),
        (cx, cy, cx + r * 0.6, cy - r * 0.35),
        (cx, cy, cx + r * 0.6, cy + r * 0.35),
        (cx, cy, cx, cy + r * 0.7),
        (cx, cy, cx - r * 0.6, cy + r * 0.35),
        (cx, cy, cx - r * 0.6, cy - r * 0.35),
    ]
    for x1, y1, x2, y2 in spokes:
        draw.line([x1, y1, x2, y2], fill=red_color, width=max(1, int(1.5 * scale)))

    # Central Blue Tech Node
    node_r = r * 0.18
    draw.ellipse([cx - node_r, cy - node_r, cx + node_r, cy + node_r], fill=blue_color, outline=(255, 255, 255, 230), width=int(1.5 * scale))

    # Downsample with high quality Lanczos filter for crisp clarity
    return img.resize((size, size), Image.Resampling.LANCZOS)

def generate_all():
    for out_dir in OUTPUT_DIRS:
        os.makedirs(out_dir, exist_ok=True)
        for s in SIZES:
            icon = draw_icon(s)
            target_path = os.path.join(out_dir, f"icon{s}.png")
            icon.save(target_path, "PNG")
            print(f"Generated icon: {target_path}")

        # Also save standard icon.png (128x128)
        draw_icon(128).save(os.path.join(out_dir, "icon.png"), "PNG")

if __name__ == "__main__":
    generate_all()
