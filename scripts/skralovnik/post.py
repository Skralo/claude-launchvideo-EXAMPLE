#!/usr/bin/env python3
"""
SKRALOVNIK film: finishing.

Remotion's PNG frames + the SFX-only soundtrack -> film grain -> H.264 master with AAC audio.
The original camera sound is not used anywhere. Then three checks on the delivered file:

  sync        the decoded AAC lines up with out/skralovnik/soundtrack.wav (<= 1 ms)
  true peak   the decoded AAC stays at or under -1 dBTP
  flashes     a WCAG 2.3.1-style scan: opposing full-frame luminance swings per 1 s window

Grain is luminance-weighted (clean blacks, quiet highlights) and seeded per frame, then a
1-LSB triangular dither before quantizing so the dark gradients of the outro do not band.

Usage: python3 scripts/skralovnik/post.py <frames_dir> <out.mp4> [--crf N] [--maxrate Mbps]
"""
import glob
import json
import os
import subprocess
import sys

import cv2
import numpy as np
import soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WAV = os.path.join(ROOT, 'out', 'skralovnik', 'soundtrack.wav')
W, H, FPS = 1920, 1080, 30


def grain(rgb, f):
    rng = np.random.default_rng(1000 + f)
    n = rng.standard_normal((H // 2 + 1, W // 2 + 1)).astype(np.float32)
    n = cv2.resize(n, (W, H), interpolation=cv2.INTER_LINEAR)
    x = rgb.astype(np.float32) / 255.0
    lum = 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]
    amp = 0.032 * np.sqrt(np.clip(lum, 0, 1)) * (1 - 0.55 * lum)
    x += (n * amp)[..., None]
    tpdf = (rng.random((H, W, 1), dtype=np.float32) - rng.random((H, W, 1), dtype=np.float32))
    return np.clip(x * 255.0 + tpdf, 0, 255).astype(np.uint8)


def rel_lum(rgb):
    """Mean relative luminance (linear light) of a downscaled frame."""
    x = cv2.resize(rgb, (192, 108), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    lin = np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
    return float(np.mean(0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]))


def flash_scan(lums):
    """Counts flashes (a pair of opposing luminance changes of >= 0.1 where the darker state is
    below 0.8) in every 30-frame window. WCAG 2.3.1 allows at most 3 per second."""
    ext = []  # local extrema of the luminance sequence
    for i, v in enumerate(lums):
        if not ext or abs(v - ext[-1][1]) >= 1e-4:
            if len(ext) >= 2 and (v - ext[-1][1]) * (ext[-1][1] - ext[-2][1]) > 0:
                ext[-1] = (i, v)
            else:
                ext.append((i, v))
    changes = []
    for (i0, a), (i1, b) in zip(ext, ext[1:]):
        if abs(b - a) >= 0.1 and min(a, b) < 0.8:
            changes.append(i1)
    worst, at = 0, 0
    for s in range(0, max(1, len(lums) - FPS + 1)):
        n = sum(1 for c in changes if s <= c < s + FPS) // 2
        if n > worst:
            worst, at = n, s
    return worst, at, changes


def check_sync(video, sr=48000):
    ref, _ = sf.read(WAV, always_2d=True)
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', video, '-f', 'f32le', '-ac', '2', '-ar', str(sr), '-'],
                         capture_output=True, check=True).stdout
    dec = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    worst = 0
    for t in (1.0, 4.2, 7.3):
        a, b = int(t * sr), int((t + 1.5) * sr)
        c = signal.correlate(dec[a - 4800:b + 4800, 0], ref[a:b, 0], mode='valid')
        lag = int(np.argmax(c)) - 4800
        worst = max(worst, abs(lag))
        print(f'  sync t={t:4.1f}s lag {lag:+d} samples')
    tp = 20 * np.log10(np.max(np.abs(signal.resample_poly(dec, 4, 1, axis=0))) + 1e-12)
    return worst, float(tp)


def main():
    frames_dir, out = sys.argv[1], sys.argv[2]
    crf = sys.argv[sys.argv.index('--crf') + 1] if '--crf' in sys.argv else '18'
    maxrate = int(sys.argv[sys.argv.index('--maxrate') + 1]) if '--maxrate' in sys.argv else 24  # Mb/s
    files = sorted(glob.glob(os.path.join(frames_dir, '*.png')))
    enc = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-i', WAV,
        '-map', '0:v', '-map', '1:a',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p',
        '-maxrate', f'{maxrate}M', '-bufsize', f'{2 * maxrate}M',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
        '-movflags', '+faststart', '-shortest', out,
    ], stdin=subprocess.PIPE)
    lums = []
    for f, p in enumerate(files):
        rgb = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2RGB)
        g = grain(rgb, f)
        lums.append(rel_lum(g))
        enc.stdin.write(g.tobytes())
    enc.stdin.close()
    enc.wait()
    print(f'encoded {len(files)} frames -> {out}')

    lag, tp = check_sync(out)
    worst, at, changes = flash_scan(lums)
    report = {
        'frames': len(files),
        'sync_worst_samples': lag,
        'sync_ok': lag <= 48,
        'true_peak_dbtp': round(tp, 2),
        'true_peak_ok': tp <= -1.0,
        'max_flashes_per_second': worst,
        'worst_window_starts_frame': at,
        'flash_ok_wcag_2_3_1': worst <= 3,
        'luminance_changes_at': changes,
    }
    json.dump(report | {'mean_luminance': [round(v, 4) for v in lums]},
              open(os.path.join(ROOT, 'out', 'skralovnik', 'post-report.json'), 'w'), indent=1)
    print(json.dumps({k: v for k, v in report.items() if k != 'luminance_changes_at'}, indent=1))


if __name__ == '__main__':
    main()
