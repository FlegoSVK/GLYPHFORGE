const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  'title="Posunie diakritiku na všetkých znakoch o zadanú hodnotu (užitočné pre kurzívu)"',
  'title={t("app.globalOffsetDesc")}'
);
app = app.replace(
  'title="Odkiaľ sa berie tvar diakritiky"',
  'title={t("app.diacriticSourceDesc")}'
);
app = app.replace(
  'title="Vytvoriť zložený znak zo základného písmena a diakritiky z fontu"',
  'title={t("props.createCompound")}'
);
app = app.replace(
  'title={`Použiť SVG diakritiku v štýle ${style}`}',
  'title={`${t("app.useSvgStyle")} ${style}`}'
);
app = app.replace(
  'Knižnica diakritiky',
  '{t("app.diacriticLibrary")}'
);

fs.writeFileSync('src/App.tsx', app);

let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

const skNewKeys = `
    "app.globalOffsetDesc": "Posunie diakritiku na všetkých znakoch o zadanú hodnotu (užitočné pre kurzívu)",
    "app.diacriticSourceDesc": "Odkiaľ sa berie tvar diakritiky",
    "app.useSvgStyle": "Použiť SVG diakritiku v štýle",
    "app.diacriticLibrary": "Knižnica diakritiky",
`;

const czNewKeys = `
    "app.globalOffsetDesc": "Posune diakritiku na všech znacích o zadanou hodnotu (užitečné pro kurzívu)",
    "app.diacriticSourceDesc": "Odkud se bere tvar diakritiky",
    "app.useSvgStyle": "Použít SVG diakritiku ve stylu",
    "app.diacriticLibrary": "Knihovna diakritiky",
`;

i18n = i18n.replace(/"app\.batchApply": "Hromadné aplikovanie",/g, `"app.batchApply": "Hromadné aplikovanie",${skNewKeys}`);
i18n = i18n.replace(/"app\.batchApply": "Hromadná aplikace",/g, `"app.batchApply": "Hromadná aplikace",${czNewKeys}`);

fs.writeFileSync('src/lib/i18n.tsx', i18n);

console.log("Cleanup App.tsx texts done");
