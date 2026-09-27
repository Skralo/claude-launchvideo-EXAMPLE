#!/usr/bin/env python3
"""
SKRALOVNIK film: SFX palette, round 1 (prototypes only).

Three dry mechanical-digital sounds, synthesized from noise, impulses and short modal clusters.
No DAW, no samples, no tonal beeps, no pitch sweeps, no bells, no drums, no reverb.

  A  SHUTTER  micro-cut, transition   leaf shutter: open and close transients, spring rattle
  B  LOCK     object lock, resolve    focus servo: accelerating ratchet into a latch, a burst of bits
  C  GRAIN    texture movement        scanner head: a cloud of crushed noise grains over a stepped bed

Reads out/skralovnik/cues.json (exported from the picture's timeline) and writes:

  sfx/skralovnik/A_shutter.wav, B_lock.wav, C_grain.wav   48 kHz / 24-bit, level-matched
  sfx/skralovnik/audition-reel.wav                        A x3, B x3, C x3, then A B C
  sfx/skralovnik/cue-sheet.md + cue-sheet.csv             film cues + reel timestamps
  sfx/skralovnik/qc.md                                    peaks, endings, mono compatibility
  out/skralovnik/soundtrack.wav                           the film's SFX-only track (muxed by post.py)

Everything is seeded, so re-running reproduces the exact files.
"""
import csv
import json
import os

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'sfx', 'skralovnik')
WORK = os.path.join(ROOT, 'out', 'skralovnik')
CUES = json.load(open(os.path.join(WORK, 'cues.json')))

# Function -> prototype, and the level each function plays at in the film (dB, relative to the
# level-matched prototype). One prototype serves several functions on purpose: round 1 tests the
# three sounds, variations come after feedback.
MAP = {
    'transition': ('A', 0.0),
    'micro': ('A', -5.0),
    'lock': ('B', -2.0),
    'resolve': ('B', +2.0),
    'texture': ('C', -3.0),
}
MATCH_LUFS = -20.0  # momentary loudness every prototype is matched to (400 ms window)
TP_CEIL = -1.0      # dBTP


def n_of(sec):
    return int(round(sec * SR))


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)


def burst(rng, dur, tau, lo, hi, order=2):
    """Band-limited noise with an exponential decay: the basic hard-contact transient."""
    n = n_of(dur)
    x = rng.standard_normal(n) * np.exp(-np.arange(n) / (tau * SR))
    return bp(x, lo, hi, order)


def modal(exc, freqs, decays_ms, gains):
    """A dense cluster of short two-pole resonators at inharmonic ratios. The decays are a few
    milliseconds, so the cluster reads as material (metal, plastic), never as a pitch."""
    y = np.zeros_like(exc)
    for f, d, g in zip(freqs, decays_ms, gains):
        r = np.exp(-1.0 / (d / 1000 * SR))
        w = 2 * np.pi * f / SR
        y += signal.lfilter([1 - r], [1, -2 * r * np.cos(w), r * r], exc) * g
    return y


def crush(x, bits):
    q = 2 ** (bits - 1)
    return np.round(x * q) / q


def hold(x, k):
    """Sample-and-hold: repeats every k-th sample (digital aliasing grit)."""
    return np.repeat(x[::k], k)[:len(x)]


def add(dst, x, t, g=1.0):
    i = n_of(t)
    n = min(len(x), len(dst) - i)
    dst[i:i + n] += x[:n] * g


def finish(x, fade_ms=4.0):
    """DC out, a 0.15 ms fade in, a raised-cosine fade out, so the file starts and ends at zero."""
    x = hp(x, 25, 2)
    fi = n_of(0.00015)
    x[:fi] *= np.linspace(0, 1, fi)
    fo = n_of(fade_ms / 1000)
    x[-fo:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, fo)))
    return x


