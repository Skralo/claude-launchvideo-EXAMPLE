# SFX QC (round 1)

Level match: every prototype at -20 LUFS momentary (one 400 ms K-weighted block), then trimmed -4.71 dB so the loudest true peak stays under -1 dBTP.

| File | Length | Momentary (max) | Sample peak | True peak | First / last sample | Last 5 ms | DC | L/R corr. | Mono sum |
|---|---|---|---|---|---|---|---|---|---|
| A SHUTTER | 85 ms | -24.7 LUFS | -1.83 dBFS | -1.20 dBTP | 0.0e+00 / 0.0e+00 | -123 dBFS | 1.3e-04 | 1.000 | +0.00 dB |
| B LOCK | 115 ms | -24.7 LUFS | -1.68 dBFS | -1.56 dBTP | 0.0e+00 / 0.0e+00 | -114 dBFS | 4.4e-07 | 1.000 | +0.00 dB |
| C GRAIN | 260 ms | -24.7 LUFS | -12.39 dBFS | -11.76 dBTP | 0.0e+00 / 0.0e+00 | -138 dBFS | 6.0e-09 | 0.943 | -0.13 dB |
| audition reel | 9000 ms | -24.7 LUFS | -1.68 dBFS | -1.20 dBTP | 0.0e+00 / 0.0e+00 | -240 dBFS | 5.0e-06 | 0.983 | -0.04 dB |
| film soundtrack | 10100 ms | -21.9 LUFS | -1.12 dBFS | -1.00 dBTP | 0.0e+00 / 0.0e+00 | -240 dBFS | 2.2e-05 | 0.975 | -0.06 dB |

Film soundtrack integrated loudness: -25.4 LUFS (sparse transients, so integrated reads low; the peaks are what matter).

How to read it:

- **Clean endings:** every file starts and ends on zero (a 0.15 ms fade in, a raised-cosine fade out) and the last 5 ms sit far below audibility.
- **Mono compatibility:** A and B are mono sources (L = R, correlation 1.000, mono sum 0 dB). C scatters its grains across the stereo field; its correlation stays positive and the mono sum loses only what uncorrelated grains always lose, with no comb filtering because nothing is delayed between channels.
- **Peaks:** true peak is measured with 4x oversampling.

