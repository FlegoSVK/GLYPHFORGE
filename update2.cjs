const fs = require('fs');

// ==== 1. Update useFontEditor.ts ====
let fontEditor = fs.readFileSync('src/hooks/useFontEditor.ts', 'utf8');

if (!fontEditor.includes('useTranslation')) {
  fontEditor = fontEditor.replace(
    'import { useCallback, useState, useEffect, useRef } from \'react\';',
    'import { useCallback, useState, useEffect, useRef } from \'react\';\nimport { useTranslation } from \'../lib/i18n\';'
  );
  
  fontEditor = fontEditor.replace(
    'export function useFontEditor() {',
    'export function useFontEditor() {\n  const { t } = useTranslation();'
  );
  
  // replace alerts and anomalies
  const replacements = [
    ["Nepodarilo sa načítať font: Súbor pravdepodobne nie je platný font (môže ísť o obrázok alebo iný formát).", '{t("alert.loadError")}'],
    ["Formát WOFF2 nie je plne podporovaný. Prosím, prekonvertujte font na TTF alebo OTF.", '{t("alert.woff2")}'],
    ["alert(`Nepodarilo sa načítať font: ${err.message || 'Neznáma chyba'}. Uistite sa, že ide o platný súbor TTF, OTF alebo UFONT.`);", "alert(t('alert.loadFailed', {msg: err.message || 'Neznáma chyba'}));"],
    ['alert("Chyba pri hromadnom nasadení.");', 'alert(t("alert.bulkDeployError"));'],
    ["anomalies.push('Nulová šírka znaku');", "anomalies.push(t('anom.zeroWidth'));"],
    ["anomalies.push('Prázdny glyf');", "anomalies.push(t('anom.emptyGlyph'));"],
    ["anomalies.push('Malé izolované časti');", "anomalies.push(t('anom.islands'));"],
    ["anomalies.push('Prekrývajúce sa alebo zložité cesty');", "anomalies.push(t('anom.complex'));"],
    ["anomalies.push('Diakritika sa prekrýva so základným znakom');", "anomalies.push(t('anom.overlap'));"],
    ["anomalies.push(isLowercase ? 'Malé písmeno má nesprávnu výšku (chová sa ako veľké)' : 'Veľké písmeno má nesprávnu výšku');", "anomalies.push(isLowercase ? t('anom.heightLower') : t('anom.heightUpper'));"],
    ["anomalies.push('Príliš úzke bočné medzery (presah)');", "anomalies.push(t('anom.narrow'));"],
    ['alert("Neplatný JSON súbor.");', 'alert(t("alert.invalidJson"));'],
    ['alert("Nepodarilo sa exportovať font. Pozrite si konzolu pre viac detailov.");', 'alert(t("alert.exportFailed"));'],
    ['alert("Chyba pri ukladaní diakritiky: " + (error instanceof Error ? error.message : String(error)));', 'alert(t("alert.saveDiacriticError", {msg: error instanceof Error ? error.message : String(error)}));'],
    ['const name = prompt("Zadajte názov pre diakritiku:");', 'const name = prompt(t("prompt.diacriticName"));']
  ];
  
  for (const [s, r] of replacements) {
    fontEditor = fontEditor.split(s).join(r);
  }
  
  fs.writeFileSync('src/hooks/useFontEditor.ts', fontEditor);
}


// ==== 2. Update CanvasEditor.tsx ====
let canvasEditor = fs.readFileSync('src/components/CanvasEditor.tsx', 'utf8');

if (!canvasEditor.includes('useTranslation')) {
  canvasEditor = canvasEditor.replace(
    'import React, { useRef, useEffect, useState, useMemo } from \'react\';',
    'import React, { useRef, useEffect, useState, useMemo } from \'react\';\nimport { useTranslation } from \'../lib/i18n\';'
  );
  
  canvasEditor = canvasEditor.replace(
    '  useEffect(() => {', // right inside the component start
    '  const { t } = useTranslation();\n  useEffect(() => {'
  );
  
  const canvasReps = [
    ['>OPTIMÁLNA VÝŠKA<', '>{t("canvas.optHeight")}<'],
    ['Malé písmená', '{t("canvas.lower")}'],
    ['Veľké písmená', '{t("canvas.upper")}']
  ];
  for (const [s, r] of canvasReps) {
    canvasEditor = canvasEditor.split(s).join(r);
  }
  
  fs.writeFileSync('src/components/CanvasEditor.tsx', canvasEditor);
}

// ==== 3. Update App.tsx with remaining texts ====
let app = fs.readFileSync('src/App.tsx', 'utf8');

