const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  ['Exportovať JSON', '{t("app.exportJson") || "Exportovať JSON"}'],
  ['Exportovať Font', '{t("app.exportFontBtn") || "Exportovať Font"}'],
  ['Batch Apply ({slaveFonts.length})', '{t("app.batchApply") || "Aplikovať voľby"} ({slaveFonts.length})']
];

for (const [s, r] of replacements) {
  app = app.split(s).join(r);
}

// Add language switcher right before the flex container ending at line 629
app = app.replace(
  '        </div>\n        </div>\n      </header>',
  `          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded ml-2 px-1 py-1 text-xs">
            <button onClick={() => setLang('sk')} className={\`px-2 py-1 rounded transition-colors \${lang === 'sk' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}\`}>SK</button>
            <button onClick={() => setLang('cz')} className={\`px-2 py-1 rounded transition-colors \${lang === 'cz' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}\`}>CZ</button>
          </div>
        </div>
        </div>
      </header>`
);

fs.writeFileSync('src/App.tsx', app);

let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

const skNewKeys = `
    "app.exportJson": "Exportovať JSON",
    "app.exportFontBtn": "Exportovať Font",
    "app.batchApply": "Hromadné aplikovanie",
`;

const czNewKeys = `
    "app.exportJson": "Exportovat JSON",
    "app.exportFontBtn": "Exportovat Font",
    "app.batchApply": "Hromadná aplikace",
`;

i18n = i18n.replace(/"app\.open": "Otvoriť",/g, `"app.open": "Otvoriť",${skNewKeys}`);
i18n = i18n.replace(/"app\.open": "Otevřít",/g, `"app.open": "Otevřít",${czNewKeys}`);

fs.writeFileSync('src/lib/i18n.tsx', i18n);

console.log("Cleanup editor header done");