# ---------------------------------------------------------------------------------------
# A: SHUTTER (micro-cut, transition)
# ---------------------------------------------------------------------------------------
def proto_a():
    rng = np.random.default_rng(101)
    x = np.zeros(n_of(0.085))
    # open: hard click + a dull noise "thock" (the blade stack moving), no pitch in it
    click = burst(rng, 0.004, 0.0006, 2500, 13000)
    add(x, click, 0.0, 1.0)
    add(x, burst(rng, 0.030, 0.0045, 110, 700), 0.0003, 0.9)
    add(x, modal(click, [1830, 2710, 3390, 4460, 5230, 6870, 8120], [5.5, 4.8, 4.2, 3.8, 3.3, 2.8, 2.4],
                 [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]), 0.0, 0.22)
    # close: 13 ms later, brighter and lighter
    click2 = burst(rng, 0.003, 0.0004, 3500, 15000)
    add(x, click2, 0.013, 0.72)
    add(x, burst(rng, 0.020, 0.0025, 220, 950), 0.0132, 0.38)
    add(x, modal(click2, [2310, 3570, 4880, 6150, 7730], [3.5, 3.0, 2.6, 2.2, 1.9], [0.8, 0.7, 0.6, 0.5, 0.4]), 0.013, 0.16)
    # spring rattle: a few micro-contacts that die fast
    for t, g in ((0.0185, 0.24), (0.0228, 0.17), (0.0281, 0.10), (0.0352, 0.055), (0.0436, 0.03)):
        add(x, burst(rng, 0.0015, 0.00022, 4000, 14000), t, g)
    x = np.tanh(x * 1.6) / 1.6  # a touch of hardness
    return finish(x, 5)


# ---------------------------------------------------------------------------------------
# B: LOCK (object lock, resolve)
# ---------------------------------------------------------------------------------------
def proto_b():
    rng = np.random.default_rng(202)
    x = np.zeros(n_of(0.115))
    # focus servo: five steps, intervals shrinking 16 > 12 > 9 > 6 ms, each step crushed
    t = 0.0
    for i, (gap, g) in enumerate(((0.016, 0.30), (0.012, 0.36), (0.009, 0.42), (0.006, 0.5), (0.0, 0.56))):
        tick = burst(rng, 0.004, 0.0005, 1500, 7500)
        tick = hold(crush(tick / (np.abs(tick).max() + 1e-9), 7), 3) * np.abs(tick).max()
        add(x, tick, t, g)
        t += gap
    latch_t = t + 0.009
    # latch: the heavier contact that says "held"
    click = burst(rng, 0.005, 0.0008, 1200, 11000)
    add(x, click, latch_t, 1.0)
    add(x, burst(rng, 0.040, 0.0065, 240, 1400), latch_t + 0.0002, 0.85)
    add(x, modal(click, [910, 1370, 2230, 2980, 3910], [7.5, 6.5, 5.5, 4.5, 3.5], [0.9, 0.8, 0.7, 0.55, 0.4]), latch_t, 0.2)
    # a burst of bits: held random values (aperiodic, so no pitch), crushed to 4 bits
    n = n_of(0.018)
    bits = hold(rng.uniform(-1, 1, n), 22) * np.exp(-np.arange(n) / (0.0045 * SR))
    add(x, bp(crush(bits, 4), 700, 6500), latch_t + 0.006, 0.22)
    x = np.tanh(x * 1.4) / 1.4
    return finish(x, 5)