const appReps = [
  ['title="Kliknite alebo potiahnite súbory pre nahratie fontov"', 'title={t("app.dropHere")}'],
  ["window.confirm('Naozaj chcete vymazať celú históriu projektov? Táto akcia je nevratná.')", "window.confirm(t('app.confirmDeleteHistory'))"],
  ['title="Zavrieť projekt a vrátiť sa na úvodnú obrazovku"', 'title={t("app.closeProject")}'],
  ['title="Logo aplikácie"', 'title={t("app.logo")}'],
  ['title="Aktuálne načítaný font"', 'title={t("app.loadedFont")}'],
  ['title="Neuložené zmeny (automatické ukladanie prebieha...)"', 'title={t("app.unsavedChanges")}'],
  ['title="Krok späť (podržte pre rýchly návrat)"', 'title={t("app.undo")}'],
  ['title="Krok vpred (podržte pre rýchly posun)"', 'title={t("app.redo")}'],
  ['title="Načítať predtým uložené nastavenia diakritiky z JSON súboru"', 'title={t("app.loadSettings")}'],
  ['title="Aplikovať zmeny na všetky nahrané rezy fontu (Bold, Italic, atď.)"', 'title={t("app.applyVariants")}'],
  ['title="Uložiť aktuálne nastavenia diakritiky do JSON súboru"', 'title={t("app.saveSettings")}'],
  ['title="Vygenerovať a stiahnuť upravený font (experimentálne)"', 'title={t("app.downloadFont")}'],
  ['statusText = "Neznámy stav";', 'statusText = t("app.statusUnknown");'],
  ['statusText = "Chýba základ alebo zdroj";', 'statusText = t("app.statusMissing");'],
  ['title="Vrátiť pohľad na stred"', 'title={t("app.recenterView")}'],
  [">Všetky<", ">{t('app.previewAll')}<"],
  [">Nadpis<", ">{t('app.previewHeading')}<"],
  [">Bežný<", ">{t('app.previewBody')}<"],
  [">Micro<", ">{t('app.previewMicro')}<"],
  ['title="Upraviť náhľadový text"', 'title={t("app.editPreview")}'],
  ['title="Automaticky zlúčiť prekrývajúce sa cesty a vyčistiť tvar"', 'title={t("app.autoMerge")}'],
  ['title="Použiť pôvodný glyf priamo z fontu"', 'title={t("app.useOriginal")}'],
  [">'Pôv'<", ">{t('app.pov')}<"],
  [">'Krad'<", ">{t('app.krad')}<"],
  ['title="Pridať aktuálnu diakritiku do knižnice"', 'title={t("app.addToLib")}'],
  ['title="Aplikovať zmenšenie na všetky malé písmená s diakritikou (ľ, š, č, ť, ž, ň, ď, ě, ř, ô, ů, ä)"', 'title={t("app.scaleDesc")}'],
  ['title="Celkové zväčšenie/zmenšenie"', 'title={t("app.scaleAll")}'],
  ['title="Horizontálny posun"', 'title={t("app.moveH")}'],
  ['title="Vertikálny posun"', 'title={t("app.moveV")}'],
  ['title="Otočenie v stupňoch"', 'title={t("app.rotateDeg")}'],
  ['title="Zrkadlovo otočiť horizontálne"', 'title={t("app.flipH")}'],
  ['title="Zrkadlovo otočiť vertikálne"', 'title={t("app.flipV")}'],
  ['title="Horizontálne zväčšenie/zmenšenie"', 'title={t("app.scaleH")}'],
  ['title="Vertikálne zväčšenie/zmenšenie"', 'title={t("app.scaleV")}'],
  ['title="Horizontálne skosenie (naklonenie) v stupňoch"', 'title={t("app.skewHDeg")}'],
  ['title="Vertikálne skosenie v stupňoch"', 'title={t("app.skewVDeg")}'],
  ['title="Analýza proporcií a kerningu"', 'title={t("app.propAnalysis")}'],
  ['title="Knižnica uložených diakritických znamienok"', 'title={t("app.libDesc")}'],
  ['title="Použiť toto znamienko na vybraný znak"', 'title={t("app.applyTarget")}'],
  ['title="Celková šírka znaku (určuje, kde začne ďalší znak)"', 'title={t("app.totalWidth")}'],
  ['title="Vymazať všetky ťahy gumou pre tento znak"', 'title={t("app.eraseAll")}'],
  ['const name = prompt("Zadajte názov pre diakritiku:");', 'const name = prompt(t("prompt.diacriticName"));']
];

for (const [s, r] of appReps) {
  app = app.split(s).join(r);
}

// Ensure the App component correctly uses these replacements (if missing) 
// The initial test for strings includes in 'anomalies.includes'
app = app.replace(
  /info\.anomalies\?\.includes\('Malé izolované časti'\)/g,
  `info.anomalies?.includes(t('anom.islands'))`
);
app = app.replace(
  /info\.anomalies\?\.includes\('Prekrývajúce sa alebo zložité cesty'\)/g,
  `info.anomalies?.includes(t('anom.complex'))`
);
app = app.replace(
  /info\.anomalies\?\.includes\('Diakritika sa prekrýva so základným znakom'\)/g,
  `info.anomalies?.includes(t('anom.overlap'))`
);
app = app.replace(
  /selectedInfo\.anomalies\.includes\('Malé izolované časti'\)/g,
  `selectedInfo.anomalies.includes(t('anom.islands'))`
);
app = app.replace(
  /selectedInfo\.anomalies\.includes\('Prekrývajúce sa alebo zložité cesty'\)/g,
  `selectedInfo.anomalies.includes(t('anom.complex'))`
);
app = app.replace(
  /selectedInfo\.anomalies\.includes\('Príliš úzke bočné medzery \(presah\)'\)/g,
  `selectedInfo.anomalies.includes(t('anom.narrow'))`
);

fs.writeFileSync('src/App.tsx', app);

// Same for TextTester
let tt = fs.readFileSync('src/components/TextTester.tsx', 'utf8');
tt = tt.replace(
  /info\.anomalies\?\.includes\('Diakritika sa prekrýva so základným znakom'\)/g,
  `info.anomalies?.includes(t('anom.overlap'))`
);
fs.writeFileSync('src/components/TextTester.tsx', tt);

console.log("Remaining text replacements completed successfully");
