# SFX QC (round 2)

Level match: every variant at -20 LUFS momentary, then trimmed -8.52 dB so the loudest true peak stays under -1 dBTP. Tiers are applied only in the film mix.

| File | Length | Momentary (max) | Sample peak | True peak | First / last sample | Last 5 ms | DC | L/R corr. | Mono sum |
|---|---|---|---|---|---|---|---|---|---|
| A1_heavy | 100 ms | -28.5 LUFS | -7.40 dBFS | -5.58 dBTP | 0.0e+00 / 0.0e+00 | -130 dBFS | 5.4e-05 | 1.000 | +0.00 dB |
| A2_mid | 85 ms | -28.5 LUFS | -5.65 dBFS | -5.02 dBTP | 0.0e+00 / 0.0e+00 | -126 dBFS | 8.6e-05 | 1.000 | +0.00 dB |
| A3_mid_tight | 85 ms | -28.5 LUFS | -3.80 dBFS | -1.94 dBTP | 0.0e+00 / 0.0e+00 | -136 dBFS | 5.3e-05 | 1.000 | +0.00 dB |
| A4_soft | 60 ms | -28.5 LUFS | -3.79 dBFS | -3.77 dBTP | 0.0e+00 / 0.0e+00 | -125 dBFS | 3.0e-05 | 1.000 | +0.00 dB |
| A5_soft_dull | 50 ms | -28.5 LUFS | -3.69 dBFS | -3.69 dBTP | 0.0e+00 / 0.0e+00 | -101 dBFS | 4.5e-04 | 1.000 | +0.00 dB |
| A6_tick | 35 ms | -28.5 LUFS | -1.87 dBFS | -1.20 dBTP | 0.0e+00 / 0.0e+00 | -89 dBFS | 2.7e-04 | 1.000 | +0.00 dB |
| B1_soft | 110 ms | -28.5 LUFS | -5.15 dBFS | -4.89 dBTP | 0.0e+00 / 0.0e+00 | -129 dBFS | 1.5e-05 | 1.000 | +0.00 dB |
| B2_mid | 160 ms | -28.5 LUFS | -5.65 dBFS | -5.31 dBTP | 0.0e+00 / 0.0e+00 | -150 dBFS | 1.3e-06 | 1.000 | +0.00 dB |
| B3_strong | 220 ms | -28.5 LUFS | -8.46 dBFS | -8.06 dBTP | 0.0e+00 / 0.0e+00 | -156 dBFS | 3.2e-06 | 1.000 | +0.00 dB |
| C1_short | 120 ms | -28.5 LUFS | -13.71 dBFS | -11.65 dBTP | 0.0e+00 / 0.0e+00 | -77 dBFS | 7.8e-07 | 0.947 | -0.13 dB |
| C2_mid | 260 ms | -28.5 LUFS | -16.58 dBFS | -15.69 dBTP | 0.0e+00 / 0.0e+00 | -104 dBFS | 6.4e-07 | 0.944 | -0.12 dB |
| C3_long | 520 ms | -28.5 LUFS | -18.25 dBFS | -16.66 dBTP | 0.0e+00 / 0.0e+00 | -109 dBFS | 1.3e-10 | 0.943 | -0.13 dB |
| C4_swell | 160 ms | -28.5 LUFS | -9.56 dBFS | -9.41 dBTP | 0.0e+00 / 0.0e+00 | -36 dBFS | 1.2e-06 | 0.969 | -0.07 dB |
| audition reel | 9700 ms | -28.5 LUFS | -1.87 dBFS | -1.20 dBTP | 0.0e+00 / 0.0e+00 | -240 dBFS | 2.5e-06 | 0.987 | -0.03 dB |
| film soundtrack | 10100 ms | -22.3 LUFS | -2.82 dBFS | -1.00 dBTP | 0.0e+00 / 0.0e+00 | -240 dBFS | 4.0e-06 | 0.979 | -0.05 dB |

Film soundtrack integrated loudness: -27.5 LUFS (sparse, mostly soft transients).

- **Clean endings:** every file starts and ends on zero and the last 5 ms sit far below audibility.
- **Mono compatibility:** A and B are mono sources (L = R). C scatters grains across the field without inter-channel delay, so its mono sum loses only the uncorrelated part and never comb-filters.
- **Peaks:** true peak is measured with 4x oversampling.

