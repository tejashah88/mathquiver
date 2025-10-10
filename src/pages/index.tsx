'use client';

import 'mathlive/fonts.css';

import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

import Markdown from 'react-markdown';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faPlus, faX } from '@fortawesome/free-solid-svg-icons';

import EquationLine from '@/components/EquationLine';
import VariableLine from '@/components/VariableLine';
import { mathjsonToExcel } from '@/logic/mj-excel';
import { VarMapping } from '@/logic/types';
import { MathfieldElement } from 'mathlive';

/* dnd-kit imports */
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { splitVarUnits } from '@/logic/latex-var-parser';

type EquationItem = { id: string; latex: string };
// NOTE: _latexRender is an ugly way to avoid coupling the variables to the input form
type VariableItem = { id: string; latexVar: string; units: string, excelVar: string; _latexRender: string };

export default function Home() {
  const [isMathliveLoaded, setMathliveLoaded] = useState(false);
  const [enableCompactView, setEnableCompactView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [equations, setEquations] = useState<Array<EquationItem>>([
    { id: nanoid(), latex: '' },
  ]);

  const [variables, setVariables] = useState<Array<VariableItem>>([
    { id: nanoid(), latexVar: '', units: '', excelVar: '', _latexRender: '' },
  ]);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpContent, setHelpContent] = useState('');

  // Setup a resize handler for dynamic responsiveness for custom breakpoints (desktop or tablet mode)
  useEffect(() => {
    const handleResize = () => setEnableCompactView(
      // BUG: Around 60%, there's a tiny scrollbar for the entire website before switching to compact view
      window.innerWidth < (window.screen.availWidth * 0.60) || window.innerWidth <= 768
    );
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Setup a mobile detection handler to recommend activating desktop mode
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(ua);
      // Largest mobile width according to chromium mobile debug viewer
      const isSmallScreen = window.innerWidth <= 425;
      setIsMobile(isMobileUA && isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  // Load the help content from a markdown file for the menu
  // NOTE: Since this will be a static-rendered site, all locally loaded files should reside in 'public/'
  useEffect(() => {
    fetch('./markdown/help.md')
      .then((res) => res.text())
      .then((text) => setHelpContent(text));
  }, []);


  // Properly load mathlive to prevent hydration issues with Next.js's developer mode
  // Source: https://github.com/salxz696969/KOMPLEX/blob/ee0869421cbbd42e34bb98aba4ffac49884f5899/src/components/common/Editor.tsx#L129
  useEffect(() => {
    // Initialize MathLive when component mounts
    if (typeof window !== 'undefined') {
      import('mathlive').then((mathlive) => {
        // MathLive is now available globally
        mathlive.MathfieldElement.soundsDirectory = null;

        setMathliveLoaded(true);
        console.log(`MathLive version ${mathlive.version.mathlive} loaded and configured!`);
      }).catch(console.error);
    }
  }, []);

  /* ----------------------
     dnd-kit setup
     ---------------------- */
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleEquationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder equations if both active and over belong to equations
    const eqIds = equations.map((e) => e.id);
    if (eqIds.includes(active.id as string) && eqIds.includes(over.id as string)) {
      const oldIndex = eqIds.indexOf(active.id as string);
      const newIndex = eqIds.indexOf(over.id as string);
      setEquations((prev) => arrayMove(prev, oldIndex, newIndex));
      return;
    }
  };

  if (!isMathliveLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 h-screen overflow-hidden">
        <h1 className="text-3xl">Loading...</h1>
      </div>
    );
  }

  const handleVariableDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder equations if both active and over belong to equations
    const eqIds = equations.map((e) => e.id);
    if (eqIds.includes(active.id as string) && eqIds.includes(over.id as string)) {
      const oldIndex = eqIds.indexOf(active.id as string);
      const newIndex = eqIds.indexOf(over.id as string);
      setEquations((prev) => arrayMove(prev, oldIndex, newIndex));
      return;
    }

    // Reorder variables if both active and over belong to variables
    const varIds = variables.map((v) => v.id);
    if (varIds.includes(active.id as string) && varIds.includes(over.id as string)) {
      const oldIndex = varIds.indexOf(active.id as string);
      const newIndex = varIds.indexOf(over.id as string);
      setVariables((prev) => arrayMove(prev, oldIndex, newIndex));
      return;
    }
  };

  if (isMobile) {
    return (
      <div className="flex text-center items-center justify-center bg-gray-100 h-screen overflow-hidden">
        <h1 className="text-xl">
          Change to &quot;Desktop site&quot; mode<br/>
          for the best viewing experience.
        </h1>
      </div>
    );
  }

  return (
    <div
      className={`flex bg-gray-100 h-dvh overflow-y-hidden ${
        enableCompactView ? 'flex-col' : 'md:flex-row'
      }`}
    >
      {/* Equations Panel */}
      <div
        className={`flex flex-col p-4 pb-0 border-gray-300 ${
          enableCompactView
            ? 'h-1/2'
            : 'w-2/3 md:h-auto md:border-b-0 md:border-r'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold">Equations</h2>
          <button
            onClick={() => {
              setEquations((prev) => [...prev, { id: nanoid(), latex: '' }]);
            }}
            className="p-2 border rounded hover:bg-gray-200 font-bold"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        <div className="overflow-y-scroll px-0">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEquationDragEnd}>
            <SortableContext items={equations.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              {equations.map((eq, idx) => (
                <EquationLine
                  key={eq.id}
                  id={eq.id}
                  equation={eq.latex}
                  onUserInput={(latex) => {
                    setEquations((prev) =>
                      prev.map((line) => (line.id === eq.id ? { ...line, latex } : line))
                    );
                  }}
                  onCopyExcel={async (latexExpr: string) => {
                    // If a user adds an equals sign, only copy the RHS
                    const splitLatexEquation = latexExpr.split('=');
                    const rhsLatexEquation = splitLatexEquation[splitLatexEquation.length - 1];
                    const boxedExpression = MathfieldElement.computeEngine!.parse(rhsLatexEquation);

                    const variableMap = variables.reduce((acc, entry) => {
                      if (entry.latexVar) {
                        const mjsonVar = MathfieldElement.computeEngine!.parse(entry.latexVar.trim());
                        acc[mjsonVar.json.toString()] = entry.excelVar.trim();
                      }
                      return acc;
                    }, {} as VarMapping);
                    const excelFormula = mathjsonToExcel(boxedExpression.json, variableMap);

                    await navigator.clipboard.writeText(excelFormula);
                  }}
                  onNewLineRequested={() => {
                    setEquations((prev) => {
                      const newEquations = [...prev];
                      newEquations.splice(idx + 1, 0, { id: nanoid(), latex: '' });
                      return newEquations;
                    });
                  }}
                  onDeleteLine={() => {
                    setEquations((prev) => prev.filter((line) => line.id !== eq.id));
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Variables Panel */}
      <div
        className={`flex flex-col p-4 bg-gray-50 border-gray-300 border-t ${
          enableCompactView
            ? 'h-1/2'
            : 'w-1/3 min-w-[350px] md:h-auto md:border-t-0 md:border-l'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-semibold">Variables</h2>
          <button
            onClick={() => {
              setVariables((prev) => [
                ...prev,
                { id: nanoid(), latexVar: '', units: '', excelVar: '', _latexRender: '' },
              ]);
            }}
            className="p-2 border rounded hover:bg-gray-200 font-bold"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        <div className="w-full  overflow-y-scroll">
          <div className="grid grid-cols-[2.1rem_2fr_2fr_2.5rem] gap-0 bg-gray-200 font-bold">
            <div className="p-2 border-x border-t border-gray-700 text-sm text-left"></div>
            <div className="p-2 border-r border-t border-gray-700 text-sm text-left min-w-[140px]">Variable [Units]</div>
            <div className="p-2 border-r border-t border-gray-700 text-sm text-left min-w-[80px]">Excel Ref</div>
            <div className="p-2 border-r border-t border-gray-700 text-sm text-left"></div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleVariableDragEnd}>
            <SortableContext items={variables.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              {variables.map((v, idx) => (
                <VariableLine
                  key={v.id}
                  id={v.id}
                  latexInput={v._latexRender}
                  excelInput={v.excelVar}
                  onLatexInput={(val) => {
                    const { latexVar, units } = splitVarUnits(val);

                    setVariables((prev) =>
                      prev.map((line) => (line.id === v.id ? { ...line, latexVar, units } : line))
                    );
                  }}
                  onExcelInput={(val) => {
                    setVariables((prev) =>
                      prev.map((line) => (line.id === v.id ? { ...line, excelVar: val } : line))
                    );
                  }}
                  onNewLineRequested={() => {
                    setVariables((prev) => {
                      const newVariables = [...prev];
                      newVariables.splice(idx + 1, 0, { id: nanoid(), latexVar: '', units: '', excelVar: '', _latexRender: '' },);
                      return newVariables;
                    });
                  }}
                  onDelete={() => {
                    setVariables((prev) => prev.filter((line) => line.id !== v.id));
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Floating Help Button */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded shadow-lg hover:bg-blue-700"
      >
        <FontAwesomeIcon icon={faBars} size="sm" />
      </button>

      {helpOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50/75 z-50">
          <div className="bg-white border p-6 rounded-md max-w-3xl w-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Main Menu</h2>
              <button
                onClick={() => setHelpOpen(false)}
                className="border p-2 text-red-700 hover:bg-gray-100"
              >
                <FontAwesomeIcon icon={faX} />
              </button>
            </div>

            {/* Help Section */}
            <div className="border p-6 mb-6 prose max-w-none text-black markdown-content">
              <Markdown>{helpContent}</Markdown>
            </div>

            {/* Import/Export buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="border px-6 py-2 hover:bg-gray-100"
              >
                Import...
              </button>

              <button
                onClick={() => {
                  const data = {
                    equations: equations.map(equ => {
                      equ.latex = equ.latex.trim();

                      return equ;
                    }),
                    variables: variables.map(_var => {
                      // We don't want to keep _latexRender as it's only used for
                      // input rendering and will be auto-populated
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { _latexRender, ...data } = _var;
                      _var.latexVar = _var.latexVar.trim();
                      _var.units = _var.units.trim();
                      _var.excelVar = _var.excelVar.trim();

                      return data;
                    })
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

                  const formattedTimestamp = format(new Date(), 'yyyy_MM_dd_hh_mm_a');
                  saveAs(blob, `mathquiver-ws-${formattedTimestamp}.json`);

                  setHelpOpen(false);
                }}
                className="border px-6 py-2 hover:bg-gray-100"
              >
                Export...
              </button>

              <input
                type="file"
                accept="application/json"
                ref={fileInputRef}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = () => {
                    let parsed;
                    try {
                      parsed = JSON.parse(reader.result as string);
                    } catch {
                      alert('Unable to read workspace file! Check its contents for corruption.');
                      return;
                    }

                    const parsedEquations = parsed.equations as Array<EquationItem> || [];
                    const parsedVariables = parsed.variables as Array<VariableItem> || [];
                    parsedVariables.forEach(_var => {
                      if (_var.units)
                        _var._latexRender = `${_var.latexVar}\\left\\lbrack${_var.units}\\right\\rbrack`;
                      else
                        _var._latexRender = _var.latexVar;
                    });

                    setEquations(parsedEquations);
                    setVariables(parsedVariables);

                    setHelpOpen(false);
                  };

                  reader.readAsText(file);
                }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
