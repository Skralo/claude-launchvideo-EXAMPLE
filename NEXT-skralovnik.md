# SKRALOVNIK film: naslednji koraki (stanje 27. 9. 2026)

v1 je končan in pushan na `claude/great-pascal-hvqe4s`:
- `video/skralovnik-v1.mp4` (master)
- `video/skralovnik-v1-web.mp4` (8 Mb/s)
- SFX krog 1 v `sfx/skralovnik/`

Nadaljujeva jutri.

## 1. SFX krog 1: čaka na tvoje mnenje (po SFX promptu)
Za vsak prototip: deluje / ne deluje + **zakaj**. Variacij ne delam, dokler tega ni.
- **A SHUTTER** (micro-cut, transition): deluje / premehak / preoster / napačen karakter
- **B LOCK** (object lock, resolve): deluje / premalo zaklepa / preveč digitalen / napačen karakter
- **C GRAIN** (texture movement): deluje / preveč šumi / premalo se sliši / napačen karakter

Iz odgovorov: popravim prototipe, šele potem naredim variacije (npr. več različic za micro-cut, da se v rafalu na koncu ne ponavlja isti vzorec).

## 2. Vizual v1: odločitve
- **Tempo:** še hitreje (bližje X referenci, več 1–3 sličičnih vložkov na kader) ali bolj umirjeno?
  - Meja pri hitrejšem tempu: največ 3 bliski na sekundo (WCAG 2.3.1). Zdaj so 2.
- **Simbol na koncu:** 3D krom (zdaj) ali ploščat bel z zamikom kot na spletni strani?
- **Barva:** ostane č/b z rdečo savno kot edinim poudarkom, ali več originalnih barv?
- **Tvoji komentarji** na posamezne trenutke (timecode + kaj spremeniti).

## 3. Če video zamenja hero na spletni strani (`Skralo/skralovnik`, branch `website-v1`)
- Stran že sama prekriva video z logom in poglavji (`CHAPTERS` v `main.js`). Video ju zdaj ima tudi v sliki, zato bi se podvajala.
  - Možnost a: na strani odstranim prekrivanje.
  - Možnost b: izrišem "clean" verzijo videa brez HUD-a in loga.
- Časi rezov so zamaknjeni za +6 sličic (boot), film traja 10,1 s namesto 8 s. `CHAPTERS` je treba na novo izmeriti.
- Nov poster (prva sličica je zdaj skoraj črna) in mobilna verzija 1280×720 (kot `hero-mobile.mp4`).

## 4. Odprte možnosti (niso zahtevane)
- 9:16 verzija za IG/Reels (zdaj izbran samo 16:9).
- 4K master (pipeline to podpira z `--scale=2`).

## 5. Tehnično za novo sejo
Pipeline: `npm run skralovnik`

Za zagon potrebuje:
- `npm install`
- `pip install numpy scipy opencv-python-headless pillow soundfile pyloudnorm imageio-ffmpeg`
- `ffmpeg` z libx264 v PATH. V tej seji je bil to static build iz `imageio-ffmpeg`, symlinkan v `/usr/local/bin/ffmpeg`, ker Remotionov ffmpeg nima vseh filtrov.

Ostalo:
- Plate slike niso v gitu. `prep.py --skip-track` jih znova ustvari iz `public/skralovnik/source.mp4`.
- `track.json` je v gitu, zato MediaPipe ni potreben. Za ponovni tracking rabiš še `pip install mediapipe` + `apt-get install libegl1 libgles2`.
- Referenca X in IG sta bili naloženi kot posnetka zaslona in nista v repu. Domeni x.com in instagram.com sta v tem okolju blokirani.
