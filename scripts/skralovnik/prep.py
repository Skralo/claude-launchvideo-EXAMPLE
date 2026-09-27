#!/usr/bin/env python3
"""
SKRALOVNIK film: plate preparation.

public/skralovnik/source.mp4 (4K, 30 fps, 8 shots, 242 frames) becomes everything the picture
needs, per source frame:

  public/skralovnik/plate/bw/NNNN.jpg    1920x1080 silver grade (teal-black shadows, paper highlights)
  public/skralovnik/plate/col/NNNN.jpg   1920x1080 colour, contrast-matched (colour flashes)
  public/skralovnik/plate/d4/NNNN.png    480x270 1-bit dither (full-frame dither, large tiles)
  public/skralovnik/plate/d8/NNNN.png    240x135 1-bit dither (small tiles)
  public/skralovnik/track.json           per-frame lock box and subject contour (committed)

The lock boxes come from MediaPipe pose landmarks (the ring in the typing shot is followed with
optical flow instead, because hands on a keyboard are not a pose). Contours come from two person
segmenters (selfie multiclass + DeepLab person), maxed. Models download on first run.

Usage: python3 scripts/skralovnik/prep.py [--skip-track]
"""
import json
import os
import subprocess
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUB = os.path.join(ROOT, 'public', 'skralovnik')
SRC = os.path.join(PUB, 'source.mp4')
PLATE = os.path.join(PUB, 'plate')
WORK = os.path.join(ROOT, 'out', 'skralovnik')
MODELS = os.path.join(WORK, 'models')
W, H = 1920, 1080

# Cut frames measured on the source (frame-difference peaks; identical to the website's CHAPTERS).
CUTS = [0, 30, 59, 90, 122, 153, 182, 215, 242]
N = CUTS[-1]

MODEL_URLS = {
    'pose.task': 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task',
    'selfie_mc.tflite': 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
    'deeplab.tflite': 'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite',
}

# Duotone ends: shadows sit in the brand's teal-black (symbol.svg #00202d, darkened),
# highlights on the website's paper white (#f4f1ea).
SHADOW = np.array([3, 13, 17], np.float32) / 255.0
PAPER = np.array([244, 241, 234], np.float32) / 255.0


def shot_of(f):
    for s in range(8):
        if CUTS[s] <= f < CUTS[s + 1]:
            return s
    return 7


# ---------------------------------------------------------------------------------------
# frames
# ---------------------------------------------------------------------------------------
def extract_frames():
    d = os.path.join(WORK, 'frames')
    os.makedirs(d, exist_ok=True)
    if len(os.listdir(d)) >= N:
        return d
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', SRC, '-vf', f'scale={W}:{H}:flags=lanczos',
                    '-q:v', '1', '-start_number', '0', os.path.join(d, '%04d.jpg')], check=True)
    return d


def load(d, f):
    return cv2.imread(os.path.join(d, f'{f:04d}.jpg'))


# ---------------------------------------------------------------------------------------
# grade
# ---------------------------------------------------------------------------------------
def luma(bgr):
    x = bgr.astype(np.float32) / 255.0
    return 0.0722 * x[..., 0] + 0.7152 * x[..., 1] + 0.2126 * x[..., 2]


def s_curve(y, k=5.5, pivot=0.46):
    """Normalised sigmoid: 0 -> 0, 1 -> 1, steepest at the pivot."""
    lo = 1 / (1 + np.exp(k * pivot))
    hi = 1 / (1 + np.exp(-k * (1 - pivot)))
    return (1 / (1 + np.exp(-k * (y - pivot))) - lo) / (hi - lo)


# Per shot: black point / white point percentiles and a gamma, set by eye so every shot lands on
# the same silver: deep blacks, a few clipped whites, faces in the upper mids.
SHOT_GRADE = [
    dict(lo=0.5, hi=99.7, gamma=0.92, k=6.0),   # 1 present: dark set, keep it low-key
    dict(lo=1.0, hi=99.0, gamma=1.05, k=5.5),   # 2 build: bright warm desk
    dict(lo=1.0, hi=99.3, gamma=1.15, k=5.5),   # 3 train: grey gym
    dict(lo=1.0, hi=98.0, gamma=0.80, k=5.0),   # 4 build: window light, lift the face
    dict(lo=1.0, hi=97.0, gamma=1.10, k=5.0),   # 5 run: sky
    dict(lo=1.0, hi=98.5, gamma=1.05, k=5.5),   # 6 team
    dict(lo=0.5, hi=99.8, gamma=0.85, k=6.0),   # 7 recover: sauna, stays dark
    dict(lo=1.0, hi=98.5, gamma=1.05, k=5.5),   # 8 repeat: gym
]


