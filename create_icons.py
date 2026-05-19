#!/usr/bin/env python3
"""Generate PWA icons for PUMA AE II EP — pure stdlib, no dependencies."""
import zlib, struct, os

BG    = (13,  17,  23)   # #0d1117
AMBER = (201, 162, 39)   # #c9a227
GLOW  = (240, 200, 60)   # bright amber


def make_png(size, pixels):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(pixels[y * size + x])

    def chunk(t, d):
        c = zlib.crc32(t + d) & 0xffffffff
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', c)

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
            + chunk(b'IEND', b''))


def rasterize(size):
    px = [BG] * (size * size)

    def set_px(x, y, c):
        if 0 <= x < size and 0 <= y < size:
            px[y * size + x] = c

    # Map SVG viewBox (0 0 205 110) onto the icon with 85% width padding
    scale = (size * 0.85) / 205
    ox = (size - 205 * scale) / 2
    oy = (size - 110 * scale) / 2

    def tr(xv, yv):
        return int(xv * scale + ox), int(yv * scale + oy)

    def fill_poly(pts, color):
        if len(pts) < 3:
            return
        min_y = max(0, min(p[1] for p in pts))
        max_y = min(size - 1, max(p[1] for p in pts))
        n = len(pts)
        for y in range(min_y, max_y + 1):
            xs = []
            for i in range(n):
                ax, ay = pts[i]
                bx, by = pts[(i + 1) % n]
                if ay == by:
                    continue
                if min(ay, by) <= y <= max(ay, by):
                    xs.append(ax + (bx - ax) * (y - ay) / (by - ay))
            xs.sort()
            for j in range(0, len(xs) - 1, 2):
                for x in range(int(xs[j]), int(xs[j + 1]) + 1):
                    set_px(x, y, color)

    def fill_ellipse(cx, cy, rx, ry, color):
        for dy in range(-int(ry) - 1, int(ry) + 2):
            for dx in range(-int(rx) - 1, int(rx) + 2):
                if rx > 0 and ry > 0 and (dx / rx) ** 2 + (dy / ry) ** 2 <= 1.0:
                    set_px(cx + dx, cy + dy, color)

    # Fuselage
    fill_poly([tr(14,55),tr(22,51),tr(158,51),tr(178,52.5),
               tr(194,55),tr(178,57.5),tr(158,59),tr(22,59)], AMBER)
    # Port wing (upper)
    fill_poly([tr(80,51),tr(103,51),tr(97,7),tr(76,7)], AMBER)
    # Starboard wing (lower)
    fill_poly([tr(80,59),tr(103,59),tr(97,103),tr(76,103)], AMBER)
    # H-stab port
    fill_poly([tr(163,51),tr(176,51),tr(170,33),tr(159,33)], AMBER)
    # H-stab starboard
    fill_poly([tr(163,59),tr(176,59),tr(170,77),tr(159,77)], AMBER)
    # Propeller disc
    pcx, pcy = tr(196, 55)
    pr = max(2, int(7.5 * scale))
    fill_ellipse(pcx, pcy, pr, pr, AMBER)
    # Sensor pod (brighter)
    scx, scy = tr(26, 62)
    fill_ellipse(scx, scy, max(2, int(7 * scale)), max(1, int(4.5 * scale)), GLOW)

    return px


if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'icon-apple.png')]:
        data = make_png(size, rasterize(size))
        path = os.path.join(base, name)
        with open(path, 'wb') as f:
            f.write(data)
        print(f'Created {name}  ({len(data):,} bytes)')
