export const CZ_SK_ALPHABET = [
  'A', 'Á', 'Ä', 'B', 'C', 'Č', 'D', 'Ď', 'DZ', 'DŽ', 'E', 'É', 'Ě', 'F', 'G', 'H', 'CH', 'I', 'Í', 'J', 'K', 'L', 'Ĺ', 'Ľ', 'M', 'N', 'Ň', 'O', 'Ó', 'Ô', 'P', 'Q', 'R', 'Ŕ', 'Ř', 'S', 'Š', 'T', 'Ť', 'U', 'Ú', 'Ů', 'V', 'W', 'X', 'Y', 'Ý', 'Z', 'Ž',
  'a', 'á', 'ä', 'b', 'c', 'č', 'd', 'ď', 'dz', 'dž', 'e', 'é', 'ě', 'f', 'g', 'h', 'ch', 'i', 'í', 'j', 'k', 'l', 'ĺ', 'ľ', 'm', 'n', 'ň', 'o', 'ó', 'ô', 'p', 'q', 'r', 'ŕ', 'ř', 's', 'š', 't', 'ť', 'u', 'ú', 'ů', 'v', 'w', 'x', 'y', 'ý', 'z', 'ž'
];

export const SINGLE_CHARS = CZ_SK_ALPHABET.filter(c => c.length === 1);

export type DiacriticType = 'acute' | 'caron' | 'diaeresis' | 'circumflex' | 'apostrophe' | 'ring';

export interface CharRecipe {
  base: string;
  diacriticType: DiacriticType;
  defaultSource: string[]; // Preferred characters to steal the diacritic from
}

