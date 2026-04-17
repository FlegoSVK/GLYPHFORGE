const fs = require('fs');

let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

const skNewKeys = `
    "alert.unknownError": "Neznáma chyba",
`;

const czNewKeys = `
    "alert.unknownError": "Neznámá chyba",
`;

i18n = i18n.replace(/"alert\.invalidJson": "Neplatný formát JSON súboru\.",/g, `"alert.invalidJson": "Neplatný formát JSON súboru.",${skNewKeys}`);
i18n = i18n.replace(/"alert\.invalidJson": "Neplatný formát JSON souboru\.",/g, `"alert.invalidJson": "Neplatný formát JSON souboru.",${czNewKeys}`);

fs.writeFileSync('src/lib/i18n.tsx', i18n);

let hook = fs.readFileSync('src/hooks/useFontEditor.ts', 'utf8');
hook = hook.replace(
  "alert(t('alert.loadFailed', {msg: err.message || 'Neznáma chyba'}));",
  "alert(t('alert.loadFailed', {msg: err.message || t('alert.unknownError')}));"
);
fs.writeFileSync('src/hooks/useFontEditor.ts', hook);

console.log("Cleanup unknownError done");
