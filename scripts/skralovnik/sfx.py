#!/usr/bin/env python3
"""
SKRALOVNIK film: SFX palette, round 2 (variations after feedback on round 1).

Round 1 (sfx/skralovnik/round1/) tested three dry mechanical-digital prototypes. Feedback:
  A SHUTTER works, but repeats too often.
  B LOCK works; wants more dynamics: metal, spring.
  C GRAIN works.
  Overall: slightly too many sounds, the same pattern repeating through the film is annoying;
  every scene should have its own pattern that follows the picture; fewer sounds, mostly soft,
  only a few strong ones.

So round 2 keeps the three characters and builds families around them:
  A  SHUTTER  six variants (heavy, two mid, three soft), never the same one twice in a row
  B  LOCK     soft / mid / strong; metal latch with a spring rattle, bigger soft-to-strong range
  C  GRAIN    short / mid / long, plus a pre-swell that leads into a chrome wipe
and a per-scene PLAN: which events sound at all, which variant, at which tier.
No samples, no tonal beeps, no pitch sweeps, no bells, no drums, no reverb.

Reads out/skralovnik/cues.json and writes:
  sfx/skralovnik/round2/*.wav                   every variant, 48 kHz / 24-bit, level-matched
  sfx/skralovnik/round2/audition-reel.wav       A family, B family, C family, level-matched
  sfx/skralovnik/round2/cue-sheet.md + .csv     the plan per scene + reel timestamps
  sfx/skralovnik/round2/qc.md                   peaks, endings, mono compatibility
  out/skralovnik/soundtrack.wav                 the film's SFX-only track (muxed by post.py)
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
OUT = os.path.join(ROOT, 'sfx', 'skralovnik', 'round2')
WORK = os.path.join(ROOT, 'out', 'skralovnik')
CUES = json.load(open(os.path.join(WORK, 'cues.json')))

MATCH_LUFS = -20.0  # every variant is matched to this momentary loudness before tiers apply
TP_CEIL = -1.0      # dBTP
TIER_DB = {'soft': -10.0, 'mid': -4.5, 'strong': 0.0}


def n_of(sec):
    return int(round(sec * SR))


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'low', fs=SR, output='sos'), x)


def burst(rng, dur, tau, lo, hi, order=2):
    """Band-limited noise with an exponential decay: the basic hard-contact transient."""
    n = n_of(dur)
    x = rng.standard_normal(n) * np.exp(-np.arange(n) / (tau * SR))
    return bp(x, lo, hi, order)


def modal(exc, freqs, decays_ms, gains):
    """A dense cluster of short two-pole resonators at inharmonic ratios. Decays stay in the
    tens of milliseconds, so the cluster reads as material (metal, plastic), never as a pitch."""
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
# A: SHUTTER family
# ---------------------------------------------------------------------------------------
def shutter(seed, gap=0.013, weight=0.9, bright=1.0, rattle=5, close=0.72, drive=1.6, dur=0.085):
    """Leaf shutter: open click + dull noise thock, a close click `gap` later, a spring rattle.
    weight scales the low thock, bright moves the click bands up or down, rattle is the count of
    micro-contacts after the close."""
    rng = np.random.default_rng(seed)
    x = np.zeros(n_of(dur))
    click = burst(rng, 0.004, 0.0006, 2500 * bright, 13000 * min(1.0, bright * 1.05))
    add(x, click, 0.0, 1.0)
    add(x, burst(rng, 0.030, 0.0045, 110, 700), 0.0003, weight)
    add(x, modal(click, np.array([1830, 2710, 3390, 4460, 5230, 6870, 8120]) * bright, [5.5, 4.8, 4.2, 3.8, 3.3, 2.8, 2.4],
                 [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]), 0.0, 0.22)
    click2 = burst(rng, 0.003, 0.0004, 3500 * bright, 15000)
    add(x, click2, gap, close)
    add(x, burst(rng, 0.020, 0.0025, 220, 950), gap + 0.0002, 0.38 * weight / 0.9)
    add(x, modal(click2, np.array([2310, 3570, 4880, 6150, 7730]) * bright, [3.5, 3.0, 2.6, 2.2, 1.9], [0.8, 0.7, 0.6, 0.5, 0.4]), gap, 0.16)
    t, g = gap + 0.0055, 0.24
    for _ in range(rattle):
        add(x, burst(rng, 0.0015, 0.00022, 4000, 14000), t, g)
        t += rng.uniform(0.004, 0.0085)
        g *= rng.uniform(0.55, 0.72)
    x = np.tanh(x * drive) / drive
    return finish(x, 5)


A_FAMILY = {
    # name: (description, kwargs)
    'A1_heavy': ('heavy: slower blades, more body, longer rattle (the few strong cuts)',
                 dict(seed=111, gap=0.017, weight=1.35, bright=0.85, rattle=6, close=0.8, drive=2.0, dur=0.1)),
    'A2_mid': ('mid: round-1 shutter, the reference', dict(seed=101)),
    'A3_mid_tight': ('mid, tighter: faster blades, brighter, short rattle',
                     dict(seed=131, gap=0.009, weight=0.75, bright=1.15, rattle=3, close=0.65)),
    'A4_soft': ('soft: light click, little body, two rattles', dict(seed=141, gap=0.011, weight=0.45, bright=1.1, rattle=2, close=0.5, drive=1.2, dur=0.06)),
    'A5_soft_dull': ('soft, duller: darker click, no rattle', dict(seed=151, gap=0.014, weight=0.55, bright=0.7, rattle=0, close=0.45, drive=1.2, dur=0.05)),
    'A6_tick': ('tiny tick: single blade, for the smallest interruptions', dict(seed=161, gap=0.006, weight=0.25, bright=1.25, rattle=1, close=0.3, drive=1.1, dur=0.035)),
}


# ---------------------------------------------------------------------------------------
# B: LOCK family (more metal, a spring, a bigger range)
# ---------------------------------------------------------------------------------------
METAL = [1180, 1730, 2410, 3190, 4270, 5620, 7040]  # inharmonic: no two modes share a ratio


def lock(seed, steps=5, servo=1.0, latch=1.0, ring_ms=16.0, spring=6, thump=0.0, bits=0.22, dur=0.16):
    """Focus servo steps (quiet to loud, accelerating) into a metal latch that rings for a few
    tens of milliseconds, then a spring settling in irregular decaying contacts."""
    rng = np.random.default_rng(seed)
    x = np.zeros(n_of(dur))
    gaps = np.geomspace(0.017, 0.005, max(1, steps - 1)) if steps > 1 else []
    t = 0.0
    for i in range(steps):
        tick = burst(rng, 0.004, 0.0005, 1500, 7500)
        tick = hold(crush(tick / (np.abs(tick).max() + 1e-9), 7), 3) * np.abs(tick).max()
        add(x, tick, t, servo * (0.12 + 0.46 * (i + 1) / steps) ** 1.4)  # crescendo: more dynamics
        if i < len(gaps):
            t += gaps[i]
    lt = t + 0.009
    # the latch: hard contact, low-mid body, and a metal cluster that rings for ~ring_ms
    click = burst(rng, 0.005, 0.0008, 1200, 11000)
    add(x, click, lt, latch)
    add(x, burst(rng, 0.045, 0.007, 220, 1400), lt + 0.0002, 0.85 * latch)
    decays = [ring_ms * k for k in (1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4)]
    add(x, modal(click, METAL, decays, [0.9, 0.85, 0.75, 0.6, 0.5, 0.4, 0.3]), lt, 0.32 * latch)
    if thump > 0:  # a short filtered-noise weight under the strongest lock (not a drum: no pitch, 15 ms)
        n = n_of(0.02)
        th = lp(rng.standard_normal(n) * np.exp(-np.arange(n) / (0.005 * SR)), 180, 2)
        add(x, th / (np.abs(th).max() + 1e-9), lt, thump)
    # spring: irregular, decaying contacts, each coloured by the same metal
    st, sg = lt + 0.007, 0.34 * latch
    for _ in range(spring):
        c = burst(rng, 0.002, 0.00035, 900, 6000)
        add(x, c + modal(c, METAL, [4, 3.5, 3, 2.6, 2.2, 1.9, 1.6], [0.6] * 7) * 0.5, st, sg)
        st += rng.uniform(0.005, 0.011)
        sg *= rng.uniform(0.58, 0.74)
    # a burst of bits: held random values (aperiodic, so no pitch), crushed to 4 bits
    if bits > 0:
        n = n_of(0.018)
        b = hold(rng.uniform(-1, 1, n), 22) * np.exp(-np.arange(n) / (0.0045 * SR))
        add(x, bp(crush(b, 4), 700, 6500), lt + 0.006, bits)
    x = np.tanh(x * 1.5) / 1.5
    return finish(x, 6)


B_FAMILY = {
    'B1_soft': ('soft: three quiet servo steps, light latch, short ring, two spring contacts',
                dict(seed=211, steps=3, servo=0.7, latch=0.6, ring_ms=9, spring=2, bits=0.1, dur=0.11)),
    'B2_mid': ('mid: five steps into a metal latch with a spring settle', dict(seed=221, steps=5, servo=0.9, latch=0.9, ring_ms=14, spring=5, bits=0.18)),
    'B3_strong': ('strong: long servo run, heavy metal latch, weight, full spring (the logo lock)',
                  dict(seed=231, steps=7, servo=1.0, latch=1.15, ring_ms=22, spring=8, thump=0.55, bits=0.22, dur=0.22)),
}


# ---------------------------------------------------------------------------------------
# C: GRAIN family (lengths)
# ---------------------------------------------------------------------------------------
def grain(seed, dur=0.26, attack=0.025, release=0.10, rate=950, swell=False):
    """Scanner head: Poisson cloud of crushed noise grains over a stepped, held-noise bed.
    swell=True makes the density rise to the end instead of falling (leads into a hit)."""
    rng = np.random.default_rng(seed)
    n = n_of(dur)
    tt = np.arange(n) / SR
    if swell:
        dens = np.clip(tt / dur, 0, 1) ** 1.6
        dens *= np.clip((dur - tt) / 0.004, 0, 1)
    else:
        hold_to = dur - release
        dens = np.clip(tt / attack, 0, 1) * np.where(tt < hold_to, 1.0, 0.5 * (1 + np.cos(np.pi * np.clip((tt - hold_to) / release, 0, 1))))
    L, R = np.zeros(n), np.zeros(n)
    t = 0.0
    while t < dur:
        d = dens[min(n - 1, n_of(t))]
        t += rng.exponential(1 / (rate * max(d, 0.05)))
        if t >= dur or rng.random() > d:
            continue
        gl = rng.uniform(0.0004, 0.0025)
        g = rng.standard_normal(n_of(gl)) * np.hanning(n_of(gl))
        fc = np.exp(rng.uniform(np.log(1200), np.log(9000)))
        g = bp(np.concatenate([g, np.zeros(64)]), fc / 1.6, fc * 1.6, 1)
        amp = rng.uniform(0.25, 1.0)
        a = (rng.uniform(-0.45, 0.45) + 1) * np.pi / 4
        i = n_of(t)
        m = min(len(g), n - i)
        L[i:i + m] += g[:m] * amp * np.cos(a)
        R[i:i + m] += g[:m] * amp * np.sin(a)
    bed = hp(hold(rng.standard_normal(n), 6), 900, 2)
    steps = np.zeros(n)
    i = 0
    while i < n:
        k = n_of(rng.uniform(0.012, 0.025))
        steps[i:i + k] = rng.uniform(0.3, 1.0)
        i += k
    steps = lp(steps, 400, 1)
    bed = crush(bed / np.abs(bed).max(), 6) * steps * dens * 0.33
    x = np.stack([L + bed, R + bed], 1)
    x = np.tanh(x * 1.3) / 1.3
    return np.stack([finish(x[:, 0], 8), finish(x[:, 1], 8)], 1)


C_FAMILY = {
    'C1_short': ('short: 120 ms, for quick passes', dict(seed=311, dur=0.12, attack=0.015, release=0.05)),
    'C2_mid': ('mid: round-1 grain, 260 ms', dict(seed=303)),
    'C3_long': ('long: 520 ms, sparser, for slow traces and the sparkles flying in', dict(seed=331, dur=0.52, attack=0.06, release=0.2, rate=700)),
    'C4_swell': ('pre-swell: 160 ms, density rising into the chrome wipe hit', dict(seed=341, dur=0.16, rate=1100, swell=True)),
}

FAMILY_OF = {'A': (shutter, A_FAMILY), 'B': (lock, B_FAMILY), 'C': (grain, C_FAMILY)}


# ---------------------------------------------------------------------------------------
# The plan: per scene, which events sound, which variant, which tier.
# Keys are cue ids from the picture's timeline. Anything not listed is silent on purpose.
# (sound, tier[, offset in frames]) ; a list plays several.
# ---------------------------------------------------------------------------------------
SCENES = {
    'Boot': 'one soft grain as the system wakes',
    'Present': 'hard entry: the strongest cut of the film, a soft scan lock, the brain as a soft grain, a mid type hit',
    'Build (ring)': 'mechanical detail: a soft negative cut, a metal lock on the ring',
    'Train': 'chrome: a swell into a heavy hit; the scan is silent; the white eagle as a soft grain',
    'Build (notebook)': 'quiet: a soft entry, a soft lock, then the logo and the word ring on one long soft grain; the contour trace stays silent',
    'Run': 'speed: mid entry, silent scan, the tiger as a quick mid grain, a soft tick on RUN',
    'Team': 'calm: the cut is silent, a mid lock on the two of them, a tick for the figures',
    'Recover': 'insight: a mid 1-bit cut, the orbital HUD locks on the head with the metal lock, the sword a beat later as a quick soft grain, a soft negative',
    'Repeat': 'chrome again: swell into a heavy hit, a soft lock, the Spartan helmet as a soft grain',
    'Outro': 'a four-shot motor drive that fades, the sparkles fly in, the strong metal lock, the wordmark grains',
}
PLAN = {
    'boot': [('C1_short', 'soft')],
    'p-in': [('A1_heavy', 'strong')],
    'p-scan': [('B1_soft', 'soft')],
    'p-el': [('C1_short', 'soft')],
    'p-type': [('A3_mid_tight', 'mid')],
    'b1-in': [('A4_soft', 'mid')],
    'b1-scan': [('B2_mid', 'mid')],
    't-in': [('C4_swell', 'mid', -5), ('A1_heavy', 'strong')],
    't-el': [('C2_mid', 'soft')],
    'b2-in': [('A5_soft_dull', 'soft')],
    'b2-scan': [('B1_soft', 'soft')],
    'b2-ring': [('C3_long', 'soft')],
    'r-in': [('A2_mid', 'mid')],
    'r-el': [('C1_short', 'mid')],
    'r-type': [('A6_tick', 'soft')],
    'tm-scan': [('B2_mid', 'mid')],
    'tm-el': [('A6_tick', 'soft')],
    'rc-in': [('A3_mid_tight', 'mid')],
    'rc-orbit': [('B2_mid', 'mid')],
    'rc-el': [('C1_short', 'soft')],
    'rc-neg': [('A4_soft', 'soft')],
    'rp-in': [('C4_swell', 'mid', -5), ('A1_heavy', 'strong')],
    'rp-scan': [('B1_soft', 'soft')],
    'rp-el': [('C2_mid', 'soft')],
    'recap-1': [('A3_mid_tight', 'soft')],
    'recap-3': [('A4_soft', 'soft')],
    'recap-5': [('A5_soft_dull', 'soft')],
    'recap-7': [('A6_tick', 'soft')],
    'converge': [('C3_long', 'mid')],
    'lockup': [('B3_strong', 'strong')],
    'wordmark': [('C1_short', 'soft')],
}
SCENE_OF_SHOT = ['Present', 'Build (ring)', 'Train', 'Build (notebook)', 'Run', 'Team', 'Recover', 'Repeat']


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
    return 20 * np.log10(np.abs(signal.resample_poly(stereo(x), 4, 1, axis=0)).max() + 1e-12)


def qc(name, x):
    x = stereo(x)
    tail = x[-n_of(0.005):]
    mono = x.mean(1)
    l, r = x[:, 0], x[:, 1]
    corr = float(np.corrcoef(l, r)[0, 1]) if np.std(l) > 0 and np.std(r) > 0 else 1.0
    st_e = np.mean(l ** 2 + r ** 2) / 2
    return {
        'name': name,
        'dur_ms': round(len(x) / SR * 1000, 1),
        'momentary_lufs': round(momentary(x), 1),
        'sample_peak_dbfs': round(20 * np.log10(np.abs(x).max() + 1e-12), 2),
        'true_peak_dbtp': round(true_peak(x), 2),
        'first_sample': float(np.abs(x[0]).max()),
        'last_sample': float(np.abs(x[-1]).max()),
        'tail_5ms_dbfs': round(20 * np.log10(np.sqrt(np.mean(tail ** 2)) + 1e-12), 1),
        'dc': float(np.abs(x.mean(0)).max()),
        'lr_correlation': round(corr, 3),
        'mono_sum_change_db': round(10 * np.log10((np.mean(mono ** 2) + 1e-20) / (st_e + 1e-20)), 2),
    }


def write(path, x):
    sf.write(path, stereo(x), SR, subtype='PCM_24')


def add2(dst, x, t):
    i = n_of(t)
    n = min(len(x), len(dst) - i)
    dst[i:i + n] += x[:n]


def tc(frame, fps=30):
    s, f = divmod(frame, fps)
    return f'00:00:{s:02d}:{f:02d}'


# ---------------------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------------------
def main():
    os.makedirs(OUT, exist_ok=True)
    raw = {}
    desc = {}
    for fam, (fn, table) in FAMILY_OF.items():
        for name, (d, kw) in table.items():
            raw[name] = fn(**kw)
            desc[name] = d
    # level-match every variant, then one common trim so the loudest true peak clears the ceiling
    gains = {k: 10 ** ((MATCH_LUFS - momentary(x)) / 20) for k, x in raw.items()}
    worst = max(true_peak(raw[k] * g) for k, g in gains.items())
    trim = min(1.0, 10 ** ((TP_CEIL - 0.2 - worst) / 20))
    matched = {k: stereo(raw[k] * gains[k] * trim) for k in raw}
    for k, x in matched.items():
        write(os.path.join(OUT, f'{k}.wav'), x)

    # audition reel: each family in order, level-matched, 0.5 s apart (0.8 s for long sounds)
    reel = np.zeros((n_of(20.0), 2))
    marks, t = [], 0.5
    for fam in 'ABC':
        for k in FAMILY_OF[fam][1]:
            add2(reel, matched[k], t)
            marks.append((t, k, desc[k]))
            t += max(0.5, len(matched[k]) / SR + 0.3)
        t += 0.6
    reel = reel[:n_of(t + 0.5)]
    write(os.path.join(OUT, 'audition-reel.wav'), reel)

    # the film: only planned cues sound, at their tier, panned to where they happen
    total = CUES['total'] / CUES['fps']
    film = np.zeros((n_of(total + 0.5), 2))
    rows = []
    fps = CUES['fps']
    for c in CUES['cues']:
        for item in PLAN.get(c['id'], []):
            name, tier = item[0], item[1]
            off = item[2] if len(item) > 2 else 0
            a = (c['pan'] + 1) * np.pi / 4
            x = matched[name] * 10 ** (TIER_DB[tier] / 20) * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2)
            at = c['t'] + off / fps
            add2(film, x, at)
            rows.append(c | {'sound': name, 'tier': tier, 'frame_played': c['frame'] + off, 't_played': round(at, 4)})
    film = film[:n_of(total)]
    film *= 10 ** ((TP_CEIL - true_peak(film)) / 20)  # the strong hits peak at the ceiling, soft ones stay soft
    write(os.path.join(WORK, 'soundtrack.wav'), film)

    report = [qc(k, matched[k]) for k in matched] + [qc('audition reel', reel), qc('film soundtrack', film)]
    write_cue_sheet(rows, marks, len(CUES['cues']))
    write_qc(report, trim, film)
    silent = len(CUES['cues']) - len({r['id'] for r in rows})
    print(f'{len(rows)} sounds on {len({r["id"] for r in rows})} of {len(CUES["cues"])} events ({silent} silent);',
          'tiers', {t: sum(1 for r in rows if r['tier'] == t) for t in TIER_DB})
    for r in report:
        print(r['name'], r['dur_ms'], 'ms', r['true_peak_dbtp'], 'dBTP', 'corr', r['lr_correlation'])


def write_cue_sheet(rows, marks, n_events):
    fields = ['id', 'frame_played', 'timecode', 't_played', 'fn', 'sound', 'tier', 'pan', 'chapter', 'look', 'note']
    with open(os.path.join(OUT, 'cue-sheet.csv'), 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: (tc(r['frame_played']) if k == 'timecode' else r[k]) for k in fields})
    md = ['# SKRALOVNIK film: SFX cue sheet (round 2)', '',
          'Round 1 feedback: A works but repeats too often; B works, wants more metal and spring; C works; '
          'overall too many sounds and one pattern repeating through the film. Round 2: families of variants, '
          f'a pattern per scene, {len(rows)} sounds on {len({r["id"] for r in rows})} of {n_events} picture events, '
          f'tiers soft {TIER_DB["soft"]:+.1f} dB, mid {TIER_DB["mid"]:+.1f} dB, strong {TIER_DB["strong"]:+.1f} dB.', '',
          'Picture: v3 (footage in its own colour, the edit in bursts and in white: scan, result, flashes).', '',
          '## Patterns per scene', '', '| Scene | Pattern |', '|---|---|']
    md += [f'| {s} | {p} |' for s, p in SCENES.items()]
    md += ['', '## Film cues', '', '| # | Timecode | Function | Sound | Tier | Pan | Scene | Event |', '|---|---|---|---|---|---|---|---|']
    for i, r in enumerate(rows, 1):
        scene = SCENE_OF_SHOT[r['shot']] if 0 <= r['shot'] < 8 else r['chapter']
        md.append(f"| {i} | {tc(r['frame_played'])} | {r['fn']} | {r['sound']} | {r['tier']} | {r['pan']:+.2f} | {scene} | {r['note']} |")
    md += ['', '## Audition reel (level-matched)', '', '| Time | Sound | What it is |', '|---|---|---|']
    md += [f'| {t:.2f} s | {k} | {d} |' for t, k, d in marks]
    open(os.path.join(OUT, 'cue-sheet.md'), 'w').write('\n'.join(md) + '\n')


def write_qc(report, trim, film):
    integ = pyln.Meter(SR).integrated_loudness(film)
    md = ['# SFX QC (round 2)', '',
          f'Level match: every variant at {MATCH_LUFS:.0f} LUFS momentary, then trimmed {20 * np.log10(trim):+.2f} dB '
          f'so the loudest true peak stays under {TP_CEIL:.0f} dBTP. Tiers are applied only in the film mix.', '',
          '| File | Length | Momentary (max) | Sample peak | True peak | First / last sample | Last 5 ms | DC | L/R corr. | Mono sum |',
          '|---|---|---|---|---|---|---|---|---|---|']
    for r in report:
        md.append(f"| {r['name']} | {r['dur_ms']:.0f} ms | {r['momentary_lufs']:.1f} LUFS | {r['sample_peak_dbfs']:.2f} dBFS | "
                  f"{r['true_peak_dbtp']:.2f} dBTP | {r['first_sample']:.1e} / {r['last_sample']:.1e} | {r['tail_5ms_dbfs']:.0f} dBFS | "
                  f"{r['dc']:.1e} | {r['lr_correlation']:.3f} | {r['mono_sum_change_db']:+.2f} dB |")
    md += ['', f'Film soundtrack integrated loudness: {integ:.1f} LUFS (sparse, mostly soft transients).', '',
           '- **Clean endings:** every file starts and ends on zero and the last 5 ms sit far below audibility.',
           '- **Mono compatibility:** A and B are mono sources (L = R). C scatters grains across the field without inter-channel delay, so its mono sum loses only the uncorrelated part and never comb-filters.',
           '- **Peaks:** true peak is measured with 4x oversampling.', '']
    open(os.path.join(OUT, 'qc.md'), 'w').write('\n'.join(md) + '\n')


if __name__ == '__main__':
    main()
