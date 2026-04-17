const fs = require('fs');

let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

const skNewKeys = `
    "alert.bulkDeploySuccess": "Hromadné nasadenie dokončené pre {count} rezov.",
`;

const czNewKeys = `
    "alert.bulkDeploySuccess": "Hromadné nasazení dokončeno pro {count} řezů.",
`;

i18n = i18n.replace(/"alert\.bulkDeployError": "Chyba pri hromadnom nasadzovaní\.",/g, `"alert.bulkDeployError": "Chyba pri hromadnom nasadzovaní.",${skNewKeys}`);
i18n = i18n.replace(/"alert\.bulkDeployError": "Chyba při hromadném nasazování\.",/g, `"alert.bulkDeployError": "Chyba při hromadném nasazování.",${czNewKeys}`);

fs.writeFileSync('src/lib/i18n.tsx', i18n);

let hook = fs.readFileSync('src/hooks/useFontEditor.ts', 'utf8');
hook = hook.replace(
  'alert(`Hromadné nasadenie dokončené pre ${slaveFonts.length} rezov.`);',
  'alert(t("alert.bulkDeploySuccess", { count: String(slaveFonts.length) }));'
);
fs.writeFileSync('src/hooks/useFontEditor.ts', hook);

console.log("Cleanup done");
