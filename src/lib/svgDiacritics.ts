export type FontStyle = 'Sans' | 'Serif' | 'Monospace' | 'Pixel' | 'Display';
export type DiacriticType = 'acute' | 'caron' | 'ring' | 'diaeresis' | 'circumflex' | 'apostrophe';

export const SVG_DIACRITICS: Record<FontStyle, Record<DiacriticType, string>> = {
  Sans: {
    acute: "M 30,100 L 70,0 L 90,0 L 50,100 Z",
    caron: "M 10,0 L 50,80 L 90,0 L 70,0 L 50,40 L 30,0 Z",
    ring: "M 50,0 C 22,0 0,22 0,50 C 0,78 22,100 50,100 C 78,100 100,78 100,50 C 100,22 78,0 50,0 Z M 50,20 C 66,20 80,34 80,50 C 80,66 66,80 50,80 C 34,80 20,66 20,50 C 20,34 34,20 50,20 Z",
    diaeresis: "M 10,50 C 10,61 19,70 30,70 C 41,70 50,61 50,50 C 50,39 41,30 30,30 C 19,30 10,39 10,50 Z M 50,50 C 50,61 59,70 70,70 C 81,70 90,61 90,50 C 90,39 81,30 70,30 C 59,30 50,39 50,50 Z",
    circumflex: "M 0,80 L 50,0 L 100,80 L 80,80 L 50,30 L 20,80 Z",
    apostrophe: "M 20,0 L 80,0 L 60,100 L 20,100 Q 40,50 20,0 Z"
  },
  Serif: {
    acute: "M 20,100 L 60,0 L 90,0 L 80,20 L 50,100 Z",
    caron: "M 0,0 L 50,90 L 100,0 L 70,0 L 50,50 L 30,0 Z",
    ring: "M 50,0 C 20,0 0,20 0,50 C 0,80 20,100 50,100 C 80,100 100,80 100,50 C 100,20 80,0 50,0 Z M 50,25 C 65,25 75,35 75,50 C 75,65 65,75 50,75 C 35,75 25,65 25,50 C 25,35 35,25 50,25 Z",
    diaeresis: "M 15,30 L 35,30 L 35,70 L 15,70 Z M 65,30 L 85,30 L 85,70 L 65,70 Z",
    circumflex: "M 0,90 L 50,0 L 100,90 L 80,90 L 50,40 L 20,90 Z",
    apostrophe: "M 30,0 L 70,0 L 50,100 C 30,80 20,60 30,0 Z"
  },
  Monospace: {
    acute: "M 40,100 L 60,0 L 80,0 L 60,100 Z",
    caron: "M 20,0 L 50,60 L 80,0 L 60,0 L 50,30 L 40,0 Z",
    ring: "M 50,10 C 25,10 10,25 10,50 C 10,75 25,90 50,90 C 75,90 90,75 90,50 C 90,25 75,10 50,10 Z M 50,30 C 60,30 70,40 70,50 C 70,60 60,70 50,70 C 40,70 30,60 30,50 C 30,40 40,30 50,30 Z",
    diaeresis: "M 20,30 L 40,30 L 40,50 L 20,50 Z M 60,30 L 80,30 L 80,50 L 60,50 Z",
    circumflex: "M 10,70 L 50,10 L 90,70 L 70,70 L 50,40 L 30,70 Z",
    apostrophe: "M 30,0 L 70,0 L 70,100 L 30,100 Z"
  },
  Pixel: {
    acute: "M 20,80 L 40,80 L 40,60 L 60,60 L 60,40 L 80,40 L 80,20 L 60,20 L 60,40 L 40,40 L 40,60 L 20,60 Z",
    caron: "M 0,20 L 20,20 L 20,40 L 40,40 L 40,60 L 60,60 L 60,40 L 80,40 L 80,20 L 100,20 L 100,40 L 80,40 L 80,60 L 60,60 L 60,80 L 40,80 L 40,60 L 20,60 L 20,40 L 0,40 Z",
    ring: "M 20,20 L 80,20 L 80,80 L 20,80 Z M 40,40 L 60,40 L 60,60 L 40,60 Z",
    diaeresis: "M 10,30 L 40,30 L 40,60 L 10,60 Z M 60,30 L 90,30 L 90,60 L 60,60 Z",
    circumflex: "M 0,60 L 20,60 L 20,40 L 40,40 L 40,20 L 60,20 L 60,40 L 80,40 L 80,60 L 100,60 L 100,80 L 80,80 L 80,60 L 60,60 L 60,40 L 40,40 L 40,60 L 20,60 L 20,80 L 0,80 Z",
    apostrophe: "M 20,0 L 60,0 L 60,40 L 40,40 L 40,80 L 20,80 Z"
  },
  Display: {
    acute: "M 20,100 Q 50,50 90,0 Q 60,50 40,100 Z",
    caron: "M 0,0 Q 50,80 100,0 Q 50,40 0,0 Z",
    ring: "M 50,0 C 10,0 0,40 0,50 C 0,60 10,100 50,100 C 90,100 100,60 100,50 C 100,40 90,0 50,0 Z M 50,20 C 30,20 20,40 20,50 C 20,60 30,80 50,80 C 70,80 80,60 80,50 C 80,40 70,20 50,20 Z",
    diaeresis: "M 10,50 C 10,70 30,70 30,50 C 30,30 10,30 10,50 Z M 70,50 C 70,70 90,70 90,50 C 90,30 70,30 70,50 Z",
    circumflex: "M 0,100 Q 50,0 100,100 Q 50,50 0,100 Z",
    apostrophe: "M 20,0 L 80,0 Q 60,50 40,100 Q 40,50 20,0 Z"
  }
};

export function getDiacriticType(char: string): DiacriticType | null {
  if (/[áéíóúýĺŕÁÉÍÓÚÝĹŔ]/.test(char)) return 'acute';
  if (/[ďťľ]/.test(char)) return 'apostrophe';
  if (/[čňšťžřěČĎĽŇŠŤŽŘĚ]/.test(char)) return 'caron';
  if (/[ůŮ]/.test(char)) return 'ring';
  if (/[äÄëËïÏöÖüÜÿŸ]/.test(char)) return 'diaeresis';
  if (/[âêîôûÂÊÎÔÛ]/.test(char)) return 'circumflex';
  return null;
}