def shot_levels(frames_dir):
    lv = []
    for s in range(8):
        ys = [cv2.resize(luma(load(frames_dir, f)), (480, 270), interpolation=cv2.INTER_AREA)
              for f in range(CUTS[s], CUTS[s + 1], 3)]
        ys = np.stack(ys)
        g = SHOT_GRADE[s]
        lv.append((float(np.percentile(ys, g['lo'])), float(np.percentile(ys, g['hi']))))
    return lv


def grade_luma(bgr, s, levels):
    g = SHOT_GRADE[s]
    lo, hi = levels[s]
    y = luma(bgr)
    y = np.clip((y - lo) / max(hi - lo, 1e-3), 0, 1) ** g['gamma']
    y = s_curve(y, g['k'])
    # clarity (large-radius local contrast) + a fine sharpen, the "sharp" in the brief
    base = cv2.GaussianBlur(y, (0, 0), 28)
    y = y + 0.32 * (y - base)
    fine = cv2.GaussianBlur(y, (0, 0), 1.1)
    y = y + 0.55 * (y - fine)
    return np.clip(y, 0, 1)


def duotone(y):
    t = y[..., None]
    rgb = SHADOW * (1 - t) + PAPER * t
    return (np.clip(rgb[..., ::-1], 0, 1) * 255 + 0.5).astype(np.uint8)  # to BGR


def heat_mask(bgr):
    """Where the sauna's LED strip glows: saturated orange-red."""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, sat, v = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    hue = np.clip(1 - np.minimum(np.abs(h - 18), np.abs(h - 378)) / 22, 0, 1)
    m = hue * np.clip((sat - 0.45) / 0.35, 0, 1) * np.clip((v - 0.25) / 0.4, 0, 1)
    return cv2.GaussianBlur(m, (0, 0), 3)


def colour(bgr, s, levels):
    """Colour plate: same levels as the silver grade, a little extra saturation."""
    g = SHOT_GRADE[s]
    lo, hi = levels[s]
    x = bgr.astype(np.float32) / 255.0
    x = np.clip((x - lo) / max(hi - lo, 1e-3), 0, 1) ** g['gamma']
    x = s_curve(x, g['k'] * 0.8)
    hsv = cv2.cvtColor((x * 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.15, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def dither(y, size):
    im = Image.fromarray((cv2.resize(y, size, interpolation=cv2.INTER_AREA) * 255).astype(np.uint8), 'L')
    return im.convert('1')  # Floyd-Steinberg


def build_plates(frames_dir):
    for sub in ('bw', 'col', 'd4', 'd8'):
        os.makedirs(os.path.join(PLATE, sub), exist_ok=True)
    levels = shot_levels(frames_dir)
    for f in range(N):
        s = shot_of(f)
        bgr = load(frames_dir, f)
        y = grade_luma(bgr, s, levels)
        bw = duotone(y)
        col = colour(bgr, s, levels)
        if s == 6:
            # RECOVER keeps its heat: the one colour accent of the film
            m = heat_mask(bgr)[..., None]
            bw = (bw * (1 - m) + col * m).astype(np.uint8)
        cv2.imwrite(os.path.join(PLATE, 'bw', f'{f:04d}.jpg'), bw, [cv2.IMWRITE_JPEG_QUALITY, 94])
        cv2.imwrite(os.path.join(PLATE, 'col', f'{f:04d}.jpg'), col, [cv2.IMWRITE_JPEG_QUALITY, 92])
        dither(y, (480, 270)).save(os.path.join(PLATE, 'd4', f'{f:04d}.png'))
        dither(y, (240, 135)).save(os.path.join(PLATE, 'd8', f'{f:04d}.png'))
        if f % 40 == 0:
            print(f'  plate {f}/{N}', flush=True)


# ---------------------------------------------------------------------------------------
# tracking
# ---------------------------------------------------------------------------------------
def models():
    os.makedirs(MODELS, exist_ok=True)
    for name, url in MODEL_URLS.items():
        p = os.path.join(MODELS, name)
        if not os.path.exists(p):
            print('  downloading', name)
            urllib.request.urlretrieve(url, p)
    return {k: os.path.join(MODELS, k) for k in MODEL_URLS}


def detect(frames_dir):
    import mediapipe as mp
    from mediapipe.tasks import python as mpt
    from mediapipe.tasks.python import vision
    m = models()
    pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
        base_options=mpt.BaseOptions(model_asset_path=m['pose.task']),
        running_mode=vision.RunningMode.IMAGE, num_poses=2,
        min_pose_detection_confidence=0.3, min_pose_presence_confidence=0.3))
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=mpt.BaseOptions(model_asset_path=m['selfie_mc.tflite']),
        running_mode=vision.RunningMode.IMAGE, output_confidence_masks=True))
    dl = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=mpt.BaseOptions(model_asset_path=m['deeplab.tflite']),
        running_mode=vision.RunningMode.IMAGE, output_confidence_masks=True))
    poses, masks = [], []
    for f in range(N):
        rgb = cv2.cvtColor(load(frames_dir, f), cv2.COLOR_BGR2RGB)
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        r = pose.detect(img)
        poses.append([[(lm.x * W, lm.y * H, lm.visibility) for lm in p] for p in r.pose_landmarks])
        a = 1.0 - seg.segment(img).confidence_masks[0].numpy_view()
        b = dl.segment(img).confidence_masks[15].numpy_view()  # VOC class 15: person
        a = cv2.resize(a, (960, 540), interpolation=cv2.INTER_LINEAR)
        b = cv2.resize(b, (960, 540), interpolation=cv2.INTER_LINEAR)
        masks.append(np.maximum(a, b))
        if f % 40 == 0:
            print(f'  detect {f}/{N}', flush=True)
    return poses, masks


