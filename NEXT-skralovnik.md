# SKRALOVNIK film: naslednji koraki (posodobljeno 28. 9. 2026)

v1 je končan in pushan na `claude/great-pascal-hvqe4s`:
- `video/skralovnik-v1.mp4` (master)
- `video/skralovnik-v1-web.mp4` (8 Mb/s)
- SFX krog 1 v `sfx/skralovnik/`

**v2 je narejen** (`video/skralovnik-v2.mp4`, web `video/skralovnik-v2-web.mp4`) po feedbacku spodaj in s tvojimi overlay elementi. Naslednje: tvoj feedback na v2 (sliko in SFX krog 2 v kontekstu) z obširno anketo.

## Kako sprašujem
Ob vsakem začetku seje najprej vprašam s pop-up anketo. Vprašanja so obširna, vsako razložim po domače, pri vsakem odgovoru pa napišem, kaj bo spremenil.

## 1. SFX feedback krog 1 (28. 9.)
- **A SHUTTER:** deluje, "kul je". Naj se **manjkrat ponovi**.
- **B LOCK:** deluje, obdrži. Dodaj **več dinamike: kovina, metal, vzmet**.
- **C GRAIN:** deluje.
- **Celota:**
  - malo preveč zvokov;
  - vzorec se ponavlja skozi video in to moti;
  - **vsaka scena naj ima drugačen vzorec**, usklajen s sliko;
  - manj zvokov, **večinoma mehki**, le **par močnejših**.

SFX krog 2 (variacije, ker je feedback zdaj dan):
- A: družina različic, nikoli dvakrat zapored ista.
- B: z bolj kovinsko/vzmetno mehaniko, po mehkosti razdeljen v različice.
- C: različice po dolžini.
- Pravila redčenja: manj dogodkov, hierarhija mehko/močno, vzorec po sceni.

## 2. Vizual feedback krog 1 (28. 9.): v2 smer
- **Kader ostane tak, kot je:**
  - originalna **barva** in originalna **hitrost** videa;
  - **brez približevanja** (punch-in gre ven).
- **Edit je overlay čez kader**, nadgradnja v "Iron Man / Jarvis" stilu, **črno-bel**, HUD iz **minimalnih črt**.
- **Smejo prekriti cel kader za 1–2 sličici:**
  - negativ / color invert;
  - velik napis **čez** premikajoč kader;
  - krom iskrica na rezu;
  - 1-bit pikasti kader.
- **Vse ostalo je samo overlay:**
  - črni IG/SYS okvirji postanejo paneli čez kader;
  - krom zvezda na črnem postane krom čez kader;
  - bel papir z napisom postane napis čez kader;
  - črna sličica ostane samo HUD čez kader.
- **Konec:** krom iskrice se zaklenejo, nato postanejo **ploščat logo kot na spletni strani** (bel z zamikom).
- **Oznake:** lahko več, IG stil, a **minimalistične, brez šuma**.
- **Overlay elementi (28. 9.):** možgani, orel, gepard, trije ljudje, oko (prosojni PNG/WebP, v `public/skralovnik/elements/src/`).
  - Razporeditev: PRESENT = možgani, TRAIN = orel, RUN = gepard, TEAM = trije ljudje, RECOVER = oko, REPEAT = orel. Oba BUILD kadra imata samo scan.
  - Minimalistično, abstraktno. Okrogel scan analizira, nato se kot **rezultat** ob njem **bliskovito** (4 sličice) pokaže element.
  - Barva se prilagodi kadru: beli na temnih, črni na svetlih (REPEAT je bel, ker je ozadje temno).
- **Dodatno pojasnilo (28. 9.):** video je večino časa v originalni barvi, overlayi niso stalno sivo-beli, ampak le bliskoviti.
  - Stalne oznake: ostanejo, pol gre ven (odstranjeni timecode, števec sličic, DAY.LOOP, črtna koda).
  - Čist kader: **~60 %** (izmerjeno v2: 60 %, po kadrih 55–66 %).

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
