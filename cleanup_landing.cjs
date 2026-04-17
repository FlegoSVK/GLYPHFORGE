const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  ['Nahrať fonty', '{t("app.uploadFonts") || "Nahrať fonty"}'],
  ['Potiahni a pusť sem súbory .ttf, .otf alebo .ufont, alebo klikni pre výber', '{t("app.dropDesc") || "Potiahni a pusť sem..."}'],
  ['Podporuje hromadné nahrávanie (Regular, Bold, atď.)', '{t("app.bulkSupport") || "Podporuje hromadné nahrávanie..."}'],
  ['Nedávne projekty', '{t("app.recentProjects") || "Nedávne projekty"}'],
  ['Vymazať históriu', '{t("app.clearHistory") || "Vymazať históriu"}'],
  ['Zatiaľ nemáte žiadne uložené projekty.', '{t("app.noSavedDesc") || "Zatiaľ nemáte žiadne uložené projekty."}'],
  ['Nahrajte font pre začiatok.', '{t("app.uploadToStart") || "Nahrajte font pre začiatok."}'],
  ['Otvoriť', '{t("app.open") || "Otvoriť"}'],
  ['title="Vymazať projekt"', 'title={t("app.deleteProject") || "Vymazať projekt"}']
];

for (const [s, r] of replacements) {
  app = app.split(s).join(r);
}

fs.writeFileSync('src/App.tsx', app);

let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

const skNewKeys = `
    "app.uploadFonts": "Nahrať fonty",
    "app.dropDesc": "Potiahni a pusť sem súbory .ttf, .otf alebo .ufont, alebo klikni pre výber",
    "app.bulkSupport": "Podporuje hromadné nahrávanie (Regular, Bold, atď.)",
    "app.recentProjects": "Nedávne projekty",
    "app.clearHistory": "Vymazať históriu",
    "app.noSavedDesc": "Zatiaľ nemáte žiadne uložené projekty.",
    "app.uploadToStart": "Nahrajte font pre začiatok.",
    "app.open": "Otvoriť",
`;

const czNewKeys = `
    "app.uploadFonts": "Nahrát fonty",
    "app.dropDesc": "Přetáhni a pusť sem soubory .ttf, .otf nebo .ufont, nebo klikni pro výběr",
    "app.bulkSupport": "Podporuje hromadné nahrávání (Regular, Bold, atd.)",
    "app.recentProjects": "Nedávné projekty",
    "app.clearHistory": "Vymazat historii",
    "app.noSavedDesc": "Zatím nemáte žádné uložené projekty.",
    "app.uploadToStart": "Nahrajte font pro začátek.",
    "app.open": "Otevřít",
`;

i18n = i18n.replace(/"app\.deleteProject": "Odstrániť projekt",/g, `"app.deleteProject": "Odstrániť projekt",${skNewKeys}`);
i18n = i18n.replace(/"app\.deleteProject": "Odstranit projekt",/g, `"app.deleteProject": "Odstranit projekt",${czNewKeys}`);

fs.writeFileSync('src/lib/i18n.tsx', i18n);

console.log("Cleanup landing page done");