# ---------------------------------------------------------------------------------------
# C: GRAIN (texture movement)
# ---------------------------------------------------------------------------------------
def proto_c():
    rng = np.random.default_rng(303)
    dur = 0.26
    n = n_of(dur)
    tt = np.arange(n) / SR
    dens = np.clip(tt / 0.025, 0, 1) * np.where(tt < 0.15, 1.0, 0.5 * (1 + np.cos(np.pi * np.clip((tt - 0.15) / 0.10, 0, 1))))
    L, R = np.zeros(n), np.zeros(n)
    # grain cloud: Poisson arrivals, each grain a short band of noise at a random (not swept) centre
    t = 0.0
    while t < dur:
        d = dens[min(n - 1, n_of(t))]
        t += rng.exponential(1 / (950 * max(d, 0.05)))
        if t >= dur or rng.random() > d:
            continue
        gl = rng.uniform(0.0004, 0.0025)
        g = rng.standard_normal(n_of(gl)) * np.hanning(n_of(gl))
        fc = np.exp(rng.uniform(np.log(1200), np.log(9000)))
        g = bp(np.concatenate([g, np.zeros(64)]), fc / 1.6, fc * 1.6, 1)
        amp = rng.uniform(0.25, 1.0)
        pan = rng.uniform(-0.45, 0.45)
        a = (pan + 1) * np.pi / 4
        i = n_of(t)
        m = min(len(g), n - i)
        L[i:i + m] += g[:m] * amp * np.cos(a)
        R[i:i + m] += g[:m] * amp * np.sin(a)
    # bed: held noise through a stepped random gain, the head dragging across the surface
    bed = hp(hold(rng.standard_normal(n), 6), 900, 2)
    steps = np.zeros(n)
    i = 0
    while i < n:
        k = n_of(rng.uniform(0.012, 0.025))
        steps[i:i + k] = rng.uniform(0.3, 1.0)
        i += k
    steps = signal.sosfilt(signal.butter(1, 400, 'low', fs=SR, output='sos'), steps)
    bed = crush(bed / np.abs(bed).max(), 6) * steps * dens * 0.33
    x = np.stack([L + bed, R + bed], 1)
    x = np.tanh(x * 1.3) / 1.3
    return np.stack([finish(x[:, 0], 8), finish(x[:, 1], 8)], 1)


# ---------------------------------------------------------------------------------------
# measurement
# ---------------------------------------------------------------------------------------
METER = pyln.Meter(SR, block_size=0.400)


def stereo(x):
    return np.stack([x, x], 1) if x.ndim == 1 else x


def momentary(x):
    """Loudness of a 400 ms window with the sound in it (one gating block). Longer files get the
    loudest 400 ms block (BS.1770 momentary max)."""
    x = stereo(x)
    w = n_of(0.4)
    if len(x) <= w:
        pad = np.zeros((w, 2))
        pad[:len(x)] = x
        return METER.integrated_loudness(pad)
    best = -np.inf
    for i in range(0, len(x) - w, n_of(0.1)):
        seg = x[i:i + w]
        if np.abs(seg).max() > 0:
            best = max(best, METER.integrated_loudness(seg))
    return best


def true_peak(x):
    x = stereo(x)
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.abs(up).max() + 1e-12)


def sample_peak(x):
    return 20 * np.log10(np.abs(x).max() + 1e-12)


def qc(name, x):
    x = stereo(x)
    tail = x[-n_of(0.005):]
    mono = x.mean(1)
    l, r = x[:, 0], x[:, 1]
    corr = float(np.corrcoef(l, r)[0, 1]) if np.std(l) > 0 and np.std(r) > 0 else 1.0
    st_e = np.mean(l ** 2 + r ** 2) / 2
    mono_e = np.mean(mono ** 2)
    return {
        'name': name,
        'dur_ms': round(len(x) / SR * 1000, 1),
        'momentary_lufs': round(momentary(x), 1),
        'sample_peak_dbfs': round(sample_peak(x), 2),
        'true_peak_dbtp': round(true_peak(x), 2),
        'first_sample': float(np.abs(x[0]).max()),
        'last_sample': float(np.abs(x[-1]).max()),
        'tail_5ms_dbfs': round(20 * np.log10(np.sqrt(np.mean(tail ** 2)) + 1e-12), 1),
        'dc': float(np.abs(x.mean(0)).max()),
        'lr_correlation': round(corr, 3),
        'mono_sum_change_db': round(10 * np.log10((mono_e + 1e-20) / (st_e + 1e-20)), 2),
    }