def pick(poses_f, idx, vis=0.4, which='best'):
    """Landmarks idx of one pose (or 'all' poses) with visibility above vis."""
    if not poses_f:
        return []
    cand = poses_f if which == 'all' else [max(poses_f, key=lambda p: sum(p[i][2] for i in idx))]
    return [(p[i][0], p[i][1]) for p in cand for i in idx if p[i][2] >= vis]


FACE = list(range(11))
HEAD_SHOULDERS = list(range(13))
BODY = list(range(33))


def box_of(pts, pad, min_w, aspect=None, lift=0.0):
    if not pts:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    w = max((max(xs) - min(xs)) * pad, min_w)
    h = max((max(ys) - min(ys)) * pad, min_w * 0.75)
    if aspect:
        h = w * aspect
    return [cx, cy - lift * h, w, h]


def ring_track(frames_dir):
    """The ring on the typing hand, median optical flow from a hand-placed seed on frame 44."""
    a, b = CUTS[1], CUTS[2]
    seed_f, seed = 44, np.array([1105.0, 575.0])
    gray = {f: cv2.cvtColor(load(frames_dir, f), cv2.COLOR_BGR2GRAY) for f in range(a, b)}
    pos = {seed_f: seed.copy()}
    for step in (1, -1):
        p = seed.copy()
        f = seed_f
        while a <= f + step < b:
            g0, g1 = gray[f], gray[f + step]
            x0, y0 = int(p[0]) - 70, int(p[1]) - 50
            pts = cv2.goodFeaturesToTrack(g0[y0:y0 + 100, x0:x0 + 140], 40, 0.01, 4)
            if pts is not None:
                pts = pts.reshape(-1, 2) + [x0, y0]
                nxt, st, _ = cv2.calcOpticalFlowPyrLK(g0, g1, pts.astype(np.float32), None,
                                                      winSize=(31, 31), maxLevel=3)
                ok = st.reshape(-1) == 1
                if ok.sum() >= 4:
                    p = p + np.median(nxt[ok] - pts[ok], axis=0)
            f += step
            pos[f] = p.copy()
    return {f: [float(pos[f][0]), float(pos[f][1]), 230.0, 170.0] for f in range(a, b)}


def smooth(seq, sigma):
    """Gaussian smoothing of a list of equal-length vectors, edges clamped."""
    x = np.array(seq, np.float64)
    r = int(3 * sigma)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.concatenate([np.repeat(x[:1], r, 0), x, np.repeat(x[-1:], r, 0)])
    return np.stack([np.convolve(pad[:, i], k, 'valid') for i in range(x.shape[1])], 1)


def clamp_box(b, margin=40):
    cx, cy, w, h = b
    w, h = min(w, W - 2 * margin), min(h, H - 2 * margin)
    cx = min(max(cx, margin + w / 2), W - margin - w / 2)
    cy = min(max(cy, margin + h / 2), H - margin - h / 2)
    return [cx, cy, w, h]


