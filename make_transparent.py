import sys
from PIL import Image

def process_image(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    # bg color
    bg_r, bg_g, bg_b = 78, 205, 196

    for item in data:
        r, g, b, a = item
        # Calculate difference from background
        diff = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
        
        if diff < 10:
            # Exact or very close to background -> fully transparent
            new_data.append((255, 255, 255, 0))
        elif r < bg_r and g < bg_g and b < bg_b:
            # Darker than background -> shadow pixel
            # How dark is it compared to background?
            # 0 means black, bg_g means no shadow.
            # estimate alpha based on how much darker it is
            darkness = 1.0 - (g / bg_g)
            alpha = int(darkness * 255 * 1.5)  # boost shadow slightly
            new_data.append((0, 0, 0, min(255, alpha)))
        elif r > bg_r and g > bg_g and b > bg_b:
             # Brighter than background -> text pixel
             # Anti-aliasing text against teal background is tricky, keep original color, fully opaque
             new_data.append((255, 255, 255, 255))
        else:
            # Try to handle anti-aliased edges
            # Set alpha based on distance
            max_dist = 255 * 3
            alpha = max(0, min(255, int((diff / 100.0) * 255)))
            new_data.append((r, g, b, alpha))

    img.putdata(new_data)
    img.save(output_path, "PNG")

process_image("assets/images/app_icon.png", "assets/images/logo_transparent.png")
print("Saved transparent logo.")
