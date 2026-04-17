const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the title error
content = content.replace(
  /title="Výstraha: \{t\("props\.targetDiacritic"\)\} sa prekrýva so základným znakom"/g,
  'title={`Výstraha: ${t("check.overlap")}`}'
);

content = content.replace(
  /title="Aktuálne vybraný znak na úpravu"/g,
  'title={t("app.selectedCharDesc") || ""}'
);

content = content.replace(
  /title="Výstraha: Znamienko sa prekrýva so základným znakom"/g,
  'title={`Výstraha: ${t("check.overlap")}`}'
);

content = content.replace(
  />Proporcie sa zdajú byť v poriadku\.</g,
  '>{t("check.proportionOK")}<'
);

fs.writeFileSync('src/App.tsx', content);

// Add missing translation to i18n
let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

if (!i18n.includes('app.selectedCharDesc')) {
  i18n = i18n.replace(
    /"charList\.scaledToLowercase": "Zmenšené na malé písmeno",/g,
    '"charList.scaledToLowercase": "Zmenšené na malé písmeno",\n    "app.selectedCharDesc": "Aktuálne vybraný znak na úpravu",'
  );
  i18n = i18n.replace(
    /"charList\.scaledToLowercase": "Zmenšené na malé písmeno",/g, // CZ version
    '"charList.scaledToLowercase": "Zmenšené na malé písmeno",\n    "app.selectedCharDesc": "Aktuálně vybraný znak na úpravu",'
  );
}

fs.writeFileSync('src/lib/i18n.tsx', i18n);

console.log("App.tsx syntax errors fixed");