def contours_of(mask, shot):
    m = (mask > 0.5).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cs = sorted(cs, key=cv2.contourArea, reverse=True)[:2 if shot == 5 else 1]
    out = []
    for c in cs:
        if cv2.contourArea(c) < 400:
            continue
        c = cv2.approxPolyDP(c, 1.6, True).reshape(-1, 2) * 2
        out.append([int(v) for v in c.reshape(-1)])
    return out


def build_track(frames_dir):
    poses, masks = detect(frames_dir)
    ring = ring_track(frames_dir)
    raw = []
    for f in range(N):
        s, P = shot_of(f), poses[f]
        if s in (0, 3):      # present, build (notebook): the face
            b = box_of(pick(P, FACE), 1.9, 190, aspect=1.25, lift=0.08)
        elif s == 1:         # build (typing): the ring
            b = ring[f]
        elif s == 2:         # train: head and shoulders on the bar
            b = box_of(pick(P, HEAD_SHOULDERS), 1.35, 220)
        elif s == 4:         # run: the head
            b = box_of(pick(P, FACE), 2.4, 180, aspect=1.2, lift=0.05)
        elif s == 5:         # team: both of them
            b = box_of(pick(P, HEAD_SHOULDERS, which='all'), 1.25, 300)
        else:                # recover, repeat: the whole body
            b = box_of(pick(P, BODY, vis=0.5), 1.12, 220)
        raw.append(b)
    frames = []
    for s in range(8):
        a, e = CUTS[s], CUTS[s + 1]
        seq = raw[a:e]
        # fill gaps from the nearest detected frame
        known = [i for i, b in enumerate(seq) if b is not None]
        seq = [seq[min(known, key=lambda k: abs(k - i))] for i in range(len(seq))]
        c = smooth([b[:2] for b in seq], 1.3)
        z = smooth([b[2:] for b in seq], 2.2)
        for i in range(e - a):
            frames.append({'box': [round(v, 1) for v in clamp_box([*c[i], *z[i]])],
                           'contour': contours_of(masks[a + i], s)})
    track = {'fps': 30, 'width': W, 'height': H, 'cuts': CUTS, 'frames': frames}
    with open(os.path.join(PUB, 'track.json'), 'w') as fh:
        json.dump(track, fh, separators=(',', ':'))
    print('  track.json written')


# ---------------------------------------------------------------------------------------
# punch-ins
# ---------------------------------------------------------------------------------------
def build_punch(frames_dir):
    """Punch-in frames are cut from the 4K source (not blown up from the 1080p plate), centred on
    the lock box, then graded like the rest of their shot. Needs out/skralovnik/timeline.json
    (scripts/skralovnik/export-cues.ts) and public/skralovnik/track.json."""
    tl = json.load(open(os.path.join(WORK, 'timeline.json')))
    track = json.load(open(os.path.join(PUB, 'track.json')))['frames']
    want = {}
    for e in tl['events']:
        if e['look'] == 'punch':
            want[e['o'] - tl['pre']] = e
    os.makedirs(os.path.join(PLATE, 'punch'), exist_ok=True)
    levels = shot_levels(frames_dir)
    cap = cv2.VideoCapture(SRC)
    f = 0
    while want:
        ok, big = cap.read()
        if not ok:
            break
        if f in want:
            e = want.pop(f)
            p = e.get('p') or {}
            z = float(p.get('zoom', 2))
            cx, cy, w, h = track[f]['box']
            cy += float(p.get('dy', 0)) * h
            sx, sy = big.shape[1] / W, big.shape[0] / H
            cw, ch = big.shape[1] / z, big.shape[0] / z
            x0 = int(round(min(max(cx * sx - cw / 2, 0), big.shape[1] - cw)))
            y0 = int(round(min(max(cy * sy - ch / 2, 0), big.shape[0] - ch)))
            crop = cv2.resize(big[y0:y0 + int(ch), x0:x0 + int(cw)], (W, H), interpolation=cv2.INTER_LANCZOS4)
            y = grade_luma(crop, shot_of(f), levels)
            cv2.imwrite(os.path.join(PLATE, 'punch', f"{e['id']}.jpg"), duotone(y), [cv2.IMWRITE_JPEG_QUALITY, 94])
            print(f"  punch {e['id']} (source frame {f}, x{z})")
        f += 1


if __name__ == '__main__':
    frames_dir = extract_frames()
    if '--punch' in sys.argv:
        build_punch(frames_dir)
        sys.exit(0)
    print('plates')
    build_plates(frames_dir)
    if '--skip-track' not in sys.argv:
        print('tracking')
        build_track(frames_dir)
