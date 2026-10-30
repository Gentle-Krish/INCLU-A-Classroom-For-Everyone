import os
from PIL import Image, ImageOps, ImageFilter
import numpy as np

SOURCE_PATH = r"C:\Users\KRISH KHANNA\.gemini\antigravity\brain\0a37c672-69f4-454b-9221-842f2a248537\.user_uploaded\media_1793364337196_cc35ac28.jpg"
ROOT_DIR = r"d:\INCLU-main"
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
STUDENT_RES = os.path.join(ROOT_DIR, "student", "android", "app", "src", "main", "res")
STUDENT_ASSETS = os.path.join(ROOT_DIR, "student", "assets")

os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(STUDENT_ASSETS, exist_ok=True)

# 1. Load source image
source_img = Image.open(SOURCE_PATH).convert("RGB")
arr = np.array(source_img)

# Exact bounding coordinates found earlier:
# Badge: row 382 to 641, col 101 to 360 (260x260)
# Full logo (badge + INCLU): row 382 to 641, col 101 to 922 (260x822)
badge_crop = source_img.crop((101, 382, 361, 642))
full_logo_crop = source_img.crop((101, 382, 923, 642))

# Create transparent version of full logo
# For pixels outside the badge (x > 260 in crop coordinates):
# background color is approx (248, 247, 242)
full_rgba = full_logo_crop.convert("RGBA")
full_arr = np.array(full_rgba)
bg_color = np.array([248, 247, 242], dtype=float)

for y in range(full_arr.shape[0]):
    for x in range(full_arr.shape[1]):
        # Keep badge 100% solid
        if x <= 260:
            full_arr[y, x, 3] = 255
        else:
            # For letters area: calculate distance to background cream color
            diff = np.sqrt(np.sum((full_arr[y, x, :3].astype(float) - bg_color)**2))
            if diff < 15:
                full_arr[y, x, 3] = 0
            elif diff < 40:
                alpha = int(255 * (diff - 15) / 25.0)
                full_arr[y, x, 3] = max(0, min(255, alpha))
            else:
                full_arr[y, x, 3] = 255

transparent_full_logo = Image.fromarray(full_arr, "RGBA")

# 2. Save public/logo.png (Full banner with comfortable padding)
logo_w, logo_h = transparent_full_logo.size
padded_logo = Image.new("RGBA", (logo_w + 80, logo_h + 40), (0, 0, 0, 0))
padded_logo.paste(transparent_full_logo, (40, 20), transparent_full_logo)
padded_logo.save(os.path.join(PUBLIC_DIR, "logo.png"), "PNG")
padded_logo.save(os.path.join(PUBLIC_DIR, "logo-full.png"), "PNG")
padded_logo.save(os.path.join(STUDENT_ASSETS, "logo.png"), "PNG")
print("Saved logo.png and logo-full.png")

# 3. Create square badge app icon (512x512 with safe padding)
badge_rgba = badge_crop.convert("RGBA")
icon_512 = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
# Scale badge to 420x420 and center
scaled_badge = badge_rgba.resize((420, 420), Image.Resampling.LANCZOS)
icon_512.paste(scaled_badge, ((512 - 420) // 2, (512 - 420) // 2), scaled_badge)

icon_512.save(os.path.join(PUBLIC_DIR, "icon.png"), "PNG")
icon_512.save(os.path.join(PUBLIC_DIR, "pwa-512x512.png"), "PNG")
icon_512.save(os.path.join(STUDENT_ASSETS, "icon.png"), "PNG")

# 4. PWA 192x192 & Apple touch icon 180x180
icon_192 = icon_512.resize((192, 192), Image.Resampling.LANCZOS)
icon_192.save(os.path.join(PUBLIC_DIR, "pwa-192x192.png"), "PNG")

icon_180 = icon_512.resize((180, 180), Image.Resampling.LANCZOS)
icon_180.save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), "PNG")

# 5. icon.ico multi-resolution
icon_512.save(
    os.path.join(PUBLIC_DIR, "icon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
)
print("Saved icon.png, icon.ico, apple-touch-icon.png, pwa icons")

# 6. Generate Android Mipmap Icons
# Android launcher icon dimensions:
# mdpi: 48x48 (fg 108x108)
# hdpi: 72x72 (fg 162x162)
# xhdpi: 96x96 (fg 216x216)
# xxhdpi: 144x144 (fg 324x324)
# xxxhdpi: 192x192 (fg 432x432)
android_densities = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

# Create a rounded squircle badge for ic_launcher
for folder, (size, fg_size) in android_densities.items():
    dir_path = os.path.join(STUDENT_RES, folder)
    os.makedirs(dir_path, exist_ok=True)

    # 1. ic_launcher.png (Legacy launcher icon: cream background with badge)
    launcher = Image.new("RGBA", (size, size), (255, 246, 238, 255)) # Cream bg
    badge_size = int(size * 0.85)
    b_resized = badge_rgba.resize((badge_size, badge_size), Image.Resampling.LANCZOS)
    pos = ((size - badge_size) // 2, (size - badge_size) // 2)
    launcher.paste(b_resized, pos, b_resized)
    launcher.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")

    # 2. ic_launcher_foreground.png (Adaptive icon foreground: centered badge in 108x108 safe zone)
    fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    # Android adaptive safe zone is 66/108 of the canvas (~61%)
    fg_badge_size = int(fg_size * 0.58)
    fg_resized = badge_rgba.resize((fg_badge_size, fg_badge_size), Image.Resampling.LANCZOS)
    fg_pos = ((fg_size - fg_badge_size) // 2, (fg_size - fg_badge_size) // 2)
    fg.paste(fg_resized, fg_pos, fg_resized)
    fg.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")
    print(f"Generated Android {folder} ({size}x{size}, fg {fg_size}x{fg_size})")

print("All branding assets generated successfully!")
