const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

const remainingTranslations = [
  ["{exportingChar ? `{t(\"export.processing\")} ${exportingChar}` : 'Zlučujem znaky a generujem nový súbor. Toto môže chvíľu trvať...'}", "{exportingChar ? `${t(\"export.processing\")} ${exportingChar}` : t(\"export.merging\")}"],
  [">Zložiť všetky znaky<", ">{t(\"tool.composeAll\")}<"],
  ["`Upraviť znak ${char} (${statusText})`", "`Upravit znak ${char} (${statusText})`"], // Wait, localizing literal strings like this requires translation string.
  ["<span>Náhľad textu</span>", "<span>{t(\"preview.title\")}</span>"],
  ['title="Zalomiť text v náhľade"', 'title={t("preview.wrap")}'],
  [">Resetovať tento znak<", ">{t(\"props.resetChar\")}<"],
  [">Opraviť šírku znaku<", ">{t(\"props.fixWidth\")}<"],
  [">Knižnica je prázdna. Znaky sa uložia pri exporte fontu.<", ">{t(\"lib.empty\")}<"],
  [">Vyberte znak z ľavého panela pre zobrazenie jeho vlastností<", ">{t(\"noSelection.title\")}<"],
  ['info?.anomalies?.includes(\'Diakritika sa prekrýva so základným znakom\')', 'info?.anomalies?.includes(t("anom.overlap"))'],
  ['<label className="text-[10px] text-zinc-500 mb-1 block">Iná diakritika z fontu</label>', '<label className="text-[10px] text-zinc-500 mb-1 block">{t("props.otherDiacritics")}</label>'],
  ['!selectedInfo.isScaledToLowercase ? "Zmenšiť na malé písmeno" : "Zmenšenie zapnuté"', '!selectedInfo.isScaledToLowercase ? t("props.shrinkToLower") : t("props.shrinkOn")'],
  ['`Použiť diakritiku zo znaku ${char}`', '`${t("props.useDiacriticFrom")} ${char}`'],
  ['>Základný znak<', '>{t("props.targetBase")}<'],
  ['>Diakritika<', '>{t("props.targetDiacritic")}<'],
];

for (const [s, r] of remainingTranslations) {
  app = app.split(s).join(r);
}

fs.writeFileSync('src/App.tsx', app);

// Additional i18n
let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');
if (!i18n.includes('props.otherDiacritics')) {
  i18n = i18n.replace(/"props\.extractedFrom": "Extrahované zo znakov",/g, '"props.extractedFrom": "Extrahované zo znakov",\n    "props.otherDiacritics": "Iná diakritika z fontu",\n    "props.shrinkToLower": "Zmenšiť na malé písmeno",\n    "props.shrinkOn": "Zmenšenie zapnuté",\n    "props.useDiacriticFrom": "Použiť diakritiku zo znaku",');
  i18n = i18n.replace(/"props\.extractedFrom": "Extrahováno ze znaků",/g, '"props.extractedFrom": "Extrahováno ze znaků",\n    "props.otherDiacritics": "Jiná diakritika z fontu",\n    "props.shrinkToLower": "Zmenšit na malé písmeno",\n    "props.shrinkOn": "Zmenšení zapnuto",\n    "props.useDiacriticFrom": "Použít diakritiku ze znaku",');
}
fs.writeFileSync('src/lib/i18n.tsx', i18n);

console.log("Cleanup pass completed");
