#!/usr/bin/env python3
"""Convert SVG icon to PNG for VS Code extension."""

import subprocess
import sys
from pathlib import Path

# Try using cairosvg if available, otherwise use ImageMagick or svglib
try:
    from cairosvg import svg2png
    
    svg_path = Path(__file__).parent / "icon.svg"
    png_path = Path(__file__).parent / "icon.png"
    
    svg2png(url=str(svg_path), write_to=str(png_path), output_width=128, output_height=128)
    print(f"Successfully created {png_path}")
    sys.exit(0)
except ImportError:
    print("cairosvg not found, trying alternative methods...")
    
# Try using ImageMagick convert command
try:
    svg_path = Path(__file__).parent / "icon.svg"
    png_path = Path(__file__).parent / "icon.png"
    
    subprocess.run([
        "magick", 
        f"{svg_path}", 
        "-background", "none",
        "-resize", "128x128",
        f"{png_path}"
    ], check=True, capture_output=True)
    print(f"Successfully created {png_path} using ImageMagick")
    sys.exit(0)
except (subprocess.CalledProcessError, FileNotFoundError):
    print("ImageMagick not found...")

# Try convert (ImageMagick on some systems)
try:
    svg_path = Path(__file__).parent / "icon.svg"
    png_path = Path(__file__).parent / "icon.png"
    
    subprocess.run([
        "convert", 
        f"{svg_path}", 
        "-background", "none",
        "-resize", "128x128",
        f"{png_path}"
    ], check=True, capture_output=True)
    print(f"Successfully created {png_path} using convert")
    sys.exit(0)
except (subprocess.CalledProcessError, FileNotFoundError):
    print("convert command not found...")

print("ERROR: Could not find a suitable SVG to PNG converter.")
print("Please install one of:")
print("  - cairosvg: pip install cairosvg")
print("  - ImageMagick: https://imagemagick.org/script/download.php")
sys.exit(1)
