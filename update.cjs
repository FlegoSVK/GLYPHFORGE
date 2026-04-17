const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('useTranslation')) {
  content = content.replace(
      "import { cn } from './lib/utils';",
      "import { cn } from './lib/utils';\nimport { useTranslation } from './lib/i18n';"
  );
  
  content = content.replace(
    /const App = \(\) => \{/,
    "const App = () => {\n  const { t, lang, setLang } = useTranslation();"
  );
}

const replacements = [
  ['>GLYPHFORGE<', '>{t("app.title")}<'],
  ['Created by ', '{t("app.createdBy")} '],
  ['>Nový projekt<', '>{t("app.newProject")}<'],
  ['>Potiahnite font sem alebo<', '>{t("app.dropFile")}<'],
  ['>vyberte z PC<', '>{t("app.browseFile")}<'],
  ['>Uložené projekty<', '>{t("app.savedProjects")}<'],
  ['>Pokračovať s<', '>{t("app.continueWith")}<'],
  ['>Nemáte žiadne uložené projekty.<', '>{t("app.noSavedProjects")}<'],
  ['Odstrániť projekt', '{t("app.deleteProject")}'],
  ['>Znaky<', '>{t("editor.characters")}<'],
  ['title="Zoznam všetkých podporovaných znakov"', 'title={t("editor.characters")}'],
  ['>Nástroje<', '>{t("editor.toolbar")}<'],
  ['title="Nástroje pre hromadné úpravy"', 'title={t("editor.toolbar")}'],
  ['>Vlastnosti<', '>{t("editor.properties")}<'],
  ['title="Nastavenia a vlastnosti vybraného znaku"', 'title={t("editor.properties")}'],
  ['>Náhľad<', '>{t("editor.preview")}<'],
  ['title="Náhľad textu"', 'title={t("editor.preview")}'],
  ['>Pôvodný znak existuje<', '>{t("charList.status.ok")}<'],
  ['>Zložený znak<', '>{t("charList.status.generated")}<'],
  ['>Chýbajúci znak<', '>{t("charList.status.missing")}<'],
  ['>Manuálne upravené<', '>{t("charList.status.edited")}<'],
  ['>Zmenšené na malé písmeno<', '>{t("charList.scaledToLowercase")}<'],
  ['>AUTO úprava<', '>{t("tool.autoFixAll")}<'],
  ['>Zložiť všetky znaky<', '>{t("tool.composeAll")}<'],
  ['>Zrušiť všetky zmeny<', '>{t("tool.resetAll")}<'],
  ['>Doplniť chýbajúce<', '>{t("tool.generateMissing")}<'],
  ['>Vyčistiť vektorové cesty<', '>{t("tool.cleanPaths")}<'],
  ['>Zjednotiť šírku znakov<', '>{t("tool.fixSidebearings")}<'],
  ['>Rozložiť pôvodný znak<', '>{t("props.splitOriginal")}<'],
  ['>Resetovať tento znak<', '>{t("props.resetChar")}<'],
  ['>Opraviť šírku znaku<', '>{t("props.fixWidth")}<'],
  ['>Zmenšiť všetky malé znaky<', '>{t("adv.shrinkAllLowercase")}<'],
  ['>Šírka znaku (Advance Width)<', '>{t("adv.advanceWidth")}<'],
  ['>Vymazať úpravy gumou<', '>{t("adv.clearEraser")}<'],
  ['>Globálny posun X (Kurzíva)<', '>{t("adv.globalOffsetX")}<'],
  ['>Vyberte znak na úpravu z ľavého panela<', '>{t("canvas.selectCharDesc")}<'],
  ['>Potiahnutím presuniete diakritiku<', '>{t("canvas.hintDrag")}<'],
  ['>Medzerník + Ťahanie pre posun plátna<', '>{t("canvas.hintPan")}<'],
  ['>Znamienko sa vertikálne prekrýva so základným znakom.<', '>{t("check.overlap")}<'],
  ['>Pokročilá kontrola momentálne nepodporuje SVG diakritiku.<', '>{t("check.svgNotSupported")}<'],
  ['>Mierka z malých písmen<', '>{t("adv.lowercaseScale")}<'],
  ['>Používa sa pre znaky s háčikom (ď, ť, ľ).<', '>{t("adv.lowercaseScaleDesc")}<'],
  ['>Knižnica SVG znamienok<', '>{t("lib.title")}<'],
  ['>Použiť na znak<', '>{t("lib.select")}<'],
  ['>Odstrániť z knižnice<', '>{t("lib.delete")}<'],
  ['>Knižnica je prázdna. Znaky sa uložia pri exporte fontu.<', '>{t("lib.empty")}<'],
  ['>Automaticky (Z fontu)<', '>{t("props.sourceAuto")}<'],
  ['>Z knižnice SVG<', '>{t("props.sourceLibrary")}<'],
  ['>Použiť na všetko<', '>{t("props.applyToAll")}<'],
  ['>Vytvoriť zložený znak zo základného písmena a diakritiky z fontu<', '>{t("props.createCompound")}<'],
  ['>Extrahované z iných znakov<', '>{t("props.extractedFrom")}<'],
  ['>Transformácia<', '>{t("props.transform")}<'],
  ['>Diakritika<', '>{t("props.targetDiacritic")}<'],
  [' Diakritika ', ' {t("props.targetDiacritic")} '],
  ['>Základný znak<', '>{t("props.targetBase")}<'],
  ['>Pokročilá kontrola<', '>{t("check.title")}<'],
  ['>Exportujem font<', '>{t("export.title")}<'],
  ['>Zlučujem znaky a generujem nový súbor. Toto môže chvíľu trvať...<', '>{t("export.merging")}<'],
  ['Spracovávam znak: ', '{t("export.processing")} '],
  ['>Zdroj diakritiky<', '>{t("props.diacriticSource")}<'],
  ['>Pokročilé<', '>{t("adv.title")}<'],
  ['>Vyberte znak z ľavého panela pre zobrazenie jeho vlastností<', '>{t("noSelection.title")}<'],
  ['>Všetky<', '>{t("charList.filter.all")}<'],
  ['>Upravené<', '>{t("charList.filter.modified")}<'],
  ['>Pôvodné<', '>{t("charList.filter.original")}<'],

  ['title="Nástroj výber a presun (V)"', 'title={t("canvas.selectTool")}'],
  ['title="Guma - vymazať časti znaku (E)"', 'title={t("canvas.eraserTool")}'],
  ['>Veľkosť gumy<', '>{t("canvas.eraserSize")}<'],
  ['>Stav<', '>{t("props.status")}<'],
  ['label="Celková mierka"', 'label={t("props.scale")}'],
  ['label="Posun X"', 'label={t("props.offsetX")}'],
  ['label="Posun Y"', 'label={t("props.offsetY")}'],
  ['label="Rotácia (°)"', 'label={t("props.rotation")}'],
  ['label="Mierka X"', 'label={t("props.scaleX")}'],
  ['label="Mierka Y"', 'label={t("props.scaleY")}'],
  ['label="Skosenie X"', 'label={t("props.skewX")}'],
  ['label="Skosenie Y"', 'label={t("props.skewY")}'],
  ['>Zrkadliť X<', '>{t("props.flipX")}<'],
  ['>Zrkadliť Y<', '>{t("props.flipY")}<'],
  ['label="Šírka znaku (Advance Width)"', 'label={t("adv.advanceWidth")}'],

  ['title="Automaticky vyčistiť, doplniť chýbajúce, zložiť znaky a opraviť medzery"', 'title={t("tool.autoFixAllTitle")}'],
  ['title="Vynútiť zloženie všetkých znakov zo základov a diakritiky z fontu"', 'title={t("tool.composeAllTitle")}'],
  ['title="Vrátiť všetky znaky do pôvodného stavu"', 'title={t("tool.resetAllTitle")}'],
  ['title="Automaticky vygenerovať všetky chýbajúce znaky, pre ktoré existuje recept"', 'title={t("tool.generateMissingTitle")}'],
  ['title="Automaticky vyčistiť a zlúčiť cesty pre všetky znaky s detekovanými problémami"', 'title={t("tool.cleanPathsTitle")}'],
  ['title="Opraviť bočné medzery (Advance Width) pre všetky upravené znaky podľa ich základného znaku"', 'title={t("tool.fixSidebearingsTitle")}'],

  ['title="Nahradiť pôvodný znak zloženým znakom (základ + diakritika) pre možnosť úpravy"', 'title={t("props.splitOriginalTitle")}'],
  ['title="Vrátiť všetky úpravy tohto znaku do pôvodného stavu"', 'title={t("props.resetCharTitle")}'],
  ['title="Automaticky upraviť šírku znaku tak, aby glyf nepresahoval"', 'title={t("props.fixWidthTitle")}'],
  ['title="Zmenší znaky ľ, š, č, ť, ž, ň, ď, ě, ř na lowercase mierku."', 'title={t("adv.shrinkAllLowercaseTitle")}'],
  ['title="Použiť tento zdroj diakritiky pre všetky znaky"', 'title={t("props.applyToAllSourceTitle")}'],
  ['title="Použiť túto transformáciu pre všetky znaky"', 'title={t("props.applyToAllTransformTitle")}'],
  ['title="Obnoviť predvolenú transformáciu"', 'title={t("props.resetTransform")}'],

  ["if (info.status === 'ok') statusText = \"Pôvodný znak existuje\";", "if (info.status === 'ok') statusText = t('charList.status.ok');"],
  ["else if (info.status === 'generated') statusText = \"Zložený znak\";", "else if (info.status === 'generated') statusText = t('charList.status.generated');"],
  ["else if (info.status === 'missing') statusText = \"Chýbajúci znak\";", "else if (info.status === 'missing') statusText = t('charList.status.missing');"],
  ["else if (info.status === 'edited') statusText = \"Manuálne upravené\";", "else if (info.status === 'edited') statusText = t('charList.status.edited');"],
  ["if (info.isScaledToLowercase) statusText += \" (Zmenšené na malé písmeno)\";", "if (info.isScaledToLowercase) statusText += ` (${t('charList.scaledToLowercase')})`;"],

  ['<span>Znamienko presahuje doľava ({Math.round(analysis.leftOverflow)} j.). Môže kolidovať s predchádzajúcim znakom.</span>', '<span>{t("check.overflowLeft", {val: String(Math.round(analysis.leftOverflow))})}</span>'],
  ['<span>Znamienko presahuje doprava ({Math.round(analysis.rightOverflow)} j.). Môže kolidovať s nasledujúcim znakom.</span>', '<span>{t("check.overflowRight", {val: String(Math.round(analysis.rightOverflow))})}</span>'],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

const languageSwitcher = `
            <div className="absolute top-4 right-4 flex items-center bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-xs">
              <button onClick={() => setLang('sk')} className={\`px-3 py-1.5 rounded transition-colors \${lang === 'sk' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}\`}>SK</button>
              <button onClick={() => setLang('cz')} className={\`px-3 py-1.5 rounded transition-colors \${lang === 'cz' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}\`}>CZ</button>
            </div>
`;

if (!content.includes("setLang('cz')")) {
  content = content.replace(/(<div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">)/, '<div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 relative">' + languageSwitcher);
}

fs.writeFileSync('src/App.tsx', content);

// Also update TextTester
let tt = fs.readFileSync('src/components/TextTester.tsx', 'utf8');
if (!tt.includes('useTranslation')) {
    tt = tt.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { useTranslation } from '../lib/i18n';");
    tt = tt.replace("=> {", "=> {\n  const { t } = useTranslation();");
    
    // replacements for texttester
    tt = tt.split('>Náhľad textu<').join('>{t("preview.title")}<');
    tt = tt.split('label="Vlastný text"').join('label={t("preview.customText")}');
    tt = tt.split('label="Pangram (Všetky znaky)"').join('label={t("preview.pangram")}');
    tt = tt.split('label="Typické slová"').join('label={t("preview.words")}');
    tt = tt.split('>Veľkosť<').join('>{t("preview.size")}<');
    tt = tt.split('>Zalomiť<').join('>{t("preview.wrap")}<');
    tt = tt.split('>Zobraz prekrývanie<').join('>{t("preview.overlap")}<');
    tt = tt.split('>Štýlová adaptácia (Exp.)<').join('>{t("preview.stylistic")}<');
    
    fs.writeFileSync('src/components/TextTester.tsx', tt);
}

console.log("Translation injection done");
