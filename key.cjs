const fs = require('fs');
let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

i18n = i18n.replace(/"charList\.filter\.all": "Všetky",/g, '"charList.editToolTip": "Upraviť znak",\n    "charList.filter.all": "Všetky",');
i18n = i18n.replace(/"charList\.filter\.all": "Všechny",/g, '"charList.editToolTip": "Upravit znak",\n    "charList.filter.all": "Všechny",');

fs.writeFileSync('src/lib/i18n.tsx', i18n);