def write(path, x):
    sf.write(path, stereo(x), SR, subtype='PCM_24')


# ---------------------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------------------
def main():
    os.makedirs(OUT, exist_ok=True)
    protos = {'A': ('SHUTTER', proto_a()), 'B': ('LOCK', proto_b()), 'C': ('GRAIN', proto_c())}

    # level-match on momentary loudness, then make sure the loudest peak still clears the ceiling
    gains = {k: 10 ** ((MATCH_LUFS - momentary(x)) / 20) for k, (_, x) in protos.items()}
    worst = max(true_peak(protos[k][1] * g) for k, g in gains.items())
    trim = min(1.0, 10 ** ((TP_CEIL - 0.2 - worst) / 20))
    matched = {k: (nm, protos[k][1] * gains[k] * trim) for k, (nm, _) in protos.items()}
    files = {'A': 'A_shutter.wav', 'B': 'B_lock.wav', 'C': 'C_grain.wav'}
    for k, (nm, x) in matched.items():
        write(os.path.join(OUT, files[k]), x)

    # audition reel: each prototype three times, then the three in a row
    reel_marks = []
    reel = np.zeros((n_of(9.0), 2))
    t = 0.5
    for k in 'ABC':
        for i in range(3):
            add2(reel, stereo(matched[k][1]), t)
            reel_marks.append((t, f'{k} {matched[k][0]} ({i + 1}/3)'))
            t += 0.5
        t += 0.7
    for k in 'ABC':
        add2(reel, stereo(matched[k][1]), t)
        reel_marks.append((t, f'{k} {matched[k][0]} (sequence)'))
        t += 0.5
    reel = reel[:n_of(t + 0.8)]
    write(os.path.join(OUT, 'audition-reel.wav'), reel)

    # the film's SFX-only track
    total = CUES['total'] / CUES['fps']
    film = np.zeros((n_of(total + 0.5), 2))
    rows = []
    for c in CUES['cues']:
        k, db = MAP[c['fn']]
        x = stereo(matched[k][1]) * 10 ** (db / 20)
        a = (c['pan'] + 1) * np.pi / 4
        x = x * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2)  # constant power, 0 dB at centre
        add2(film, x, c['t'])
        rows.append(c | {'proto': f"{k} {matched[k][0]}", 'gain_db': db})
    film = film[:n_of(total)]
    tp = true_peak(film)
    if tp > TP_CEIL:
        film *= 10 ** ((TP_CEIL - tp) / 20)
    write(os.path.join(WORK, 'soundtrack.wav'), film)

    # reports
    report = [qc(f"{k} {matched[k][0]}", matched[k][1]) for k in 'ABC']
    report.append(qc('audition reel', reel))
    report.append(qc('film soundtrack', film))
    write_cue_sheet(rows, reel_marks)
    write_qc(report, gains, trim, film)
    for r in report:
        print(r)


def add2(dst, x, t):
    i = n_of(t)
    n = min(len(x), len(dst) - i)
    dst[i:i + n] += x[:n]


def tc(frame, fps=30):
    s, f = divmod(frame, fps)
    return f'00:00:{s:02d}:{f:02d}'