export const CHAR_RECIPES: Record<string, CharRecipe> = {
  'Á': { base: 'A', diacriticType: 'acute', defaultSource: ['É', 'Í', 'Ó', 'Ú', 'Ý', 'Ĺ', 'Ŕ'] },
  'Ä': { base: 'A', diacriticType: 'diaeresis', defaultSource: ['Ë', 'Ï', 'Ö', 'Ü'] }, // Might need to steal from other languages if Ä is missing
  'Č': { base: 'C', diacriticType: 'caron', defaultSource: ['Š', 'Ž', 'Ř', 'Ě'] },
  'Ď': { base: 'D', diacriticType: 'caron', defaultSource: ['Ť', 'Ň', 'Č', 'Š', 'Ž'] },
  'É': { base: 'E', diacriticType: 'acute', defaultSource: ['Á', 'Í', 'Ó', 'Ú', 'Ý', 'Ĺ', 'Ŕ'] },
  'Ě': { base: 'E', diacriticType: 'caron', defaultSource: ['Č', 'Š', 'Ž', 'Ř', 'Ň'] },
  'Í': { base: 'I', diacriticType: 'acute', defaultSource: ['Á', 'É', 'Ó', 'Ú', 'Ý', 'Ĺ', 'Ŕ'] },
  'Ĺ': { base: 'L', diacriticType: 'acute', defaultSource: ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ý', 'Ŕ'] },
  'Ľ': { base: 'L', diacriticType: 'caron', defaultSource: ['Ť', 'Ď', 'Ň', 'Č', 'Š', 'Ž'] },
  'Ň': { base: 'N', diacriticType: 'caron', defaultSource: ['Č', 'Š', 'Ž', 'Ď', 'Ť'] },
  'Ó': { base: 'O', diacriticType: 'acute', defaultSource: ['Á', 'É', 'Í', 'Ú', 'Ý', 'Ĺ', 'Ŕ'] },
  'Ô': { base: 'O', diacriticType: 'circumflex', defaultSource: ['Â', 'Ê', 'Î', 'Û'] },
  'Ŕ': { base: 'R', diacriticType: 'acute', defaultSource: ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ý', 'Ĺ'] },
  'Ř': { base: 'R', diacriticType: 'caron', defaultSource: ['Č', 'Š', 'Ž', 'Ě', 'Ň'] },
  'Š': { base: 'S', diacriticType: 'caron', defaultSource: ['Č', 'Ž', 'Ř', 'Ě'] },
  'Ť': { base: 'T', diacriticType: 'caron', defaultSource: ['Ď', 'Ň', 'Č', 'Š', 'Ž'] },
  'Ú': { base: 'U', diacriticType: 'acute', defaultSource: ['Á', 'É', 'Í', 'Ó', 'Ý', 'Ĺ', 'Ŕ'] },
  'Ů': { base: 'U', diacriticType: 'ring', defaultSource: ['Å', '°'] },
  'Ý': { base: 'Y', diacriticType: 'acute', defaultSource: ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ĺ', 'Ŕ'] },
  'Ž': { base: 'Z', diacriticType: 'caron', defaultSource: ['Č', 'Š', 'Ř', 'Ě'] },

  'á': { base: 'a', diacriticType: 'acute', defaultSource: ['é', 'í', 'ó', 'ú', 'ý', 'ĺ', 'ŕ'] },
  'ä': { base: 'a', diacriticType: 'diaeresis', defaultSource: ['ë', 'ï', 'ö', 'ü'] },
  'č': { base: 'c', diacriticType: 'caron', defaultSource: ['š', 'ž', 'ř', 'ě'] },
  'ď': { base: 'd', diacriticType: 'apostrophe', defaultSource: ['ť', 'ľ'] }, // Lowercase ď, ť, ľ usually have an apostrophe-like caron
  'é': { base: 'e', diacriticType: 'acute', defaultSource: ['á', 'í', 'ó', 'ú', 'ý', 'ĺ', 'ŕ'] },
  'ě': { base: 'e', diacriticType: 'caron', defaultSource: ['č', 'š', 'ž', 'ř', 'ň'] },
  'í': { base: 'i', diacriticType: 'acute', defaultSource: ['á', 'é', 'ó', 'ú', 'ý', 'ĺ', 'ŕ'] },
  'ĺ': { base: 'l', diacriticType: 'acute', defaultSource: ['á', 'é', 'í', 'ó', 'ú', 'ý', 'ŕ'] },
  'ľ': { base: 'l', diacriticType: 'apostrophe', defaultSource: ['ť', 'ď'] },
  'ň': { base: 'n', diacriticType: 'caron', defaultSource: ['č', 'š', 'ž'] },
  'ó': { base: 'o', diacriticType: 'acute', defaultSource: ['á', 'é', 'í', 'ú', 'ý', 'ĺ', 'ŕ'] },
  'ô': { base: 'o', diacriticType: 'circumflex', defaultSource: ['â', 'ê', 'î', 'û'] },
  'ŕ': { base: 'r', diacriticType: 'acute', defaultSource: ['á', 'é', 'í', 'ó', 'ú', 'ý', 'ĺ'] },
  'ř': { base: 'r', diacriticType: 'caron', defaultSource: ['č', 'š', 'ž', 'ě', 'ň'] },
  'š': { base: 's', diacriticType: 'caron', defaultSource: ['č', 'ž', 'ř', 'ě'] },
  'ť': { base: 't', diacriticType: 'apostrophe', defaultSource: ['ď', 'ľ'] },
  'ú': { base: 'u', diacriticType: 'acute', defaultSource: ['á', 'é', 'í', 'ó', 'ý', 'ĺ', 'ŕ'] },
  'ů': { base: 'u', diacriticType: 'ring', defaultSource: ['å', '°'] },
  'ý': { base: 'y', diacriticType: 'acute', defaultSource: ['á', 'é', 'í', 'ó', 'ú', 'ĺ', 'ŕ'] },
  'ž': { base: 'z', diacriticType: 'caron', defaultSource: ['č', 'š', 'ř', 'ě'] },

  // Source characters for stealing diacritics (not in CZ/SK alphabet but used as sources)
  'Å': { base: 'A', diacriticType: 'ring', defaultSource: [] },
  'å': { base: 'a', diacriticType: 'ring', defaultSource: [] },
  'Ë': { base: 'E', diacriticType: 'diaeresis', defaultSource: [] },
  'Ï': { base: 'I', diacriticType: 'diaeresis', defaultSource: [] },
  'Ö': { base: 'O', diacriticType: 'diaeresis', defaultSource: [] },
  'Ü': { base: 'U', diacriticType: 'diaeresis', defaultSource: [] },
  'Â': { base: 'A', diacriticType: 'circumflex', defaultSource: [] },
  'Ê': { base: 'E', diacriticType: 'circumflex', defaultSource: [] },
  'Î': { base: 'I', diacriticType: 'circumflex', defaultSource: [] },
  'Û': { base: 'U', diacriticType: 'circumflex', defaultSource: [] },
};
