import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

type Language = 'sk' | 'cz';

export const translations = {
  sk: {
    // Landing Page
    "app.title": "GLYPHFORGE",
    "app.createdBy": "Vytvoril",
    "app.newProject": "Nový projekt",
    "app.dropFile": "Potiahnite font sem alebo",
    "app.browseFile": "vyberte z PC",
    "app.savedProjects": "Uložené projekty",
    "app.continueWith": "Pokračovať s",
    "app.noSavedProjects": "Nemáte žiadne uložené projekty.",
    "app.deleteProject": "Odstrániť projekt",
    "app.uploadFonts": "Nahrať fonty",
    "app.dropDesc": "Potiahni a pusť sem súbory .ttf, .otf alebo .ufont, alebo klikni pre výber",
    "app.bulkSupport": "Podporuje hromadné nahrávanie (Regular, Bold, atď.)",
    "app.recentProjects": "Nedávne projekty",
    "app.clearHistory": "Vymazať históriu",
    "app.noSavedDesc": "Zatiaľ nemáte žiadne uložené projekty.",
    "app.uploadToStart": "Nahrajte font pre začiatok.",
    "app.open": "Otvoriť",
    "app.exportJson": "Exportovať JSON",
    "app.importJson": "Importovať JSON",
    "app.exportFontBtn": "Exportovať Font",
    "app.batchApply": "Hromadné aplikovanie",
    "app.globalOffsetDesc": "Posunie diakritiku na všetkých znakoch o zadanú hodnotu (užitočné pre kurzívu)",
    "app.diacriticSourceDesc": "Odkiaľ sa berie tvar diakritiky",
    "app.useSvgStyle": "Použiť SVG diakritiku v štýle",
    "app.diacriticLibrary": "Knižnica diakritiky",



    
    // Notifications / Actions
    "action.generateMissing": "Generovať chýbajúce",
    "action.generateMissingDesc": "Vygeneruje chýbajúce slovenské znaky...",
    "action.fixFromLibrary": "Oprava podľa knižnice",
    "action.fixFromLibraryDesc": "Aplikuje diakritiku z knižnice...",
    "action.adjustWidth": "Opraviť šírku",
    "action.adjustWidthDesc": "Opraví bočné medzery znakov...",
    "action.exportFont": "Exportovať font",
    "action.exportFontDesc": "Vytvorí nový font so zlúčenými znakmi",
    "action.saveToLibrary": "Uložiť do knižnice",
    "action.saveToLibraryDesc": "Uloží aktuálnu diakritiku",
    "action.confirmDelete": "Naozaj chcete odstrániť projekt?",

    // Header Editor
    "editor.characters": "Znaky",
    "editor.toolbar": "Nástroje",
    "editor.properties": "Vlastnosti",
    "editor.preview": "Náhľad",

    // Toolbar Buttons
    "tool.autoFixAll": "AUTO úprava",
    "tool.autoFixAllTitle": "Automaticky vyčistiť, doplniť chýbajúce, zložiť znaky a opraviť medzery",
    "tool.composeAll": "Zložiť všetky znaky",
    "tool.composeAllTitle": "Vynútiť zloženie všetkých znakov zo základov a diakritiky z fontu",
    "tool.resetAll": "Zrušiť všetky zmeny",
    "tool.resetAllTitle": "Vrátiť všetky znaky do pôvodného stavu",
    "tool.generateMissing": "Doplniť chýbajúce",
    "tool.generateMissingTitle": "Automaticky vygenerovať všetky chýbajúce znaky, pre ktoré existuje recept",
    "tool.cleanPaths": "Vyčistiť vektorové cesty",
    "tool.cleanPathsTitle": "Automaticky vyčistiť a zlúčiť cesty pre všetky znaky s detekovanými problémami",
    "tool.fixSidebearings": "Zjednotiť šírku znakov",
    "tool.fixSidebearingsTitle": "Opraviť bočné medzery (Advance Width) pre všetky upravené znaky podľa ich základného znaku",
    
    // Character List
    "charList.editToolTip": "Upraviť znak",
    "charList.filter.all": "Všetky",
    "charList.filter.modified": "Upravené",
    "charList.filter.original": "Pôvodné",
    "charList.status.ok": "Pôvodný znak existuje",
    "charList.status.generated": "Zložený znak",
    "charList.status.missing": "Chýbajúci znak",
    "charList.status.edited": "Manuálne upravené",
    "charList.scaledToLowercase": "Zmenšené na malé písmeno",
    "app.selectedCharDesc": "Aktuálne vybraný znak na úpravu",

    // Canvas tools
    "canvas.selectTool": "Nástroj výber a presun (V)",
    "canvas.eraserTool": "Guma - vymazať časti znaku (E)",
    "canvas.eraserSize": "Veľkosť gumy",
    "canvas.selectCharDesc": "Vyberte znak na úpravu z ľavého panela",
    "canvas.hintDrag": "Potiahnutím presuniete diakritiku",
    "canvas.hintPan": "Medzerník + Ťahanie pre posun plátna",

    // Properties Panel
    "props.status": "Stav",
    "props.splitOriginal": "Rozložiť pôvodný znak",
    "props.splitOriginalTitle": "Nahradiť pôvodný znak zloženým znakom (základ + diakritika) pre možnosť úpravy",
    "props.resetChar": "Resetovať tento znak",
    "props.resetCharTitle": "Vrátiť všetky úpravy tohto znaku do pôvodného stavu",
    "props.fixWidth": "Opraviť šírku znaku",
    "props.fixWidthTitle": "Automaticky upraviť šírku znaku tak, aby glyf nepresahoval",
    "props.diacriticSource": "Zdroj diakritiky",
    "props.sourceAuto": "Automaticky (Z fontu)",
    "props.sourceLibrary": "Z knižnice SVG",
    "props.applyToAll": "Použiť na všetko",
    "props.applyToAllSourceTitle": "Použiť tento zdroj diakritiky pre všetky znaky",
    "props.applyToAllTransformTitle": "Použiť túto transformáciu pre všetky znaky",
    "props.createCompound": "Vytvoriť zložený znak zo základného písmena a diakritiky z fontu",
    "props.extractedFrom": "Extrahované zo znakov",
    "props.otherDiacritics": "Iná diakritika z fontu",
    "props.shrinkToLower": "Zmenšiť na malé písmeno",
    "props.shrinkOn": "Zmenšenie zapnuté",
    "props.useDiacriticFrom": "Použiť diakritiku zo znaku",
    "props.transform": "Transformácia",
    "props.targetDiacritic": "Diakritika",
    "props.targetBase": "Základný znak",
    "props.resetTransform": "Obnoviť predvolenú transformáciu",
    "props.scale": "Celková mierka",
    "props.offsetX": "Posun X",
    "props.offsetY": "Posun Y",
    "props.rotation": "Rotácia (°)",
    "props.flipX": "Zrkadliť X",
    "props.flipY": "Zrkadliť Y",
    "props.scaleX": "Mierka X",
    "props.scaleY": "Mierka Y",
    "props.skewX": "Skosenie X",
    "props.skewY": "Skosenie Y",
    
    // Validation
    "check.title": "Pokročilá kontrola",
    "check.svgNotSupported": "Pokročilá kontrola momentálne nepodporuje SVG diakritiku.",
    "check.overflowLeft": "Znamienko presahuje doľava ({val} j.). Môže kolidovať s predchádzajúcim znakom.",
    "check.overflowRight": "Znamienko presahuje doprava ({val} j.). Môže kolidovať s nasledujúcim znakom.",
    "check.overlap": "Znamienko sa vertikálne prekrýva so základným znakom.",
    "check.proportionOK": "Proporcie sa zdajú byť v poriadku.",

    // Library
    "lib.title": "Knižnica SVG znamienok",
    "lib.select": "Použiť na znak",
    "lib.delete": "Odstrániť z knižnice",
    "lib.empty": "Knižnica je prázdna. Znaky sa uložia pri exporte fontu.",

    // Advanced Props
    "adv.title": "Pokročilé",
    "adv.advanceWidth": "Šírka znaku (Advance Width)",
    "adv.clearEraser": "Vymazať úpravy gumou",
    "adv.lowercaseScale": "Mierka z malých písmen",
    "adv.lowercaseScaleDesc": "Používa sa pre znaky s háčikom (ď, ť, ľ).",
    "adv.shrinkAllLowercase": "Zmenšiť všetky malé znaky",
    "adv.shrinkAllLowercaseTitle": "Zmenší znaky ľ, š, č, ť, ž, ň, ď, ě, ř na lowercase mierku.",
    "adv.globalOffsetX": "Globálny posun X (Kurzíva)",

    // No selection
    "noSelection.title": "Vyberte znak z ľavého panela pre zobrazenie jeho vlastností",

    // Export Modal
    "export.title": "Exportujem font",
    "export.merging": "Zlučujem znaky a generujem nový súbor. Toto môže chvíľu trvať...",
    "export.processing": "Spracovávam znak:",
    
    // Text Tester (Preview)
    "preview.title": "Náhľad textu",
    "preview.customText": "Vlastný text",
    "preview.pangram": "Pangram (Všetky znaky)",
    "preview.words": "Typické slová",
    "preview.size": "Veľkosť",
    "preview.wrap": "Zalomiť",
    "preview.overlap": "Zobraz prekrývanie",
    "preview.stylistic": "Štýlová adaptácia (Exp.)",
    "anom.zeroWidth": "Nulová šírka znaku",
    "anom.emptyGlyph": "Prázdny glyf",
    "anom.islands": "Malé izolované časti",
    "anom.complex": "Prekrývajúce sa alebo zložité cesty",
    "anom.overlap": "Diakritika sa prekrýva so základným znakom",
    "anom.heightLower": "Malé písmeno má nesprávnu výšku (chová sa ako veľké)",
    "anom.heightUpper": "Veľké písmeno má nesprávnu výšku",
    "anom.narrow": "Príliš úzke bočné medzery (presah)",
    "alert.loadError": "Nepodarilo sa načítať font: Súbor pravdepodobne nie je platný font (môže ísť o obrázok alebo iný formát).",
    "alert.woff2": "Formát WOFF2 nie je plne podporovaný. Prosím, prekonvertujte font na TTF alebo OTF.",
    "alert.loadFailed": "Nepodarilo sa načítať font: {msg}. Uistite sa, že ide o platný súbor TTF, OTF alebo UFONT.",
    "alert.bulkDeployError": "Chyba pri hromadnom nasadení.",
    "alert.invalidJson": "Neplatný JSON súbor.",
    "alert.exportFailed": "Nepodarilo sa exportovať font. Pozrite si konzolu pre viac detailov.",
    "alert.saveDiacriticError": "Chyba pri ukladaní diakritiky: {msg}",
    "prompt.diacriticName": "Zadajte názov pre diakritiku:",
    "canvas.optHeight": "OPTIMÁLNA VÝŠKA",
    "canvas.lower": "Malé písmená",
    "canvas.upper": "Veľké písmená",
    "app.dropHere": "Kliknite alebo potiahnite súbory pre nahratie fontov",
    "app.confirmDeleteHistory": "Naozaj chcete vymazať celú históriu projektov? Táto akcia je nevratná.",
    "app.closeProject": "Zavrieť projekt a vrátiť sa na úvodnú obrazovku",
    "app.logo": "Logo aplikácie",
    "app.loadedFont": "Aktuálne načítaný font",
    "app.unsavedChanges": "Neuložené zmeny (automatické ukladanie prebieha...)",
    "app.undo": "Krok späť (podržte pre rýchly návrat)",
    "app.redo": "Krok vpred (podržte pre rýchly posun)",
    "app.loadSettings": "Načítať predtým uložené nastavenia diakritiky z JSON súboru",
    "app.applyVariants": "Aplikovať zmeny na všetky nahrané rezy fontu (Bold, Italic, atď.)",
    "app.saveSettings": "Uložiť aktuálne nastavenia diakritiky do JSON súboru",
    "app.downloadFont": "Vygenerovať a stiahnuť upravený font (experimentálne)",
    "app.statusUnknown": "Neznámy stav",
    "app.statusMissing": "Chýba základ alebo zdroj",
    "app.recenterView": "Vrátiť pohľad na stred",
    "app.previewAll": "Všetky",
    "app.previewHeading": "Nadpis",
    "app.previewBody": "Bežný",
    "app.previewMicro": "Micro",
    "app.editPreview": "Upraviť náhľadový text",
    "app.autoMerge": "Automaticky zlúčiť prekrývajúce sa cesty a vyčistiť tvar",
    "app.useOriginal": "Použiť pôvodný glyf priamo z fontu",
    "app.pov": "Pôv",
    "app.krad": "Krad",
    "app.addToLib": "Pridať aktuálnu diakritiku do knižnice",
    "app.scaleDesc": "Aplikovať zmenšenie na všetky malé písmená s diakritikou (ľ, š, č, ť, ž, ň, ď, ě, ř, ô, ů, ä)",
    "app.scaleAll": "Celkové zväčšenie/zmenšenie",
    "app.moveH": "Horizontálny posun",
    "app.moveV": "Vertikálny posun",
    "app.rotateDeg": "Otočenie v stupňoch",
    "app.flipH": "Zrkadlovo otočiť horizontálne",
    "app.flipV": "Zrkadlovo otočiť vertikálne",
    "app.scaleH": "Horizontálne zväčšenie/zmenšenie",
    "app.scaleV": "Vertikálne zväčšenie/zmenšenie",
    "app.skewHDeg": "Horizontálne skosenie (naklonenie) v stupňoch",
    "app.skewVDeg": "Vertikálne skosenie v stupňoch",
    "app.propAnalysis": "Analýza proporcií a kerningu",
    "app.libDesc": "Knižnica uložených diakritických znamienok",
    "app.applyTarget": "Použiť toto znamienko na vybraný znak",
    "app.totalWidth": "Celková šírka znaku (určuje, kde začne ďalší znak)",
    "app.edit": "Úprava:",
    "app.scrollZoom": "Rolovaním priblížite/oddialite",
    "app.globalSettings": "Globálne nastavenia",
    "app.switchToDiacritic": "Prepnúť na úpravu diakritiky",
    "app.anomalies": "Detekované anomálie",
    "app.cleanPaths": "Vyčistiť a zlúčiť cesty",
    "app.original": "Pôvodný",
    "app.compound": "Zložený",
    "app.heightRatio": "Pomer výšky (voči základu):",
    "app.widthRatio": "Pomer šírky (voči základu):",
    "app.styleAdapt": "Štýlová adaptácia akcentu",
    "app.styleAdaptDesc": "Automaticky prispôsobí textúru a ťah diakritiky základnému písmenu.",
    "app.heatmap": "Heatmapa metrík",
    "app.heatmapDesc": "Vizualizácia hustoty a bočných medzier (sidebearings).",
    "app.restoreShape": "Obnoviť pôvodný tvar (zmazať gumu)",

    "app.eraseAll": "Vymazať všetky ťahy gumou pre tento znak",

  },
  cz: {
    // Landing Page
    "app.title": "GLYPHFORGE",
    "app.createdBy": "Vytvořil",
    "app.newProject": "Nový projekt",
    "app.dropFile": "Přetáhněte font sem nebo",
    "app.browseFile": "vyberte z PC",
    "app.savedProjects": "Uložené projekty",
    "app.continueWith": "Pokračovat s",
    "app.noSavedProjects": "Nemáte žádné uložené projekty.",
    "app.deleteProject": "Odstranit projekt",
    "app.uploadFonts": "Nahrát fonty",
    "app.dropDesc": "Přetáhni a pusť sem soubory .ttf, .otf nebo .ufont, nebo klikni pro výběr",
    "app.bulkSupport": "Podporuje hromadné nahrávání (Regular, Bold, atd.)",
    "app.recentProjects": "Nedávné projekty",
    "app.clearHistory": "Vymazat historii",
    "app.noSavedDesc": "Zatím nemáte žádné uložené projekty.",
    "app.uploadToStart": "Nahrajte font pro začátek.",
    "app.open": "Otevřít",
    "app.exportJson": "Exportovat JSON",
    "app.importJson": "Importovat JSON",
    "app.exportFontBtn": "Exportovat Font",
    "app.batchApply": "Hromadná aplikace",
    "app.globalOffsetDesc": "Posune diakritiku na všech znacích o zadanou hodnotu (užitečné pro kurzívu)",
    "app.diacriticSourceDesc": "Odkud se bere tvar diakritiky",
    "app.useSvgStyle": "Použít SVG diakritiku ve stylu",
    "app.diacriticLibrary": "Knihovna diakritiky",



    
    // Notifications / Actions
    "action.generateMissing": "Generovat chybějící",
    "action.generateMissingDesc": "Vygeneruje chybějící znaky...",
    "action.fixFromLibrary": "Oprava podle knihovny",
    "action.fixFromLibraryDesc": "Aplikuje diakritiku z knihovny...",
    "action.adjustWidth": "Opravit šířku",
    "action.adjustWidthDesc": "Opraví mezery znaků...",
    "action.exportFont": "Exportovat font",
    "action.exportFontDesc": "Vytvoří nový font se sloučenými znaky",
    "action.saveToLibrary": "Uložit do knihovny",
    "action.saveToLibraryDesc": "Uloží aktuální diakritiku",
    "action.confirmDelete": "Opravdu chcete odstranit projekt?",

    // Header Editor
    "editor.characters": "Znaky",
    "editor.toolbar": "Nástroje",
    "editor.properties": "Vlastnosti",
    "editor.preview": "Náhled",

    // Toolbar Buttons
    "tool.autoFixAll": "AUTO úprava",
    "tool.autoFixAllTitle": "Automaticky vyčistit, doplnit chybějící, složit znaky a opravit mezery",
    "tool.composeAll": "Složit všechny znaky",
    "tool.composeAllTitle": "Vynutit složení všech znaků ze základů a diakritiky z fontu",
    "tool.resetAll": "Zrušit všechny změny",
    "tool.resetAllTitle": "Vrátit všechny znaky do původního stavu",
    "tool.generateMissing": "Doplnit chybějící",
    "tool.generateMissingTitle": "Automaticky vygenerovat všechny chybějící znaky, pro které existuje recept",
    "tool.cleanPaths": "Vyčistit vektorové cesty",
    "tool.cleanPathsTitle": "Automaticky vyčistit a sloučit cesty pro všechny znaky s detekovanými problémy",
    "tool.fixSidebearings": "Sjednotit šířku znaků",
    "tool.fixSidebearingsTitle": "Opravit boční mezery (Advance Width) pro všechny upravené znaky podle jejich základního znaku",
    
    // Character List
    "charList.editToolTip": "Upravit znak",
    "charList.filter.all": "Všechny",
    "charList.filter.modified": "Upravené",
    "charList.filter.original": "Původní",
    "charList.status.ok": "Původní znak existuje",
    "charList.status.generated": "Složený znak",
    "charList.status.missing": "Chybějící znak",
    "charList.status.edited": "Manuálně upravené",
    "charList.scaledToLowercase": "Zmenšené na malé písmeno",
    "app.selectedCharDesc": "Aktuálně vybraný znak na úpravu",

    // Canvas tools
    "canvas.selectTool": "Nástroj výběr a přesun (V)",
    "canvas.eraserTool": "Guma - vymazat části znaku (E)",
    "canvas.eraserSize": "Velikost gumy",
    "canvas.selectCharDesc": "Vyberte znak na úpravu z levého panelu",
    "canvas.hintDrag": "Tažením přesunete diakritiku",
    "canvas.hintPan": "Mezerník + Tažení pro posun plátna",

    // Properties Panel
    "props.status": "Stav",
    "props.splitOriginal": "Rozložit původní znak",
    "props.splitOriginalTitle": "Nahradit původní znak složeným znakem (základ + diakritika) pro možnost úpravy",
    "props.resetChar": "Resetovat tento znak",
    "props.resetCharTitle": "Vrátit všechny úpravy tohoto znaku do původního stavu",
    "props.fixWidth": "Opravit šířku znaku",
    "props.fixWidthTitle": "Automaticky upravit šířku znaku tak, aby glyf nepřesahoval",
    "props.diacriticSource": "Zdroj diakritiky",
    "props.sourceAuto": "Automaticky (Z fontu)",
    "props.sourceLibrary": "Z knihovny SVG",
    "props.applyToAll": "Použít na vše",
    "props.applyToAllSourceTitle": "Použít tento zdroj diakritiky pro všechny znaky",
    "props.applyToAllTransformTitle": "Použít tuto transformaci pro všechny znaky",
    "props.createCompound": "Vytvořit složený znak ze základního písmene a diakritiky z fontu",
    "props.extractedFrom": "Extrahováno ze znaků",
    "props.otherDiacritics": "Jiná diakritika z fontu",
    "props.shrinkToLower": "Zmenšit na malé písmeno",
    "props.shrinkOn": "Zmenšení zapnuto",
    "props.useDiacriticFrom": "Použít diakritiku ze znaku",
    "props.transform": "Transformace",
    "props.targetDiacritic": "Diakritika",
    "props.targetBase": "Základní znak",
    "props.resetTransform": "Obnovit výchozí transformaci",
    "props.scale": "Celkové měřítko",
    "props.offsetX": "Posun X",
    "props.offsetY": "Posun Y",
    "props.rotation": "Rotace (°)",
    "props.flipX": "Zrcadlit X",
    "props.flipY": "Zrcadlit Y",
    "props.scaleX": "Měřítko X",
    "props.scaleY": "Měřítko Y",
    "props.skewX": "Zkosení X",
    "props.skewY": "Zkosení Y",
    
    // Validation
    "check.title": "Pokročilá kontrola",
    "check.svgNotSupported": "Pokročilá kontrola momentálně nepodporuje SVG diakritiku.",
    "check.overflowLeft": "Znaménko přesahuje doleva ({val} j.). Může kolidovat s předchozím znakem.",
    "check.overflowRight": "Znaménko přesahuje doprava ({val} j.). Může kolidovat s následujícím znakem.",
    "check.overlap": "Znaménko se vertikálně překrývá se základním znakem.",
    "check.proportionOK": "Proporce se zdají být v pořádku.",

    // Library
    "lib.title": "Knihovna SVG znamének",
    "lib.select": "Použít na znak",
    "lib.delete": "Odstranit z knihovny",
    "lib.empty": "Knihovna je prázdná. Znaky se uloží při exportu fontu.",

    // Advanced Props
    "adv.title": "Pokročilé",
    "adv.advanceWidth": "Šířka znaku (Advance Width)",
    "adv.clearEraser": "Vymazat úpravy gumou",
    "adv.lowercaseScale": "Měřítko z malých písmen",
    "adv.lowercaseScaleDesc": "Používá se pro znaky s háčkem (ď, ť, ľ).",
    "adv.shrinkAllLowercase": "Zmenšit všechny malé znaky",
    "adv.shrinkAllLowercaseTitle": "Zmenší znaky ľ, š, č, ť, ž, ň, ď, ě, ř na lowercase měřítko.",
    "adv.globalOffsetX": "Globální posun X (Kurzíva)",

    // No selection
    "noSelection.title": "Vyberte znak z levého panelu pro zobrazení jeho vlastností",

    // Export Modal
    "export.title": "Exportuji font",
    "export.merging": "Slučuji znaky a generuji nový soubor. Toto může chvíli trvat...",
    "export.processing": "Zpracovávám znak:",
    
    // Text Tester (Preview)
    "preview.title": "Náhled textu",
    "preview.customText": "Vlastní text",
    "preview.pangram": "Pangram (Všechny znaky)",
    "preview.words": "Typická slova",
    "preview.size": "Velikost",
    "preview.wrap": "Zalomit",
    "preview.overlap": "Zobrazit překrývání",
    "preview.stylistic": "Stylová adaptace (Exp.)",
    "anom.zeroWidth": "Nulová šířka znaku",
    "anom.emptyGlyph": "Prázdný glyf",
    "anom.islands": "Malé izolované části",
    "anom.complex": "Překrývající se nebo složité cesty",
    "anom.overlap": "Diakritika se vertikálně překrývá se základním znakem",
    "anom.heightLower": "Malé písmeno má nesprávnou výšku (chová se jako velké)",
    "anom.heightUpper": "Velké písmeno má nesprávnou výšku",
    "anom.narrow": "Příliš úzké boční mezery (přesah)",
    "alert.loadError": "Nepodařilo se načíst font: Soubor pravděpodobně není platný font (může jít o obrázek nebo jiný formát).",
    "alert.woff2": "Formát WOFF2 není plně podporován. Prosím, zkonvertujte font na TTF nebo OTF.",
    "alert.loadFailed": "Nepodařilo se načíst font: {msg}. Ujistěte se, že jde o platný soubor TTF, OTF nebo UFONT.",
    "alert.bulkDeployError": "Chyba při hromadném nasazení.",
    "alert.invalidJson": "Neplatný JSON soubor.",
    "alert.exportFailed": "Nepodařilo se exportovat font. Podívejte se do konzole pro více detailů.",
    "alert.saveDiacriticError": "Chyba při ukládání diakritiky: {msg}",
    "prompt.diacriticName": "Zadejte název pro diakritiku:",
    "canvas.optHeight": "OPTIMÁLNÍ VÝŠKA",
    "canvas.lower": "Malá písmena",
    "canvas.upper": "Velká písmena",
    "app.dropHere": "Klikněte nebo přetáhněte soubory pro nahrání fontů",
    "app.confirmDeleteHistory": "Opravdu chcete vymazat celou historii projektů? Tato akce je nevratná.",
    "app.closeProject": "Zavřít projekt a vrátit se na úvodní obrazovku",
    "app.logo": "Logo aplikace",
    "app.loadedFont": "Aktuálně načtený font",
    "app.unsavedChanges": "Neuložené změny (automatické ukládání probíhá...)",
    "app.undo": "Krok zpět (podržte pro rychlý návrat)",
    "app.redo": "Krok vpřed (podržte pro rychlý posun)",
    "app.loadSettings": "Načíst dříve uložené nastavení diakritiky z JSON souboru",
    "app.applyVariants": "Aplikovat změny na všechny nahrané řezy fontu (Bold, Italic, atd.)",
    "app.saveSettings": "Uložit aktuální nastavení diakritiky do JSON souboru",
    "app.downloadFont": "Vygenerovat a stáhnout upravený font (experimentální)",
    "app.statusUnknown": "Neznámý stav",
    "app.statusMissing": "Chybí základ nebo zdroj",
    "app.recenterView": "Vrátit pohled na střed",
    "app.previewAll": "Všechny",
    "app.previewHeading": "Nadpis",
    "app.previewBody": "Běžný",
    "app.previewMicro": "Micro",
    "app.editPreview": "Upravit náhledový text",
    "app.autoMerge": "Automaticky sloučit překrývající se cesty a vyčistit tvar",
    "app.useOriginal": "Použít původní glyf přímo z fontu",
    "app.pov": "Pův",
    "app.krad": "Krad",
    "app.addToLib": "Přidat aktuální diakritiku do knihovny",
    "app.scaleDesc": "Aplikovat zmenšení na všechna malá písmena s diakritikou (ľ, š, č, ť, ž, ň, ď, ě, ř, ô, ů, ä)",
    "app.scaleAll": "Celkové zvětšení/zmenšení",
    "app.moveH": "Horizontální posun",
    "app.moveV": "Vertikální posun",
    "app.rotateDeg": "Otočení ve stupních",
    "app.flipH": "Zrcadlově otočit horizontálně",
    "app.flipV": "Zrcadlově otočit vertikálně",
    "app.scaleH": "Horizontální zvětšení/zmenšení",
    "app.scaleV": "Vertikální zvětšení/zmenšení",
    "app.skewHDeg": "Horizontální zkosení (naklonění) ve stupních",
    "app.skewVDeg": "Vertikální zkosení ve stupních",
    "app.propAnalysis": "Analýza proporcí a kerningu",
    "app.libDesc": "Knihovna uložených diakritických znamének",
    "app.applyTarget": "Použít toto znaménko na vybraný znak",
    "app.totalWidth": "Celková šířka znaku (určuje, kde začne další znak)",
    "app.edit": "Úprava:",
    "app.scrollZoom": "Rolováním přiblížíte/oddálíte",
    "app.globalSettings": "Globální nastavení",
    "app.switchToDiacritic": "Přepnout na úpravu diakritiky",
    "app.anomalies": "Detekované anomálie",
    "app.cleanPaths": "Vyčistit a sloučit cesty",
    "app.original": "Původní",
    "app.compound": "Složený",
    "app.heightRatio": "Poměr výšky (vůči základu):",
    "app.widthRatio": "Poměr šířky (vůči základu):",
    "app.styleAdapt": "Stylová adaptace akcentu",
    "app.styleAdaptDesc": "Automaticky přizpůsobí texturu a tah diakritiky základnímu písmenu.",
    "app.heatmap": "Heatmapa metrik",
    "app.heatmapDesc": "Vizualizace hustoty a bočních mezer (sidebearings).",
    "app.restoreShape": "Obnovit původní tvar (smazat gumu)",

    "app.eraseAll": "Vymazat všechny tahy gumou pro tento znak",

  }
};

type Translater = (key: keyof typeof translations.sk, replacements?: Record<string, string>) => string;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translater;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('preferredLang') as Language;
      return saved || 'sk';
    } catch (e) {
      return 'sk';
    }
  });

  const setLang = useCallback((newLang: Language) => {
    try {
      localStorage.setItem('preferredLang', newLang);
    } catch (e) {}
    setLangState(newLang);
  }, []);

  const t: Translater = useCallback((key, replacements) => {
    let str = (translations[lang] as any)[key] || translations.sk[key] || key;
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        str = str.replace(`{${k}}`, v);
      }
    }
    return str;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
};
