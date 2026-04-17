const fs = require('fs');

// 1. Fix i18n
let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

// remove duplicate lines where appropriate
const lines = i18n.split('\n');
const fixedLines = [];
let insideSk = false;
let insideCz = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('"app.selectedCharDesc": "Aktuálně vybraný znak na úpravu",')) {
    // Only keep it in CZ
    if (i > 150) { // roughly cz region
      fixedLines.push(line);
    }
  } else if (line.includes('"app.selectedCharDesc": "Aktuálne vybraný znak na úpravu",')) {
    // Only keep it in SK
    if (i < 150) {
      fixedLines.push(line);
    }
  } else {
    fixedLines.push(line);
  }
}
fs.writeFileSync('src/lib/i18n.tsx', fixedLines.join('\n'));

// 2. Fix useFontEditor.ts
let useFont = fs.readFileSync('src/hooks/useFontEditor.ts', 'utf8');

useFont = useFont.replace(
  /throw new Error\("\{t\("alert\.loadError"\)\}"\);/g,
  'throw new Error(t("alert.loadError"));'
);

useFont = useFont.replace(
  /throw new Error\("\{t\("alert\.woff2"\)\}"\);/g,
  'throw new Error(t("alert.woff2"));'
);

fs.writeFileSync('src/hooks/useFontEditor.ts', useFont);

console.log("Compile errors fixed");
