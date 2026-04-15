# Editor Diakritiky (Game Font Editor)

## Krátky popis
Webová aplikácia určená primárne na úpravu, opravu a dopĺňanie diakritiky do herných fontov (napr. pre Unreal Engine `.ufont` komunitné preklady hier). Nástroj umožňuje automatické generovanie chýbajúcich znakov, detailné manuálne ladenie pozícií, čistenie vektorových ciest a export upraveného fontu priamo v prehliadači, čím výrazne zjednodušuje proces lokalizácie hier.

## Hlavné funkcie

### 🎮 Podpora pre herné preklady
* **Optimalizované pre herné enginy:** Vygenerované `.ttf` fonty sú pripravené na konverziu do herných formátov (ako `.ufont` pre Unreal Engine).
* **Rýchla lokalizácia:** Nástroj je navrhnutý tak, aby maximálne urýchlil proces pridávania slovenskej/českej diakritiky do originálnych herných fontov.
* **Auto Úprava:** Komplexná funkcia, ktorá jedným kliknutím vykoná 4 kroky v správnom poradí: vyčistí problémové glyfy, doplní chýbajúce znaky, zloží znaky zo základov a opraví bočné medzery.
* **Zložiť všetky znaky:** Vynúti zloženie znakov z ich základného písmena a diakritického znamienka pre jednoduchšiu manipuláciu a oddelenie ciest.
* **Hromadné čistenie a generovanie:** Možnosť aplikovať opravy na všetky znaky vo fonte naraz.

### ✏️ Pokročilá úprava znakov
* **Detailné transformácie:** Posun (X/Y os), zmena mierky (Scale X/Y), rotácia, skosenie (Skew X/Y) a prevrátenie (Flip) diakritiky.
* **Knižnica diakritiky:** Ukladanie vlastných tvarov diakritiky do lokálnej knižnice a ich okamžité opätovné použitie naprieč inými znakmi.
* **Extrakcia z fontu:** Možnosť použiť diakritiku z iného, už existujúceho znaku v nahratom fonte (napr. extrahovať mäkčeň z 'č' a aplikovať ho na 'š').
* **Zmenšenie na lowercase:** Rýchle prispôsobenie veľkosti a pozície diakritiky pre malé písmená.

### 🔍 Analýza a oprava chýb
* **Pokročilá kontrola (Advanced Check):** Vizuálna a dátová analýza pomerov medzi základným znakom a diakritikou. Detekcia problémov s kerningom, vertikálnym prekrývaním a pretekaním (overflow) mimo šírky znaku.
* **Oprava bočných medzier (Fix Side Bearings):** Automatické prispôsobenie šírky znaku (advanceWidth) presne podľa jeho základného písmena (napr. 'Š' bude mať automaticky rovnakú šírku ako 'S').
* **Detekcia anomálií:** Upozornenia na prekrývajúce sa cesty alebo malé izolované časti vektorov s možnosťou ich automatického vyčistenia zlúčením ciest (využíva Paper.js).

### 💾 Správa projektov a Export
* **Lokálna história (Nedávne projekty):** Automatické ukladanie rozpracovaných projektov do pamäte prehliadača (IndexedDB).
* **Správa histórie:** Prehľadné zobrazenie nedávnych projektov na úvodnej obrazovke s možnosťou ich okamžitého načítania, vymazania jednotlivých projektov alebo kompletného vymazania celej histórie.
* **Export do TTF:** Generovanie plne funkčného `.ttf` súboru s vašimi úpravami, pripraveného na inštaláciu do OS.
* **Import/Export JSON:** Zálohovanie a obnova nastavení transformácií diakritiky cez JSON súbory pre prenos práce medzi zariadeniami.
* **Krok späť / Krok vpred (Undo/Redo):** Plná podpora pre vrátenie a opakovanie zmien počas úprav.

## Technológie
* **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons
* **Spracovanie fontov:** opentype.js
* **Vektorové operácie a geometria:** paper.js
* **Lokálne úložisko:** localforage (IndexedDB)