def write_cue_sheet(rows, reel_marks):
    fields = ['id', 'frame', 'timecode', 't', 'fn', 'proto', 'gain_db', 'pan', 'chapter', 'look', 'note']
    with open(os.path.join(OUT, 'cue-sheet.csv'), 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: (tc(r['frame']) if k == 'timecode' else r[k]) for k in fields})
    fn_rows = {}
    for r in rows:
        fn_rows.setdefault(r['fn'], []).append(r)
    md = ['# SKRALOVNIK film: SFX cue sheet (round 1)', '',
          'Picture: 30 fps, 303 frames (10.1 s). Audio: 48 kHz / 24-bit, SFX only (the original sound is removed).', '',
          '## Visual events by function', '',
          '| Function | Prototype | Level | Events | What happens on screen |', '|---|---|---|---|---|']
    what = {
        'micro': '1-2 frame interruptions inside a shot: negative, punch-in, 1-bit frame, type flash, colour frame, system frame, chrome frame, contact-sheet tiles',
        'transition': 'the hit on each cut: negative, slice glitch, chrome sparkle wipe, 1-bit entry, system strip, black frame',
        'lock': 'brackets fly in and lock onto the subject (face, ring, head, both of them, silhouette, the lift)',
        'texture': 'something textural travels: boot lines, 1-bit scan bands, film strips, contour trace, smear, globe, chrome travel, wordmark resolving',
        'resolve': 'the four sparkles lock into the SKRALOVNIK symbol',
    }
    for fn in ('micro', 'transition', 'lock', 'texture', 'resolve'):
        k, db = MAP[fn]
        md.append(f"| {fn} | {k} {dict(A='SHUTTER', B='LOCK', C='GRAIN')[k]} | {db:+.0f} dB | {len(fn_rows.get(fn, []))} | {what[fn]} |")
    md += ['', '## Film cues', '', '| # | Timecode | Frame | Function | Prototype | Level | Pan | Chapter | Event |', '|---|---|---|---|---|---|---|---|---|']
    for i, r in enumerate(rows, 1):
        md.append(f"| {i} | {tc(r['frame'])} | {r['frame']} | {r['fn']} | {r['proto']} | {r['gain_db']:+.0f} dB | {r['pan']:+.2f} | {r['chapter']} | {r['note']} |")
    md += ['', '## Audition reel', '', '| Time | Sound |', '|---|---|']
    for t, lab in reel_marks:
        md.append(f'| {t:.2f} s | {lab} |')
    open(os.path.join(OUT, 'cue-sheet.md'), 'w').write('\n'.join(md) + '\n')


def write_qc(report, gains, trim, film):
    meter = pyln.Meter(SR)
    integ = meter.integrated_loudness(film)
    md = ['# SFX QC (round 1)', '',
          f'Level match: every prototype at {MATCH_LUFS:.0f} LUFS momentary (one 400 ms K-weighted block), '
          f'then trimmed {20 * np.log10(trim):+.2f} dB so the loudest true peak stays under {TP_CEIL:.0f} dBTP.', '',
          '| File | Length | Momentary (max) | Sample peak | True peak | First / last sample | Last 5 ms | DC | L/R corr. | Mono sum |',
          '|---|---|---|---|---|---|---|---|---|---|']
    for r in report:
        md.append(f"| {r['name']} | {r['dur_ms']:.0f} ms | {r['momentary_lufs']:.1f} LUFS | {r['sample_peak_dbfs']:.2f} dBFS | "
                  f"{r['true_peak_dbtp']:.2f} dBTP | {r['first_sample']:.1e} / {r['last_sample']:.1e} | {r['tail_5ms_dbfs']:.0f} dBFS | "
                  f"{r['dc']:.1e} | {r['lr_correlation']:.3f} | {r['mono_sum_change_db']:+.2f} dB |")
    md += ['', f'Film soundtrack integrated loudness: {integ:.1f} LUFS (sparse transients, so integrated reads low; the peaks are what matter).', '',
           'How to read it:', '',
           '- **Clean endings:** every file starts and ends on zero (a 0.15 ms fade in, a raised-cosine fade out) and the last 5 ms sit far below audibility.',
           '- **Mono compatibility:** A and B are mono sources (L = R, correlation 1.000, mono sum 0 dB). C scatters its grains across the stereo field; its correlation stays positive and the mono sum loses only what uncorrelated grains always lose, with no comb filtering because nothing is delayed between channels.',
           '- **Peaks:** true peak is measured with 4x oversampling.', '']
    open(os.path.join(OUT, 'qc.md'), 'w').write('\n'.join(md) + '\n')


if __name__ == '__main__':
    main()
