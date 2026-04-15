import localforage from 'localforage';

localforage.config({
  name: 'FontEditorDB',
  storeName: 'projects'
});

export interface SavedCharData {
  status: 'ok' | 'missing' | 'generated' | 'edited';
  diacriticTransform?: { x: number; y: number; scaleX: number; scaleY: number; rotation: number; skewX: number; skewY: number };
  baseTransform?: { x: number; y: number; scaleX: number; scaleY: number; rotation: number; skewX: number; skewY: number };
  advanceWidth?: number;
  svgDiacritic?: { path: string; style: string };
  eraserPaths?: { path: string; size: number }[];
  layerVisibility?: { base: boolean; diacritic: boolean };
  layerOpacity?: { base: number; diacritic: number };
  anomalies?: string[];
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  fontBuffer: ArrayBuffer;
  charsData: Record<string, SavedCharData>;
}

const diacriticLibrary = localforage.createInstance({
  name: 'FontEditorDB',
  storeName: 'diacriticLibrary'
});

export interface LibraryDiacritic {
  id: string;
  name: string;
  path: string;
  timestamp: number;
  type?: 'svg' | 'glyph';
}

export const db = {
  // ... existing project methods
  async getProjects(): Promise<Omit<Project, 'fontBuffer' | 'charsData'>[]> {
    const keys = await localforage.keys();
    const projects = [];
    for (const key of keys) {
      const p = await localforage.getItem<Project>(key);
      if (p && p.id) {
        projects.push({ id: p.id, name: p.name, lastModified: p.lastModified });
      }
    }
    return projects.sort((a, b) => b.lastModified - a.lastModified);
  },
  async clearProjects(): Promise<void> {
    await localforage.clear();
  },
  async getProject(id: string): Promise<Project | null> {
    return await localforage.getItem<Project>(id);
  },
  async saveProject(project: Project): Promise<void> {
    await localforage.setItem(project.id, project);
  },
  async deleteProject(id: string): Promise<void> {
    await localforage.removeItem(id);
  },

  // Diacritic Library methods
  async getLibraryDiacritics(): Promise<LibraryDiacritic[]> {
    const diacritics: LibraryDiacritic[] = [];
    await diacriticLibrary.iterate((value: LibraryDiacritic) => {
      diacritics.push(value);
    });
    return diacritics.sort((a, b) => b.timestamp - a.timestamp);
  },
  async saveToLibrary(diacritic: Omit<LibraryDiacritic, 'id' | 'timestamp'>): Promise<void> {
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const entry: LibraryDiacritic = {
      ...diacritic,
      id,
      timestamp: Date.now(),
      type: diacritic.type || 'svg'
    };
    await diacriticLibrary.setItem(id, entry);
  },
  async deleteFromLibrary(id: string): Promise<void> {
    await diacriticLibrary.removeItem(id);
  }
};
