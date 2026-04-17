import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Upload, Download, Settings, Type, RotateCcw, Undo2, Redo2, X, Clock, Trash2, Wand2, Shapes, FlipHorizontal, FlipVertical, MousePointer2, Eraser, Library, Minus, Plus, MoveHorizontal, Activity, AlertTriangle, CheckCircle2, Edit2, Check } from 'lucide-react';
import { useFontEditor, CharInfo, CharStatus } from './hooks/useFontEditor';
import { cn } from './lib/utils';
import { useTranslation } from './lib/i18n';
import { SINGLE_CHARS } from './constants';
import { CanvasEditor } from './components/CanvasEditor';
import { TextTester } from './components/TextTester';
import { Logo } from './components/Logo';
import { db, Project } from './lib/db';
import { FontStyle } from './lib/svgDiacritics';

const RepeatButton = ({ 
  onClick, 
  children, 
  className, 
  disabled 
}: { 
  onClick: () => void; 
  children: React.ReactNode; 
  className?: string;
  disabled?: boolean;
}) => {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  const start = useCallback(() => {
    if (disabled) return;
    onClickRef.current();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        onClickRef.current();
      }, 50);
    }, 500);
  }, [disabled]);

  const stop = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    return stop;
  }, [stop]);

  return (
    <button
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      className={cn("w-6 h-6 flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", className)}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const SliderWithButtons = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange, 
  unit = "", 
  title 
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step?: number; 
  onChange: (val: number) => void; 
  unit?: string;
  title?: string;
}) => {
  return (
    <div title={title}>
      <div className="flex justify-between mb-1">
        <label className="text-xs text-zinc-500">{label}</label>
        <span className="text-xs text-zinc-400">{typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <RepeatButton onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
          <Minus size={12} />
        </RepeatButton>
        <input 
          type="range" 
          min={min} max={max} step={step}
          className="flex-1 accent-indigo-500" 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <RepeatButton onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
          <Plus size={12} />
        </RepeatButton>
      </div>
    </div>
  );
};

const NumberWithButtons = ({ 
  label, 
  value, 
  step = 0.1, 
  onChange, 
  title 
}: { 
  label: string; 
  value: number; 
  step?: number; 
  onChange: (val: number) => void; 
  title?: string;
}) => {
  return (
    <div title={title}>
      <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <RepeatButton onClick={() => onChange(value - step)}>
          <Minus size={12} />
        </RepeatButton>
        <input 
          type="number" 
          step={step} 
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-center" 
          value={value.toFixed(2)} 
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <RepeatButton onClick={() => onChange(value + step)}>
          <Plus size={12} />
        </RepeatButton>
      </div>
    </div>
  );
};

export default function App() {
  const { t, lang, setLang } = useTranslation();
  const { 
    font, slaveFonts, fontName, chars, selectedChar, setSelectedChar, 
    loadFont, loadProject, deleteProject, closeProject,
    updateCharTransform, updateAdvanceWidth, updateEraserPaths, scaleToLowercase, updateCharProperty, batchUpdateChars, batchScaleToLowercase,
    exportJSON, importJSON, exportFont,
    undo, redo, canUndo, canRedo, hasUnsavedChanges,
    isBatchApplying, isExporting, exportingChar, exportProgress, applySvgStyle,
    applySourceToAll, applyTransformToAll,
    runBatchApply, autoFixAll,
    cleanGlyphPaths,
    batchGenerateMissing,
    batchCleanGlyphs,
    libraryDiacritics,
    applyLibraryDiacritic, applyOtherDiacriticFromFont, applyDiacriticFromChar, fixSideBearings, saveCurrentDiacriticToLibrary,
    deleteLibraryDiacritic
  } = useFontEditor();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedProjects, setSavedProjects] = useState<Omit<Project, 'fontBuffer' | 'charsData'>[]>([]);
  const [activeDragTransform, setActiveDragTransform] = useState<{ x: number, y: number } | null>(null);
  const [activeDragTarget, setActiveDragTarget] = useState<'diacritic' | 'base' | null>(null);
  const [activeDragChar, setActiveDragChar] = useState<string | null>(null);

  const handleDrag = useCallback((t: { x: number, y: number }, target: 'diacritic' | 'base') => {
    setActiveDragTransform(t);
    setActiveDragTarget(target);
    setActiveDragChar(selectedChar);
  }, [selectedChar]);

  const handleDragEnd = useCallback(() => {
    setActiveDragTransform(null);
    setActiveDragTarget(null);
    setActiveDragChar(null);
  }, []);

  const handleTransformChange = useCallback((t: any, target: 'diacritic' | 'base') => {
    if (selectedChar) {
      updateCharTransform(selectedChar, t, target);
    }
  }, [selectedChar, updateCharTransform]);

  const handleEraserChange = useCallback((paths: any) => {
    if (selectedChar) {
      updateEraserPaths(selectedChar, paths);
    }
  }, [selectedChar, updateEraserPaths]);
  const [charFilter, setCharFilter] = useState<'all' | 'modified' | 'original'>('all');
  const [previewText, setPreviewText] = useState(() => {
    return localStorage.getItem('fontEditorPreviewText') || "Vypoj kŕdeľ šťastných dravcov zmäteným hučaním.";
  });
  const [isEditingPreviewText, setIsEditingPreviewText] = useState(false);

  const handlePreviewTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setPreviewText(newText);
    localStorage.setItem('fontEditorPreviewText', newText);
  };
  const [stylisticAdaptation, setStylisticAdaptation] = useState(false);
  const [sizeFilter, setSizeFilter] = useState<'all' | 'heading' | 'body' | 'micro'>('all');
  const [wrapText, setWrapText] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);

  useEffect(() => {
    if (selectedChar) {
      setShowHeatmap(true);
    }
  }, [selectedChar]);

  const [activeTool, setActiveTool] = useState<'select' | 'eraser'>('select');
  const [eraserSize, setEraserSize] = useState(20);
  const [globalShiftX, setGlobalShiftX] = useState(0);
  const [editTarget, setEditTarget] = useState<'diacritic' | 'base'>('diacritic');

  useEffect(() => {
    const handleSetTool = (e: any) => setActiveTool(e.detail);
    window.addEventListener('set-tool', handleSetTool);
    return () => window.removeEventListener('set-tool', handleSetTool);
  }, []);

  const undoIntervalRef = useRef<number | null>(null);
  const redoIntervalRef = useRef<number | null>(null);

  const startUndo = useCallback(() => {
    if (!canUndo) return;
    undo();
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    undoIntervalRef.current = window.setInterval(() => {
      undo();
    }, 150);
  }, [undo, canUndo]);

  const stopUndo = useCallback(() => {
    if (undoIntervalRef.current) {
      clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = null;
    }
  }, []);

  const startRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    if (redoIntervalRef.current) clearInterval(redoIntervalRef.current);
    redoIntervalRef.current = window.setInterval(() => {
      redo();
    }, 150);
  }, [redo, canRedo]);

  const stopRedo = useCallback(() => {
    if (redoIntervalRef.current) {
      clearInterval(redoIntervalRef.current);
      redoIntervalRef.current = null;
    }
  }, []);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      if (redoIntervalRef.current) clearInterval(redoIntervalRef.current);
    };
  }, []);

  const loadSavedProjects = useCallback(async () => {
    const projects = await db.getProjects();
    setSavedProjects(projects);
  }, []);

  useEffect(() => {
    if (!font) {
      loadSavedProjects();
    }
  }, [font, loadSavedProjects]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      loadFont(acceptedFiles);
    }
  }, [loadFont]);

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: {
      'font/ttf': ['.ttf'],
      'font/otf': ['.otf'],
      'font/ufont': ['.ufont'],
      'application/octet-stream': ['.ufont']
    },
    multiple: true
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  const handleImportJSONClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importJSON(file);
    }
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleCloseProject = () => {
    closeProject();
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteProject(id, e, loadSavedProjects);
  };

  const selectedInfo = selectedChar ? chars[selectedChar] : null;
  const transform = selectedInfo?.diacriticTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 };

  const analysis = React.useMemo(() => {
    if (!selectedInfo || !selectedInfo.baseGlyph) return null;
    if (selectedInfo.diacriticSource === 'svg') return { isSvg: true };
    if (!selectedInfo.diacriticGlyph) return null;
    
    const baseBBox = selectedInfo.baseGlyph.getBoundingBox();
    const baseWidth = baseBBox.x2 - baseBBox.x1;
    const baseHeight = baseBBox.y2 - baseBBox.y1;
    
    const t = selectedInfo.diacriticTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 };
    const origDBBox = selectedInfo.diacriticGlyph.getBoundingBox();
    
    const rad = (t.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const transformPoint = (x: number, y: number) => {
       let sx = x * t.scaleX;
       let sy = y * t.scaleY;
       let rx = sx * cos - sy * sin;
       let ry = sx * sin + sy * cos;
       return { x: rx + t.x, y: ry + t.y };
    };
    
    const p1 = transformPoint(origDBBox.x1, origDBBox.y1);
    const p2 = transformPoint(origDBBox.x2, origDBBox.y1);
    const p3 = transformPoint(origDBBox.x1, origDBBox.y2);
    const p4 = transformPoint(origDBBox.x2, origDBBox.y2);
    
    const dLeft = Math.min(p1.x, p2.x, p3.x, p4.x);
    const dRight = Math.max(p1.x, p2.x, p3.x, p4.x);
    const dBottom = Math.min(p1.y, p2.y, p3.y, p4.y);
    const dTop = Math.max(p1.y, p2.y, p3.y, p4.y);
    
    const dWidth = dRight - dLeft;
    const dHeight = dTop - dBottom;
    
    const advanceWidth = selectedInfo.advanceWidth ?? selectedInfo.baseGlyph.advanceWidth;
    
    const heightRatio = baseHeight > 0 ? (dHeight / baseHeight) * 100 : 0;
    const widthRatio = baseWidth > 0 ? (dWidth / baseWidth) * 100 : 0;
    
    const leftOverflow = dLeft < 0 ? Math.abs(dLeft) : 0;
    const rightOverflow = dRight > advanceWidth ? dRight - advanceWidth : 0;
    const overlap = dBottom < baseBBox.y2 && dTop > baseBBox.y1;
    
    return {
      isSvg: false,
      heightRatio,
      widthRatio,
      leftOverflow,
      rightOverflow,
      overlap
    };
  }, [selectedInfo]);

  if (!font) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div className="absolute top-4 right-4 flex items-center bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-xs">
              <button onClick={() => setLang('sk')} className={`px-3 py-1.5 rounded transition-colors ${lang === 'sk' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}>SK</button>
              <button onClick={() => setLang('cz')} className={`px-3 py-1.5 rounded transition-colors ${lang === 'cz' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}>CZ</button>
            </div>

          {/* Upload Section */}
          <div className="flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg overflow-hidden">
                <Logo className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tighter">{t("app.title")}</h1>
                <p className="text-zinc-500 text-sm">{t("app.createdBy")} <span className="text-indigo-400 font-medium">Flego</span></p>
              </div>
            </div>
            <h2 className="text-2xl font-medium mb-6">{t("app.newProject")}</h2>
            <div 
              {...getRootProps()} 
              className={cn(
                "flex-1 p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[300px]",
                isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
              )}
              title={t("app.dropHere")}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-zinc-500 mb-4" />
              <h3 className="text-xl font-medium mb-2">{t("app.uploadFonts") || "Nahrať fonty"}</h3>
              <p className="text-zinc-400 text-sm">
                {t("app.dropDesc") || "Potiahni a pusť sem..."}
              </p>
              <p className="text-zinc-500 text-xs mt-4">
                {t("app.bulkSupport") || "Podporuje hromadné nahrávanie..."}
              </p>
            </div>
          </div>

          {/* History Section */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium flex items-center gap-2">
                <Clock className="w-6 h-6 text-zinc-400" />
                {t("app.recentProjects") || "Nedávne projekty"}
              </h2>
            </div>
            <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[300px] max-h-[500px]">
              {savedProjects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p>{t("app.noSavedDesc") || "Zatiaľ nemáte žiadne uložené projekty."}</p>
                  <p className="mt-1">{t("app.uploadToStart") || "Nahrajte font pre začiatok."}</p>
                </div>
              ) : (
                <ul className="overflow-y-auto flex-1 divide-y divide-zinc-800/50 p-2 space-y-1">
                  {savedProjects.map(project => (
                    <li key={project.id} className="group bg-zinc-900/50 hover:bg-zinc-800/80 rounded-lg transition-all border border-transparent hover:border-zinc-700/50">
                      <div 
                        onClick={() => loadProject(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            loadProject(project.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="w-full text-left p-3 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all shrink-0">
                            <Type size={18} />
                          </div>
                          <div className="min-w-0 flex-1 pr-4">
                            <h4 className="font-medium text-zinc-200 group-hover:text-white transition-colors truncate" title={project.name}>{project.name}</h4>
                            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(project.lastModified).toLocaleString('sk-SK')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-medium px-2 py-1 bg-zinc-800 text-zinc-400 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {t("app.open") || "Otvoriť"}
                          </span>
                          <button 
                            onClick={(e) => handleDeleteProject(e, project.id)}
                            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title={t("app.deleteProject") || "Vymazať projekt"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans relative">
      {/* Export Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">{t("export.title")}</h2>
            <p className="text-zinc-400 text-sm mb-6">
              {exportingChar ? `${t("export.processing")} ${exportingChar}` : t("export.merging")}
            </p>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500 font-mono">{exportProgress}%</span>
          </div>
        </div>
      )}

      <div className={cn("flex flex-col h-full w-full transition-all duration-500", isExporting ? "blur-md scale-[0.98] opacity-50 pointer-events-none" : "")}>
        {/* Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-950/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCloseProject}
            className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
            title={t("app.closeProject")}
          >
            <X size={18} />
          </button>
          <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg overflow-hidden" title={t("app.logo")}>
            <Logo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight tracking-tight">{t("app.title")}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-zinc-500 leading-tight" title={t("app.loadedFont")}>{fontName}</p>
              {hasUnsavedChanges && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title={t("app.unsavedChanges")}></span>}
              <span className="text-[10px] text-zinc-600 border-l border-zinc-800 pl-2">by Flego</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border-r border-zinc-800 pr-4">
            <button 
              onMouseDown={startUndo}
              onMouseUp={stopUndo}
              onMouseLeave={stopUndo}
              onTouchStart={startUndo}
              onTouchEnd={stopUndo}
              disabled={!canUndo}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              title={t("app.undo")}
            >
              <Undo2 size={18} />
            </button>
            <button 
              onMouseDown={startRedo}
              onMouseUp={stopRedo}
              onMouseLeave={stopRedo}
              onTouchStart={startRedo}
              onTouchEnd={stopRedo}
              disabled={!canRedo}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              title={t("app.redo")}
            >
              <Redo2 size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
          <button 
            onClick={handleImportJSONClick}
            className="px-3 py-1.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors flex items-center gap-2"
            title={t("app.loadSettings")}
          >
            <Upload size={16} />
            {t("app.importJson") || "Importovať JSON"}
          </button>
          <div className="flex items-center gap-2">
            {slaveFonts.length > 0 && (
              <button 
                onClick={runBatchApply}
                disabled={isBatchApplying}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                  isBatchApplying ? "bg-zinc-800 text-zinc-500" : "bg-amber-600 hover:bg-amber-500 text-white"
                )}
                title={t("app.applyVariants")}
              >
                <Wand2 size={16} className={isBatchApplying ? "animate-spin" : ""} />
                {t("app.batchApply") || "Aplikovať voľby"} ({slaveFonts.length})
              </button>
            )}
            <button 
              onClick={exportJSON}
              className="px-3 py-1.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors flex items-center gap-2"
              title={t("app.saveSettings")}
            >
              <Download size={16} />
              {t("app.exportJson") || "Exportovať JSON"}
            </button>
          </div>
          <button 
            onClick={() => exportFont(stylisticAdaptation, globalShiftX)}
            className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors flex items-center gap-2"
            title={t("app.downloadFont")}
          >
            <Download size={16} />
            {t("app.exportFontBtn") || "Exportovať Font"}
          </button>
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded ml-2 px-1 py-1 text-xs">
            <button onClick={() => setLang('sk')} className={`px-2 py-1 rounded transition-colors ${lang === 'sk' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}>SK</button>
            <button onClick={() => setLang('cz')} className={`px-2 py-1 rounded transition-colors ${lang === 'cz' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}>CZ</button>
          </div>
        </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel: Character List */}
        <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/30 shrink-0 min-h-0">
          <div className="p-3 border-b border-zinc-800 flex flex-col gap-2 shrink-0">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider" title={t("editor.characters")}>{t("editor.characters")}</h2>
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-md p-0.5">
              <button 
                onClick={() => setCharFilter('all')}
                className={cn("flex-1 px-1 py-1 text-[10px] font-medium rounded transition-colors", charFilter === 'all' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                {t("charList.filter.all") || "Všetky"}
              </button>
              <button 
                onClick={() => setCharFilter('modified')}
                className={cn("flex-1 px-1 py-1 text-[10px] font-medium rounded transition-colors", charFilter === 'modified' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                {t("charList.filter.modified") || "Upravené"}
              </button>
              <button 
                onClick={() => setCharFilter('original')}
                className={cn("flex-1 px-1 py-1 text-[10px] font-medium rounded transition-colors", charFilter === 'original' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                {t("charList.filter.original") || "Pôvodné"}
              </button>
            </div>
            <button
              onClick={autoFixAll}
              className="mt-1 px-2 py-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded transition-all flex items-center justify-center gap-1.5"
              title={t("tool.autoFixAllTitle")}
            >
              <Wand2 size={12} />
              {t("tool.autoFixAll") || "Auto Úprava"}
            </button>
            <button
              onClick={() => {
                const updates: Record<string, Partial<CharInfo>> = {};
                Object.entries(chars).forEach(([char, info]) => {
                  if (info.baseGlyph && info.diacriticGlyph) {
                    updates[char] = { status: 'edited', svgDiacritic: undefined };
                  }
                });
                batchUpdateChars(updates);
              }}
              className="mt-1 px-2 py-1.5 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded transition-all flex items-center justify-center gap-1.5"
              title={t("tool.composeAllTitle")}
            >
              <Wand2 size={12} />
              {t("tool.composeAll") || "Zložiť všetky znaky"}
            </button>
            <button
              onClick={() => {
                const updates: Record<string, Partial<CharInfo>> = {};
                Object.entries(chars).forEach(([char, info]) => {
                  if (font.charToGlyphIndex(char) > 0) {
                    updates[char] = { status: 'ok', svgDiacritic: undefined };
                  } else if (info.baseGlyph && info.diacriticGlyph) {
                    updates[char] = { status: 'generated', svgDiacritic: undefined };
                  } else {
                    updates[char] = { status: 'missing', svgDiacritic: undefined };
                  }
                });
                batchUpdateChars(updates);
              }}
              className="mt-1 px-2 py-1.5 text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 rounded transition-all flex items-center justify-center gap-1.5"
              title={t("tool.resetAllTitle")}
            >
              <RotateCcw size={12} />
              {t("tool.resetAll") || "Resetovať všetko"}
            </button>
            <button 
              onClick={batchGenerateMissing}
              className="mt-1 px-2 py-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded transition-all flex items-center justify-center gap-1.5"
              title={t("tool.generateMissingTitle")}
            >
              <Wand2 size={12} />
              {t("tool.generateMissing") || "Doplniť chýbajúce"}
            </button>
            <button 
              onClick={batchCleanGlyphs}
              className="mt-1 px-2 py-1.5 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded transition-all flex items-center justify-center gap-1.5"
              title={t("tool.cleanPathsTitle")}
            >
              <Shapes size={12} />
              {t("tool.cleanPaths") || "Vyčistiť všetky"}
            </button>
            <button 
              onClick={() => fixSideBearings()}
              className="mt-1 px-2 py-1.5 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded transition-all flex items-center justify-center gap-1.5"
              title={t("tool.fixSidebearingsTitle")}
            >
              <MoveHorizontal size={12} />
              {t("tool.fixSidebearings") || "Opraviť medzery"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {SINGLE_CHARS.filter(char => {
                const info = chars[char];
                if (charFilter === 'all') return true;
                if (charFilter === 'modified') return info && (info.status === 'generated' || info.status === 'edited');
                if (charFilter === 'original') return info && info.status === 'ok';
                return true;
              }).map(char => {
                const info = chars[char];
                const statusColor = 
                  !info ? 'bg-zinc-800 text-zinc-500' :
                  info.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  info.status === 'generated' || info.status === 'edited' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-transparent' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/20';

                let statusText = t("app.statusUnknown");
                if (info) {
                  if (info.status === 'ok') statusText = t('charList.status.ok');
                  else if (info.status === 'missing') statusText = t("app.statusMissing");
                  else if (info.status === 'generated') statusText = t('charList.status.generated');
                  else if (info.status === 'edited') statusText = t('charList.status.edited');
                  
                  if (info.isScaledToLowercase) statusText += ` (${t('charList.scaledToLowercase')})`;
                }

                return (
                  <button
                    key={char}
                    onClick={() => setSelectedChar(char)}
                    title={`${t("charList.editToolTip")} ${char} (${statusText})`}
                    className={cn(
                      "aspect-square flex items-center justify-center text-lg rounded border transition-all relative",
                      statusColor,
                      selectedChar === char ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 border-transparent" : "hover:brightness-125",
                      exportingChar === char ? "ring-2 ring-white animate-pulse" : ""
                    )}
                  >
                    {char}
                    {exportingChar === char && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                      </div>
                    )}
                    {info?.isScaledToLowercase && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" title="Zmenšené na malé písmeno" />
                    )}
                    {info?.anomalies?.includes("anom.overlap") && (
                      <div className="absolute bottom-1 right-1 text-rose-500" title={`Výstraha: ${t("check.overlap")}`}>
                        <AlertTriangle size={10} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center: Canvas & Tester */}
        <main className="flex-1 relative bg-zinc-950 flex flex-col min-w-0">
          {/* Top Half: Canvas Editor */}
          <div className="flex-1 relative flex flex-col border-b border-zinc-800 min-h-0">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="px-3 py-1.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-sm backdrop-blur-sm flex items-center gap-2" title={t("app.selectedCharDesc") || ""}>
                <span className="text-zinc-400">{t("app.edit") || "Úprava:"}</span>
                <span className="font-bold text-lg">{selectedChar}</span>
              </div>
              <button 
                onClick={() => {
                  const unitsPerEm = font.unitsPerEm;
                  const ascender = font.ascender;
                  const width = unitsPerEm * 1.5;
                  const height = unitsPerEm * 1.5;
                  const x = -unitsPerEm * 0.25;
                  const y = -ascender - (unitsPerEm * 0.25);
                  // This is a bit hacky since we can't easily reach CanvasEditor's internal state
                  // but we can trigger a re-render or use a key
                  setSelectedChar(prev => prev); // Trigger re-render
                  window.dispatchEvent(new CustomEvent('reset-canvas-view'));
                }}
                className="px-3 py-1.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-xs backdrop-blur-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2"
                title={t("app.recenterView")}
              >
                <RotateCcw size={14} />
                Vycentrovať pohľad
              </button>

              <div className="flex flex-col gap-1 p-1 rounded-lg bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm">
                <button 
                  onClick={() => setActiveTool('select')}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    activeTool === 'select' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  )}
                  title={t("canvas.selectTool")}
                >
                  <MousePointer2 size={18} />
                </button>
                <button 
                  onClick={() => setActiveTool('eraser')}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    activeTool === 'eraser' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  )}
                  title={t("canvas.eraserTool")}
                >
                  <Eraser size={18} />
                </button>
              </div>

              {activeTool === 'eraser' && (
                <div className="px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">{t("canvas.eraserSize")}</span>
                    <span className="text-xs text-indigo-400 font-mono">{eraserSize}</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" max="100" step="1"
                    value={eraserSize}
                    onChange={(e) => setEraserSize(Number(e.target.value))}
                    className="w-32 accent-indigo-500"
                  />
                </div>
              )}
            </div>
            
            <div className="flex-1 flex items-center justify-center relative overflow-hidden" id="canvas-container">
              {selectedChar && selectedInfo ? (
                <CanvasEditor 
                  font={font} 
                  charInfo={selectedInfo} 
                  onTransformChange={handleTransformChange} 
                  onEraserChange={handleEraserChange}
                  activeTool={activeTool}
                  eraserSize={eraserSize}
                  stylisticAdaptation={stylisticAdaptation}
                  showHeatmap={showHeatmap}
                  editTarget={editTarget}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                />
              ) : (
                <div className="text-zinc-600 flex flex-col items-center">
                  <span className="text-sm">{t("canvas.selectCharDesc")}</span>
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-4 z-10 text-xs text-zinc-500 flex gap-4 pointer-events-none">
              <span className="bg-zinc-900/80 px-2 py-1 rounded backdrop-blur-sm">{t("canvas.hintDrag")}</span>
              <span className="bg-zinc-900/80 px-2 py-1 rounded backdrop-blur-sm">{t("canvas.hintPan")}</span>
              <span className="bg-zinc-900/80 px-2 py-1 rounded backdrop-blur-sm">{t("app.scrollZoom") || "Zoom"}</span>
            </div>
          </div>

          <div className="h-72 shrink-0 bg-zinc-950 flex flex-col border-t border-zinc-800">
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span>{t("preview.title")}</span>
                <div className="flex bg-zinc-950 border border-zinc-800 rounded p-0.5 ml-2">
                  {(['all', 'heading', 'body', 'micro'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSizeFilter(f)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[9px] transition-colors",
                        sizeFilter === f ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {f === 'all' ? (t('app.previewAll') || 'Všetky') : f === 'heading' ? (t('app.previewHeading') || 'Nadpis') : f === 'body' ? (t('app.previewBody') || 'Bežný') : 'Micro'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isEditingPreviewText ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={previewText}
                      onChange={handlePreviewTextChange}
                      className="bg-zinc-800 text-white text-[10px] px-2 py-1 rounded border border-zinc-700 focus:outline-none focus:border-indigo-500 w-48"
                      autoFocus
                      onBlur={() => setIsEditingPreviewText(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingPreviewText(false)}
                    />
                    <button 
                      onClick={() => setIsEditingPreviewText(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditingPreviewText(true)}
                    className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    title={t("app.editPreview")}
                  >
                    <Edit2 size={10} />
                    Upraviť text
                  </button>
                )}
                <label className="flex items-center gap-2 cursor-pointer" title={t("preview.wrap")}>
                  <input 
                    type="checkbox" 
                    checked={wrapText} 
                    onChange={(e) => setWrapText(e.target.checked)}
                    className="w-3 h-3 accent-indigo-500"
                  />
                  <span className="text-[10px] normal-case font-normal text-zinc-500">Zalomiť text</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title="Simulovať nedokonalosti kresby pre lepší vizuálny odhad">
                  <input 
                    type="checkbox" 
                    checked={stylisticAdaptation} 
                    onChange={(e) => setStylisticAdaptation(e.target.checked)}
                    className="w-3 h-3 accent-indigo-500"
                  />
                  <span className="text-[10px] normal-case font-normal text-zinc-500">Štylistická adaptácia</span>
                </label>
              </div>
            </div>
            <div className={cn(
              "flex-1 min-h-0 transition-all duration-300",
              sizeFilter === 'heading' ? 'h-48' : sizeFilter === 'body' ? 'h-32' : sizeFilter === 'micro' ? 'h-24' : 'flex-1'
            )}>
              <TextTester 
                font={font} 
                chars={chars} 
                previewText={previewText}
                stylisticAdaptation={stylisticAdaptation} 
                sizeFilter={sizeFilter} 
                wrapText={wrapText} 
                globalShiftX={globalShiftX} 
                selectedChar={selectedChar} 
                activeDragTransform={activeDragChar === selectedChar ? activeDragTransform : null}
                activeDragTarget={activeDragChar === selectedChar ? activeDragTarget : null}
              />
            </div>
          </div>
        </main>

        {/* Right Panel: Properties */}
        <aside className="w-72 border-l border-zinc-800 flex flex-col bg-zinc-900/30 shrink-0 min-h-0">
          <div className="p-3 border-b border-zinc-800 flex items-center gap-2 shrink-0">
            <Settings size={16} className="text-zinc-400" />
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider" title={t("editor.properties")}>{t("editor.properties")}</h2>
          </div>
          
          <div className="p-4 flex flex-col gap-6 overflow-y-auto min-h-0 scrollbar-thin">
            {/* Global Settings */}
            <div className="pb-6 border-b border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-500 block font-medium uppercase tracking-wider">{t("app.globalSettings") || "Str"}</label>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block" title={t("app.globalOffsetDesc")}>{t("adv.globalOffsetX")}</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="-500" 
                      max="500" 
                      value={globalShiftX} 
                      onChange={(e) => setGlobalShiftX(Number(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <input 
                      type="number" 
                      value={globalShiftX} 
                      onChange={(e) => setGlobalShiftX(Number(e.target.value))}
                      className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {selectedChar && selectedInfo ? (
              <>
                {/* Status */}
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block" title="Aktuálny stav znaku vo fonte">{t("props.status")}</label>
                <div className="flex flex-col gap-2">
                  <div className="text-sm px-3 py-2 rounded bg-zinc-800/50 border border-zinc-700/50 flex justify-between items-center">
                    {selectedInfo.status === 'ok' && <span className="text-emerald-400">{t("charList.status.ok")}</span>}
                    {selectedInfo.status === 'missing' && <span className="text-rose-400">{t("app.statusMissing")}</span>}
                    {selectedInfo.status === 'generated' && <span className="text-indigo-400">{t("charList.status.generated")}</span>}
                    {selectedInfo.status === 'edited' && <span className="text-indigo-400">{t("charList.status.edited")}</span>}
                  </div>
                  
                  {selectedInfo.status === 'ok' && selectedInfo.baseGlyph && selectedInfo.diacriticGlyph && (
                    <button 
                      onClick={() => applySvgStyle('auto', selectedChar)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                      title={t("props.splitOriginalTitle")}
                    >
                      <Wand2 size={10} />
                      {t("app.switchToDiacritic") || "Prepnúť"}
                    </button>
                  )}

                  {(selectedInfo.status === 'edited' || selectedInfo.status === 'generated' || (selectedInfo.eraserPaths && selectedInfo.eraserPaths.length > 0)) && (
                    <button 
                      onClick={() => {
                        let status: CharStatus = 'missing';
                        if (font.charToGlyphIndex(selectedChar) > 0) status = 'ok';
                        else if (selectedInfo.baseGlyph && selectedInfo.diacriticGlyph) status = 'generated';

                        batchUpdateChars({
                          [selectedChar]: {
                            status,
                            svgDiacritic: undefined,
                            diacriticTransform: undefined,
                            eraserPaths: undefined,
                            advanceWidth: undefined
                          }
                        });
                      }}
                      className="w-full mt-2 px-3 py-2 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded transition-all flex items-center justify-center gap-2"
                      title={t("props.resetCharTitle")}
                    >
                      <RotateCcw size={14} />
                      Resetovať tento znak
                    </button>
                  )}
                </div>
              </div>

              {/* Anomaly Detection */}
              {selectedInfo.anomalies && selectedInfo.anomalies.length > 0 && (
                <div className="pt-6 border-t border-zinc-800/50">
                  <h3 className="text-xs font-medium text-rose-400 mb-3 flex items-center gap-2">
                    <X size={14} />
                    {t("app.anomalies") || "Anomálie"}
                  </h3>
                  <ul className="space-y-1">
                    {selectedInfo.anomalies.map((anomaly, i) => (
                      <li key={i} className="text-xs text-rose-300 bg-rose-500/10 px-2 py-1 rounded">
                        {t(anomaly as any) || anomaly}
                      </li>
                    ))}
                  </ul>
                  {(selectedInfo.anomalies.includes('anom.islands') || selectedInfo.anomalies.includes('anom.complex')) && (
                    <button 
                      onClick={() => cleanGlyphPaths(selectedChar)}
                      className="w-full mt-3 px-3 py-2 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded transition-all flex items-center justify-center gap-2"
                      title={t("app.autoMerge")}
                    >
                      <Wand2 size={12} />
                      {t("app.cleanPaths") || "Vyčistiť"}
                    </button>
                  )}
                  {selectedInfo.anomalies.includes('anom.narrow') && (
                    <button 
                      onClick={() => {
                        // This is a bit simplified, but we can try to auto-adjust advance width
                        // We'd need to know the bounds, which we don't have here easily
                        // But we can trigger a re-calculation or just set a safe default
                        if (selectedInfo.glyph) {
                          const bounds = selectedInfo.glyph.getBoundingBox();
                          const width = bounds.x2 - bounds.x1;
                          updateAdvanceWidth(selectedChar, Math.round(width + 200));
                        }
                      }}
                      className="w-full mt-2 px-3 py-2 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded transition-all flex items-center justify-center gap-2"
                      title={t("props.fixWidthTitle")}
                    >
                      <Wand2 size={12} />
                      Opraviť šírku znaku
                    </button>
                  )}
                </div>
              )}

              {/* Source Selection */}
              <div className="pb-6 border-b border-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-zinc-500 block" title={t("app.diacriticSourceDesc")}>{t("props.diacriticSource")}</label>
                  <button 
                    onClick={() => applySourceToAll(selectedChar)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    title={t("props.applyToAllSourceTitle")}
                  >
                    Použiť na všetko
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {font.charToGlyphIndex(selectedChar) > 0 && (
                    <button
                      onClick={() => applySvgStyle('original', selectedChar)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded border text-[10px] transition-all",
                        (selectedInfo.status === 'ok') ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500/50" : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      )}
                      title={t("app.useOriginal")}
                    >
                      <Type size={16} />
                      <span>{t("app.original") || "Original"}</span>
                    </button>
                  )}
                  <button
                    onClick={() => applySvgStyle('auto', selectedChar)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded border text-[10px] transition-all relative overflow-hidden",
                      (selectedInfo.status !== 'ok' && !selectedInfo.svgDiacritic) ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500/50" : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    )}
                    title={t("props.createCompound")}
                  >
                    <Wand2 size={16} />
                    <span>{t("app.compound") || "Zložený"}</span>
                    {selectedInfo.diacriticSource && (
                      <span className="absolute top-0 right-0 bg-indigo-500 text-[8px] text-white px-1 rounded-bl">
                        {selectedInfo.diacriticSource === 'standalone' ? (t('app.pov') || 'Pôv') : (t('app.krad') || 'Krad')}
                      </span>
                    )}
                  </button>
                  {(['Sans', 'Serif', 'Monospace', 'Pixel', 'Display'] as FontStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => applySvgStyle(style, selectedChar)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded border text-[10px] transition-all",
                        (selectedInfo.svgDiacritic?.style === style) ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500/50" : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      )}
                      title={`${t("app.useSvgStyle")} ${style}`}
                    >
                      <Shapes size={16} />
                      <span>SVG {style}</span>
                    </button>
                  ))}
                  <div className="col-span-2 pt-2 border-t border-zinc-800/50">
                    <label className="text-[10px] text-zinc-500 mb-1 block">{t("props.extractedFrom")}</label>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {Object.entries(chars)
                        .filter(([char, info]) => info.diacriticGlyph && char !== selectedChar)
                        .map(([char, info]) => (
                          <button
                            key={`extracted-${char}`}
                            onClick={() => applyDiacriticFromChar(char, selectedChar)}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 flex flex-col items-center justify-center gap-1"
                            title={`${t("props.useDiacriticFrom")} ${char}`}
                          >
                            <span className="text-[8px] text-zinc-500 leading-none">z {char}</span>
                            <svg viewBox={`${-font.unitsPerEm * 0.2} ${-font.unitsPerEm * 1.1} ${font.unitsPerEm * 0.8} ${font.unitsPerEm}`} className="w-5 h-5 text-zinc-300 fill-current">
                              <path d={info.diacriticGlyph!.getPath(0, 0, font.unitsPerEm, undefined, font).toPathData(2)} />
                            </svg>
                          </button>
                        ))}
                    </div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">{t("props.otherDiacritics")}</label>
                    <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto scrollbar-thin pr-1">
                      {Array.from({ length: font.glyphs.length }).map((_, i) => font.glyphs.get(i)).filter(g => {
                        if (!g.name) return false;
                        const name = g.name.toLowerCase();
                        const isDiacritic = 
                          /[áéíóúýĺŕÁÉÍÓÚÝĹŔďťľčňšťžřěČĎĽŇŠŤŽŘĚůŮäÄëËïÏöÖüÜÿŸâêîôûÂÊÎÔÛ\u0300-\u036F]/.test(g.name) ||
                          /^(acute|grave|caron|circumflex|dieresis|tilde|macron|breve|dotaccent|ring|cedilla|ogonek|hungarumlaut|commaaccent|.*comb)$/.test(name) ||
                          /^uni03[0-6][0-9a-f]$/.test(name);
                        return isDiacritic;
                      }).map(g => (
                        <button
                          key={g.name}
                          onClick={() => applyOtherDiacriticFromFont(g.name!, selectedChar)}
                          className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 flex items-center justify-center"
                          title={`Použiť glyf ${g.name}`}
                        >
                          <svg viewBox={`${-font.unitsPerEm * 0.2} ${-font.unitsPerEm * 1.1} ${font.unitsPerEm * 0.8} ${font.unitsPerEm}`} className="w-6 h-6 text-zinc-300 fill-current">
                            <path d={g.getPath(0, 0, font.unitsPerEm, undefined, font).toPathData(2)} />
                          </svg>
                        </button>
                      ))}
                    </div>
                    {selectedInfo && (selectedInfo.svgDiacritic || selectedInfo.diacriticGlyph) && (
                      <button
                        onClick={() => {
                          const name = prompt(t("prompt.diacriticName"));
                          if (name) saveCurrentDiacriticToLibrary(name);
                        }}
                        className="w-full mt-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] transition-colors"
                        title={t("app.addToLib")}
                      >
                        Pridať do knižnice
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Transform Controls */}
              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="text-xs font-medium text-zinc-300" title="Možnosti úpravy pozície a tvaru">{t("props.transform")}</h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => applyTransformToAll(selectedChar)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      title={t("props.applyToAllTransformTitle")}
                    >
                      Použiť na všetko
                    </button>
                    <button 
                      onClick={() => updateCharTransform(selectedChar, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 }, editTarget)}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      title={t("props.resetTransform")}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Target Toggle */}
                <div className="flex bg-zinc-950 rounded border border-zinc-800 p-1">
                  <button
                    onClick={() => setEditTarget('diacritic')}
                    className={cn(
                      "flex-1 text-[10px] py-1.5 rounded transition-all",
                      editTarget === 'diacritic' ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Diakritika
                  </button>
                  <button
                    onClick={() => setEditTarget('base')}
                    className={cn(
                      "flex-1 text-[10px] py-1.5 rounded transition-all",
                      editTarget === 'base' ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Základný znak
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => scaleToLowercase(selectedChar)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[10px] transition-colors border",
                      selectedInfo.isScaledToLowercase 
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30" 
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                    )}
                    title={t("props.shrinkToLower") || "Zmenšiť celý znak na veľkosť malého písmena (prejaví sa v náhľade a pri exporte)"}
                  >
                    {selectedInfo.isScaledToLowercase ? (t("props.shrinkOn") || "Zmenšenie zapnuté") : (t("props.shrinkToLower") || "Zmenšiť na malé písmeno")}
                  </button>
                  <button
                    onClick={() => fixSideBearings(selectedChar)}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[10px] transition-colors border bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                    title={t("tool.fixSidebearingsTitle") || "Opraviť bočné medzery (Advance Width) podľa základného znaku"}
                  >
                    <MoveHorizontal size={12} />
                    {t("tool.fixSidebearings") || "Opraviť medzery"}
                  </button>
                </div>

                <button
                  onClick={batchScaleToLowercase}
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded text-[10px] transition-colors border bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  title={t("app.scaleDesc")}
                >
                  <Wand2 size={12} />
                  Zmenšiť všetky malé znaky
                </button>
                
                <div className="space-y-3">
                  <SliderWithButtons 
                    label={t("props.scale")}
                    value={(editTarget === 'base' ? selectedInfo.baseTransform?.scaleX : selectedInfo.diacriticTransform?.scaleX) ?? 1}
                    min={0.01}
                    max={10}
                    step={0.01}
                    onChange={(val) => updateCharTransform(selectedChar, { scaleX: val, scaleY: val }, editTarget)}
                    title={t("app.scaleAll")}
                  />

                  <SliderWithButtons 
                    label={t("props.offsetX")}
                    value={(editTarget === 'base' ? selectedInfo.baseTransform?.x : selectedInfo.diacriticTransform?.x) ?? 0}
                    min={-3000}
                    max={3000}
                    onChange={(val) => updateCharTransform(selectedChar, { x: val }, editTarget)}
                    title={t("app.moveH")}
                  />

                  <SliderWithButtons 
                    label={t("props.offsetY")}
                    value={(editTarget === 'base' ? selectedInfo.baseTransform?.y : selectedInfo.diacriticTransform?.y) ?? 0}
                    min={-3000}
                    max={3000}
                    onChange={(val) => updateCharTransform(selectedChar, { y: val }, editTarget)}
                    title={t("app.moveV")}
                  />

                  <SliderWithButtons 
                    label={t("props.rotation")}
                    value={(editTarget === 'base' ? selectedInfo.baseTransform?.rotation : selectedInfo.diacriticTransform?.rotation) ?? 0}
                    min={-180}
                    max={180}
                    unit="°"
                    onChange={(val) => updateCharTransform(selectedChar, { rotation: val }, editTarget)}
                    title={t("app.rotateDeg")}
                  />

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                      onClick={() => updateCharTransform(selectedChar, { flipX: !(editTarget === 'base' ? selectedInfo.baseTransform?.flipX : selectedInfo.diacriticTransform?.flipX) }, editTarget)}
                      className={cn(
                        "flex items-center justify-center gap-2 p-2 rounded border text-[10px] transition-all",
                        (editTarget === 'base' ? selectedInfo.baseTransform?.flipX : selectedInfo.diacriticTransform?.flipX) ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500/50" : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      )}
                      title={t("app.flipH")}
                    >
                      <FlipHorizontal size={14} />
                      <span>{t("props.flipX")}</span>
                    </button>
                    <button 
                      onClick={() => updateCharTransform(selectedChar, { flipY: !(editTarget === 'base' ? selectedInfo.baseTransform?.flipY : selectedInfo.diacriticTransform?.flipY) }, editTarget)}
                      className={cn(
                        "flex items-center justify-center gap-2 p-2 rounded border text-[10px] transition-all",
                        (editTarget === 'base' ? selectedInfo.baseTransform?.flipY : selectedInfo.diacriticTransform?.flipY) ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500/50" : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      )}
                      title={t("app.flipV")}
                    >
                      <FlipVertical size={14} />
                      <span>{t("props.flipY")}</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-zinc-800/50">
                    <NumberWithButtons 
                      label={t("props.scaleX")}
                      value={(editTarget === 'base' ? selectedInfo.baseTransform?.scaleX : selectedInfo.diacriticTransform?.scaleX) ?? 1}
                      onChange={(val) => updateCharTransform(selectedChar, { scaleX: val }, editTarget)}
                      title={t("app.scaleH")}
                    />
                    <NumberWithButtons 
                      label={t("props.scaleY")}
                      value={(editTarget === 'base' ? selectedInfo.baseTransform?.scaleY : selectedInfo.diacriticTransform?.scaleY) ?? 1}
                      onChange={(val) => updateCharTransform(selectedChar, { scaleY: val }, editTarget)}
                      title={t("app.scaleV")}
                    />
                  </div>

                  <div className="space-y-4 pt-2 border-t border-zinc-800/50">
                    <SliderWithButtons 
                      label={t("props.skewX")}
                      value={(editTarget === 'base' ? selectedInfo.baseTransform?.skewX : selectedInfo.diacriticTransform?.skewX) ?? 0}
                      min={-45}
                      max={45}
                      unit="°"
                      onChange={(val) => updateCharTransform(selectedChar, { skewX: val }, editTarget)}
                      title={t("app.skewHDeg")}
                    />
                    <SliderWithButtons 
                      label={t("props.skewY")}
                      value={(editTarget === 'base' ? selectedInfo.baseTransform?.skewY : selectedInfo.diacriticTransform?.skewY) ?? 0}
                      min={-45}
                      max={45}
                      unit="°"
                      onChange={(val) => updateCharTransform(selectedChar, { skewY: val }, editTarget)}
                      title={t("app.skewVDeg")}
                    />
                  </div>
                </div>
              </div>

              {/* {t("check.title")} */}
              {analysis && (
                <div className="pt-4 space-y-3 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-zinc-300 flex items-center gap-2" title={t("app.propAnalysis")}>
                      <Activity size={14} className="text-blue-400" />
                      {t("check.title")}
                    </h3>
                  </div>
                  
                  {analysis.isSvg ? (
                    <div className="text-[10px] text-zinc-500 italic px-2">
                      {t("check.svgNotSupported")}
                    </div>
                  ) : (
                    <div className="space-y-2 px-1">
                      {/* Height Ratio */}
                      <div className={cn(
                        "flex items-center justify-between text-[10px] px-1 py-0.5 rounded border",
                        analysis.heightRatio > 40 || analysis.heightRatio < 10 ? "border-rose-500/50 bg-rose-500/5" : "border-transparent"
                      )}>
                        <span className="text-zinc-400">{t("app.heightRatio") || "Výška:"}</span>
                        <span className={cn("font-medium", analysis.heightRatio > 40 || analysis.heightRatio < 10 ? "text-amber-400" : "text-emerald-400")}>
                          {analysis.heightRatio.toFixed(1)}%
                        </span>
                      </div>
                      {/* Width Ratio */}
                      <div className={cn(
                        "flex items-center justify-between text-[10px] px-1 py-0.5 rounded border",
                        analysis.widthRatio > 80 ? "border-rose-500/50 bg-rose-500/5" : "border-transparent"
                      )}>
                        <span className="text-zinc-400">{t("app.widthRatio") || "Šírka:"}</span>
                        <span className={cn("font-medium", analysis.widthRatio > 80 ? "text-amber-400" : "text-emerald-400")}>
                          {analysis.widthRatio.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* Warnings */}
                      <div className="space-y-1.5 pt-1">
                        {analysis.leftOverflow > 0 && (
                          <div className="flex items-start gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>{t("check.overflowLeft", {val: String(Math.round(analysis.leftOverflow))})}</span>
                          </div>
                        )}
                        {analysis.rightOverflow > 0 && (
                          <div className="flex items-start gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>{t("check.overflowRight", {val: String(Math.round(analysis.rightOverflow))})}</span>
                          </div>
                        )}
                        {analysis.overlap && (
                          <div className="flex items-start gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>{t("check.overlap")}</span>
                          </div>
                        )}
                        {analysis.leftOverflow === 0 && analysis.rightOverflow === 0 && !analysis.overlap && analysis.heightRatio >= 10 && analysis.heightRatio <= 40 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                            <CheckCircle2 size={12} />
                            <span>{t("check.proportionOK")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Diacritic Library */}
              <div className="space-y-3 pt-6 border-t border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-zinc-300 flex items-center gap-2" title={t("app.libDesc")}>
                    <Library size={14} className="text-indigo-400" />
                    {t("app.diacriticLibrary")}
                  </h3>
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">{libraryDiacritics.length}</span>
                </div>
                
                {libraryDiacritics.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                    {libraryDiacritics.map((d) => (
                      <div key={d.id} className={cn("group flex items-center gap-2 p-2 bg-zinc-950/50 border rounded transition-all", d.type === 'glyph' ? "border-indigo-500/30 hover:border-indigo-500" : "border-zinc-800 hover:border-zinc-600")}>
                        <button 
                          onClick={() => selectedChar && applyLibraryDiacritic(d, selectedChar)}
                          className="flex-1 flex items-center gap-3 text-left"
                          title={t("app.applyTarget")}
                        >
                          <div className="w-12 h-12 bg-zinc-900 rounded flex items-center justify-center shrink-0 overflow-hidden border border-zinc-800/50">
                            <svg viewBox={`${-font.unitsPerEm * 0.2} ${-font.unitsPerEm * 1.1} ${font.unitsPerEm * 0.8} ${font.unitsPerEm}`} className="w-10 h-10 text-indigo-400 fill-current">
                              <path d={d.path} />
                            </svg>
                          </div>
                          <span className="text-xs text-zinc-400 truncate group-hover:text-zinc-200">{d.name}</span>
                        </button>
                        <button 
                          onClick={() => deleteLibraryDiacritic(d.id)}
                          className="p-1.5 text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Odstrániť z knižnice"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-600 italic py-2 text-center border border-dashed border-zinc-800 rounded">
                    Knižnica je prázdna. Znaky sa uložia pri exporte fontu.
                  </div>
                )}
              </div>

              {/* Advanced */}
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-zinc-300 border-b border-zinc-800 pb-2" title="Pokročilé nastavenia znaku">{t("adv.title")}</h3>
                
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={stylisticAdaptation}
                      onChange={(e) => setStylisticAdaptation(e.target.checked)}
                    />
                    <div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors"></div>
                    <svg viewBox="0 0 14 14" fill="none" className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                      <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{t("app.styleAdapt") || "Adp"}</span>
                    <p className="text-xs text-zinc-500 mt-1">{t("app.styleAdaptDesc") || "Desc"}</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={showHeatmap}
                      onChange={(e) => setShowHeatmap(e.target.checked)}
                    />
                    <div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors"></div>
                    <svg viewBox="0 0 14 14" fill="none" className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                      <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{t("app.heatmap") || "Heatmapa"}</span>
                    <p className="text-xs text-zinc-500 mt-1">{t("app.heatmapDesc") || "Vizualizácia"}</p>
                  </div>
                </label>

                <div title={t("app.totalWidth")}>
                  <label className="text-xs text-zinc-500 mb-1 block">{t("adv.advanceWidth")}</label>
                  <input 
                    type="number" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm" 
                    value={selectedInfo.advanceWidth || ''} 
                    onChange={(e) => updateAdvanceWidth(selectedChar, Number(e.target.value))}
                    placeholder="Auto" 
                    disabled={selectedInfo.status === 'ok'}
                  />
                </div>

                {selectedInfo.eraserPaths && selectedInfo.eraserPaths.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/50">
                    <button 
                      onClick={() => updateEraserPaths(selectedChar, [])}
                      className="w-full px-3 py-2 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded transition-all flex items-center justify-center gap-2"
                      title={t("app.eraseAll")}
                    >
                      <Trash2 size={14} />
                      {t("app.restoreShape") || "Obnoviť"}
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="text-sm text-zinc-600 text-center py-8">
                Vyberte znak z ľavého panela pre zobrazenie jeho vlastností
              </div>
            )}
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}
