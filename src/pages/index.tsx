'use client';

// Import Mathlive LaTeX rendering fonts first
import 'mathlive/fonts.css';

// React imports
import { useState, useEffect, useRef } from 'react';

// Mathlive integration
import '@cortex-js/compute-engine';

// Drag-and-drop kit integration
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';

// Markdown integration for help section
import Markdown from 'react-markdown';

// Font Awesome Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faPlus, faX } from '@fortawesome/free-solid-svg-icons';

// Utility methods for QoL
import { nanoid } from 'nanoid';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

// Local imports
import EquationLine from '@/components/EquationLine';
import VariableLine from '@/components/VariableLine';
import { splitVarUnits } from '@/logic/split-var-units';
import { setupExtendedAlgebraMode } from '@/logic/prep-compute-engine';
import { EquationItem, VariableItem } from '@/types';


export default function Home() {
  //////////////////////////////
  // Stage 1: Setup variables //
  //////////////////////////////

  // Control to stop loading full website until Mathlive is loaded
  const [isMathliveLoaded, setMathliveLoaded] = useState<boolean>(false);

  // Controls for handling responsiveness
  const [enableCompactView, setEnableCompactView] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Input element for asking user to import previously-saved workspace
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Equations store
  const [equations, setEquations] = useState<EquationItem[]>([
    { id: nanoid(), latex: '' },
  ]);

  // Variables store
  const [variables, setVariables] = useState<VariableItem[]>([
    { id: nanoid(), latexVar: '', units: '', excelVar: '', _latexRender: '' },
  ]);

  // Help panel content and controls
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [helpContent, setHelpContent] = useState<string>('');

  // Sensors for drag-and-drop integration
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Handler for swapping equations after drag-and-drop event
  const handleEquationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder equations if both active and over belong to equations
    const eqIds = equations.map((e) => e.id);
    if (eqIds.includes(active.id as string) && eqIds.includes(over.id as string)) {
      const oldIndex = eqIds.indexOf(active.id as string);
      const newIndex = eqIds.indexOf(over.id as string);
      setEquations((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  // Handler for swapping variables after drag-and-drop event
  const handleVariableDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder variables if both active and over belong to variables
    const varIds = variables.map((v) => v.id);
    if (varIds.includes(active.id as string) && varIds.includes(over.id as string)) {
      const oldIndex = varIds.indexOf(active.id as string);
      const newIndex = varIds.indexOf(over.id as string);
      setVariables((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  ///////////////////////////////////
  // Stage 2: Setup logic on mount //
  ///////////////////////////////////

  // Setup a resize handler to switch between full desktop mode and half-screen mode (convenient for side-by-side with Excel)
  useEffect(() => {
    const handleResize = () => setEnableCompactView(
      window.innerWidth < (window.screen.availWidth * 0.55) || window.innerWidth <= 768
    );

    // Run the resize check once after loading the website
    handleResize();

    // Mount the 'resize' event listener for view mode checking
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup a mobile detection handler to recommend activating desktop mode
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

      const isMobileUA = mobileRegex.test(ua);
      const isSmallScreen = window.innerWidth <= 425; // Largest mobile width according to chromium mobile debug viewer
      setIsMobile(isMobileUA && isSmallScreen);
    };

    // Run the resize check once after loading the website
    checkMobile();

    // Mount the 'resize' event listener for mobile checking
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

        // Disable recognizing certain constants/functions
        const ce = mathlive.MathfieldElement.computeEngine!;
        setupExtendedAlgebraMode(ce);

        setMathliveLoaded(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const computeEngineVersion = (window as any)[Symbol.for('io.cortexjs.compute-engine')].version;
        const mathliveVersion = mathlive.version.mathlive;

        // eslint-disable-next-line no-console
        console.log([
          `Compute Engine: v${computeEngineVersion}`,
          `MathLive: v${mathliveVersion}`,
        ].join('\n'));
      }).catch(err => alert(`Unable to load Mathlive! Please reload the website.\n\n${err}`));
    }
  }, []);

  //////////////////////////////////////////
  // Stage 3: Conditional logic on render //
  //////////////////////////////////////////

  // Show a temporary loading screen until Mathlive is loaded
  if (!isMathliveLoaded) {
    return (
      <div className="flex items-center justify-center h-screen overflow-hidden bg-gray-100">
        <h1 className="text-3xl">Loading...</h1>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen overflow-hidden bg-gray-100 text-center">
        <h1 className="text-xl">
          Change to &quot;Desktop site&quot; mode<br/>
          for the best viewing experience.
        </h1>
      </div>
    );
  }

  /////////////////////////////
  // Stage 3: Render website //
  /////////////////////////////

  return (
    <div className={`flex h-dvh overflow-y-hidden bg-gray-100 ${enableCompactView ? 'flex-col' : 'md:flex-row'}`}>
      {/* Equations Panel */}
      <div className={`flex flex-col border-gray-300 ${enableCompactView ? 'h-1/2 border-b' : 'h-auto w-2/3 border-r'}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-400">
          <h2 className="text-2xl font-semibold">Equations</h2>
          <button
            className="rounded border p-2 font-bold hover:bg-gray-200"
            onClick={() => {
              setEquations((prev: EquationItem[]) => [
                ...prev, { id: nanoid(), latex: '' }
              ]);
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        <div className="overflow-y-scroll py-4 pl-2 pr-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleEquationDragEnd}
          >
            <SortableContext
              items={equations.map(equ => equ.id)}
              strategy={verticalListSortingStrategy}
            >
              {equations.map((equ: EquationItem) => (
                <EquationLine
                  key={equ.id}
                  id={equ.id}
                  equation={equ.latex}
                  variableList={variables}
                  onEquInput={(latex: string) => {
                    setEquations((prev: EquationItem[]) =>
                      prev.map(line => (line.id === equ.id ? { ...line, latex } : line))
                    );
                  }}
                  onNewLineRequested={() => {
                    setEquations((prev: EquationItem[]) => {
                      const index = prev.findIndex(line => line.id === equ.id);
                      // NOTE: This should NEVER happen since all IDs are defined
                      if (index === -1) return prev;

                      return [
                        ...prev.slice(0, index + 1),
                        { id: nanoid(), latex: '' },
                        ...prev.slice(index + 1),
                      ];
                    });
                  }}
                  onDeleteLine={() => {
                    setEquations((prev: EquationItem[]) => prev.filter(line => line.id !== equ.id));
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Variables Panel */}
      <div className={`flex flex-col border-gray-300 bg-gray-50 ${
        enableCompactView ? 'h-1/2 border-t' : 'h-auto w-1/3 min-w-[300px] border-l'
      }`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-400">
          <h2 className="text-2xl font-semibold">Variables</h2>
          <button
            onClick={() => {
              setVariables((prev: VariableItem[]) => [
                ...prev,
                { id: nanoid(), latexVar: '', units: '', excelVar: '', _latexRender: '' },
              ]);
            }}
            className="rounded border p-2 font-bold hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        <div className="w-full overflow-y-scroll p-4">
          <div className="grid grid-cols-[1.7rem_2fr_2fr_2.7rem] gap-0 bg-gray-200 font-bold">
            <div className="border-x border-t border-gray-700 p-2 text-left text-sm"></div>
            <div className="min-w-[125px] border-r border-t border-gray-700 p-2 text-left text-sm">Variable [Units]</div>
            <div className="min-w-[80px] border-r border-t border-gray-700 p-2 text-left text-sm">Excel Ref</div>
            <div className="border-r border-t border-gray-700 p-2 text-left text-sm"></div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleVariableDragEnd}
          >
            <SortableContext
              items={variables.map(_var => _var.id)}
              strategy={verticalListSortingStrategy}
            >
              {variables.map((_var: VariableItem) => (
                <VariableLine
                  key={_var.id}
                  id={_var.id}
                  latexInput={_var._latexRender}
                  excelInput={_var.excelVar}
                  onLatexInput={(val: string) => {
                    const { latexVar, units } = splitVarUnits(val);

                    setVariables((prev: VariableItem[]) =>
                      prev.map(line => (line.id === _var.id ? { ...line, latexVar, units } : line))
                    );
                  }}
                  onExcelInput={(val: string) => {
                    setVariables((prev: VariableItem[]) =>
                      prev.map(line => (line.id === _var.id ? { ...line, excelVar: val } : line))
                    );
                  }}
                  onNewLineRequested={() => {
                    setVariables((prev: VariableItem[]) => {
                      const index = prev.findIndex(line => line.id === _var.id);
                      // NOTE: This should NEVER happen since all IDs are defined
                      if (index === -1) return prev;

                      return [
                        ...prev.slice(0, index + 1),
                        { id: nanoid(), latexVar: '', units: '', excelVar: '', _latexRender: '' },
                        ...prev.slice(index + 1),
                      ];
                    });
                  }}
                  onDelete={() => {
                    setVariables((prev: VariableItem[]) => prev.filter(line => line.id !== _var.id));
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
        className="fixed bottom-4 right-4 rounded bg-blue-600 p-2 text-white shadow-lg hover:bg-blue-700"
      >
        <FontAwesomeIcon icon={faBars} size="sm" />
      </button>

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/75">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border bg-white shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-2xl font-semibold">Main Menu</h2>
              <button
                onClick={() => setHelpOpen(false)}
                className="border p-2 text-red-700 hover:bg-gray-100"
              >
                <FontAwesomeIcon icon={faX} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose markdown-content max-w-none border p-6 text-black">
                <Markdown>{helpContent}</Markdown>
              </div>
            </div>

            {/* Import/Export buttons */}
            <div className="flex items-center justify-between border-t p-4">
              <button
                onClick={() => {
                  // Don't import unless the user wants to overwrite their work
                  if (equations.length > 0 || variables.length > 0) {
                    const wantToOverride = confirm('Do you want to overwrite your existing work?');
                    if (!wantToOverride) return;
                  }

                  fileInputRef.current?.click();
                }}
                className="border px-6 py-2 hover:bg-gray-100"
              >
                Import...
              </button>

              <button
                onClick={() => {
                  // Don't import unless the user wants to overwrite their work
                  if (equations.length > 0 || variables.length > 0) {
                    const wantToOverride = confirm('Do you want to overwrite your existing work?');
                    if (!wantToOverride) return;
                  }

                  fileInputRef.current?.click();
                }}
                className="border px-6 py-2 hover:bg-gray-100"
              >
                Try Example
              </button>

              <button
                className="border px-6 py-2 hover:bg-gray-100"
                onClick={() => {
                  const data = {
                    equations: equations.map(equ => {
                      equ.latex = equ.latex.trim();

                      return equ;
                    }),
                    variables: variables.map(_var => {
                      // NOTE: We don't want to keep _latexRender as it's only used for input rendering and will be auto-populated
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { _latexRender, ...data } = _var;
                      _var.latexVar = _var.latexVar.trim();
                      _var.units = _var.units.trim();
                      _var.excelVar = _var.excelVar.trim();

                      return data;
                    })
                  };

                  // Save the workspace file to the default downloads folder
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const formattedTimestamp = format(new Date(), 'yyyy_MM_dd_hh_mm_a');
                  saveAs(blob, `mathquiver-ws-${formattedTimestamp}.json`);

                  // Close the help panel afterwards
                  setHelpOpen(false);
                }}
              >
                Export...
              </button>

              <input
                type="file"
                accept="application/json"
                ref={fileInputRef}
                // NOTE: This is hidden since we use a custom button to allow triggering the "File Import" dialog
                className="hidden"
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

                    const parsedEquations = parsed.equations as EquationItem[] || [];
                    const parsedVariables = parsed.variables as VariableItem[] || [];
                    parsedVariables.forEach(_var => {
                      if (_var.units) {
                        // Wrap the units around square brackets
                        // NOTE: There MUST be a space after \lbrack, otherwise Mathlive will sometimes think
                        // it's a separate macro like \lbrackm (i.e. \lbrack + m)
                        _var._latexRender = `${_var.latexVar}\\left\\lbrack ${_var.units}\\right\\rbrack`;
                      } else {
                        _var._latexRender = _var.latexVar;
                      }
                    });

                    // Hydrate the stores with the parsed equatiosn
                    setEquations(parsedEquations);
                    setVariables(parsedVariables);

                    // Close the help panel afterwards
                    setHelpOpen(false);
                  };

                  reader.readAsText(file);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
