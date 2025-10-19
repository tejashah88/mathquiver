'use client';

// Import Mathlive LaTeX rendering fonts first
import 'mathlive/fonts.css';

// React imports
import { useState, useEffect, useRef, useCallback } from 'react';

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
import useBeforeUnload from '@/hooks/useBeforeUnload';
import sanitize from 'sanitize-filename';


export default function Home() {
  //////////////////////////////
  // Stage 1: Setup variables //
  //////////////////////////////

  // Control to stop loading full website until Mathlive is loaded
  const [isMathliveLoaded, setMathliveLoaded] = useState<boolean>(false);
  const [mathliveError, setMathliveError] = useState<string | null>(null);

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

  // Track focused equation/variable for context-aware insertion
  const [focusedEquationId, setFocusedEquationId] = useState<string | null>(null);
  const [focusedVariableId, setFocusedVariableId] = useState<string | null>(null);

  // Help panel content and controls
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [helpContent, setHelpContent] = useState<string>('');

  // Workspace settings
  const [projectName, setProjectName] = useState<string>('');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Sensors for drag-and-drop integration
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Memoized handlers for equations
  const handleEquationInput = useCallback((id: string, latex: string) => {
    setEquations((prev: EquationItem[]) =>
      prev.map(line => (line.id === id ? { ...line, latex } : line))
    );
  }, []);

  const handleEquationNewLine = useCallback((id: string) => {
    setEquations((prev: EquationItem[]) => {
      const index = prev.findIndex(line => line.id === id);
      if (index === -1) return prev;

      return [
        ...prev.slice(0, index + 1),
        { id: nanoid(), latex: '' },
        ...prev.slice(index + 1),
      ];
    });
  }, []);

  const handleEquationDelete = useCallback((id: string) => {
    setEquations((prev: EquationItem[]) => prev.filter(line => line.id !== id));
  }, []);

  // Memoized handlers for variables
  const handleVariableLatexInput = useCallback((id: string, val: string) => {
    const { latexVar, units } = splitVarUnits(val);

    setVariables((prev: VariableItem[]) =>
      prev.map(line => (line.id === id ? { ...line, latexVar, units } : line))
    );
  }, []);

  const handleVariableExcelInput = useCallback((id: string, val: string) => {
    setVariables((prev: VariableItem[]) =>
      prev.map(line => (line.id === id ? { ...line, excelVar: val } : line))
    );
  }, []);

  const handleVariableNewLine = useCallback((id: string) => {
    setVariables((prev: VariableItem[]) => {
      const index = prev.findIndex(line => line.id === id);
      if (index === -1) return prev;

      return [
        ...prev.slice(0, index + 1),
        { id: nanoid(), latexVar: '', units: '', excelVar: '', _latexRender: '' },
        ...prev.slice(index + 1),
      ];
    });
  }, []);

  const handleVariableDelete = useCallback((id: string) => {
    setVariables((prev: VariableItem[]) => prev.filter(line => line.id !== id));
  }, []);

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
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load help content: ${res.status}`);
        }
        return res.text();
      })
      .then((text) => setHelpContent(text))
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to load help.md:', err);
        }
        setHelpContent('# Help\n\nFailed to load help content. Please refresh the page.');
      });
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

        if (process.env.NODE_ENV === 'development') {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const computeEngineVersion = (window as any)[Symbol.for('io.cortexjs.compute-engine')].version;
            const mathliveVersion = mathlive.version.mathlive;

            // eslint-disable-next-line no-console
            console.log([
              `Compute Engine: v${computeEngineVersion}`,
              `MathLive: v${mathliveVersion}`,
            ].join('\n'));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Could not retrieve library versions:', err);
          }
        }
      }).catch(err => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setMathliveError(errorMsg);
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to load MathLive:', err);
        }
      });
    }
  }, []);


  // Don't import unless the user wants to overwrite their work
  const hasNonEmptyEquations = equations.filter(equ => !!equ.latex).length > 0;
  const hasNonEmptyVariables = variables.filter(_var => !!_var.latexVar || !!_var.units || !!_var.excelVar).length > 0;
  const hasDirtyWork = hasNonEmptyEquations || hasNonEmptyVariables;

  // Setup a listener to ask user to save their work before exiting
  useBeforeUnload(hasDirtyWork);

  //////////////////////////////////////////
  // Stage 3: Conditional logic on render //
  //////////////////////////////////////////

  // Show a temporary loading screen until Mathlive is loaded
  if (!isMathliveLoaded) {
    if (mathliveError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen overflow-hidden bg-gray-100 p-4">
          <h1 className="text-3xl mb-4 text-red-600">Failed to Load</h1>
          <p className="text-lg text-center mb-4">
            Unable to load MathLive library. Please reload the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

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
          {/* Left side: Workspace name input */}
          <div className="flex grow items-center gap-4">
            {/* <h2 className="text-2xl font-semibold">Equations</h2> */}

            <input
              id="workspace-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Untitled Workspace"
              className="border border-gray-400 rounded px-2 py-1 text-2xl font-medium min-w-120 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Right side: Focus mode + Add button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xl font-medium">Focus Mode:</label>
              <button
                type="button"
                role="switch"
                aria-checked={focusMode}
                onClick={() => setFocusMode(!focusMode)}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  focusMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    focusMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <button
              className="rounded border p-2 font-bold hover:bg-gray-200"
              onClick={() => {
              const newId = nanoid();
              setEquations((prev: EquationItem[]) => {
                // If there's a focused equation, insert below it
                if (focusedEquationId) {
                  const index = prev.findIndex(equ => equ.id === focusedEquationId);
                  if (index !== -1) {
                    return [
                      ...prev.slice(0, index + 1),
                      { id: newId, latex: '' },
                      ...prev.slice(index + 1),
                    ];
                  }
                }
                // Otherwise, add to the end
                return [...prev, { id: newId, latex: '' }];
              });
              // Update focus to the newly created equation
              setFocusedEquationId(newId);
            }}>
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
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
                  onEquInput={(latex) => handleEquationInput(equ.id, latex)}
                  onNewLineRequested={() => handleEquationNewLine(equ.id)}
                  onDeleteLine={() => handleEquationDelete(equ.id)}
                  onFocus={() => setFocusedEquationId(equ.id)}
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
              const newId = nanoid();
              setVariables((prev: VariableItem[]) => {
                // If there's a focused variable, insert below it
                if (focusedVariableId) {
                  const index = prev.findIndex(_var => _var.id === focusedVariableId);
                  if (index !== -1) {
                    return [
                      ...prev.slice(0, index + 1),
                      { id: newId, latexVar: '', units: '', excelVar: '', _latexRender: '' },
                      ...prev.slice(index + 1),
                    ];
                  }
                }
                // Otherwise, add to the end
                return [
                  ...prev,
                  { id: newId, latexVar: '', units: '', excelVar: '', _latexRender: '' },
                ];
              });
              // Update focus to the newly created variable
              setFocusedVariableId(newId);
            }}
            className="rounded border p-2 font-bold hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        <div className="w-full overflow-y-scroll p-4">
          <div className={`grid grid-cols-[1.7rem_2fr_2fr_2.7rem] border-t gap-0 bg-gray-200 font-bold ${variables.length === 0 ? 'border-b' : ''}`}>
            <div className="border-x border-gray-700 p-2 text-left text-sm"></div>
            <div className="min-w-[125px] border-r border-gray-700 p-2 text-left text-sm">Variable [Units]</div>
            <div className="min-w-[80px] border-r border-gray-700 p-2 text-left text-sm">Excel Ref</div>
            <div className="border-r border-gray-700 p-2 text-left text-sm"></div>
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
                  onLatexInput={(val) => handleVariableLatexInput(_var.id, val)}
                  onExcelInput={(val) => handleVariableExcelInput(_var.id, val)}
                  onNewLineRequested={() => handleVariableNewLine(_var.id)}
                  onDelete={() => handleVariableDelete(_var.id)}
                  onFocus={() => setFocusedVariableId(_var.id)}
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
                  if (hasDirtyWork) {
                    const wantToOverride = confirm('Do you want to overwrite your existing work?');
                    if (!wantToOverride) return;
                  }

                  fileInputRef.current?.click();
                }}
                className="border px-6 py-2 hover:bg-gray-100"
              >
                Import...
              </button>

              <div className="text">
                {'Made by Tejas Shah ('}
                <a target="_blank" rel="noopener noreferrer" className="text-blue-500 underline" href="https://github.com/tejashah88">@tejashah88</a>
                {')'}
              </div>

              <button
                className="border px-6 py-2 hover:bg-gray-100"
                onClick={() => {
                  const data = {
                    projectName,
                    equations: equations.map(equ => ({
                      ...equ,
                      latex: equ.latex.trim()
                    })),
                    variables: variables.map(_var => {
                      // NOTE: We don't want to keep _latexRender as it's only used for input rendering and will be auto-populated
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { _latexRender, ...rest } = _var;
                      return {
                        ...rest,
                        latexVar: _var.latexVar.trim(),
                        units: _var.units.trim(),
                        excelVar: _var.excelVar.trim()
                      };
                    })
                  };

                  // Create or generate a project filename that's compatible with all OSes (mainly Windows)
                  const projectFilename = projectName ? sanitize(projectName) : `ws-${format(new Date(), 'yyyy_MM_dd_hh_mm_a')}`;

                  // Save the workspace file
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  saveAs(blob, `${projectFilename}.mq.json`);

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
                    try {
                      const parsed = JSON.parse(reader.result as string);

                      // Validate the structure of the parsed data
                      if (!parsed || typeof parsed !== 'object') {
                        throw new Error('Invalid workspace file format');
                      }

                      if (!Array.isArray(parsed.equations)) {
                        throw new Error('Workspace file is missing the list of equations');
                      }

                      if (!Array.isArray(parsed.variables)) {
                        throw new Error('Workspace file is missing the list of variables');
                      }

                      const projectName = parsed.projectName ?? '';
                      const parsedEquations = parsed.equations as EquationItem[];
                      const parsedVariablesRaw = parsed.variables as VariableItem[];

                      // Map to new array with _latexRender added (immutable pattern)
                      const parsedVariables = parsedVariablesRaw.map(_var => {
                        // Wrap the units around square brackets
                        // NOTE: There MUST be a space after \lbrack, otherwise Mathlive will sometimes think
                        // it's a separate macro like \lbrackm (i.e. \lbrack + m)
                        const _latexRender = _var.units ? `${_var.latexVar}\\left\\lbrack ${_var.units}\\right\\rbrack` : _var.latexVar ;
                        return { ..._var, _latexRender };
                      });

                      // Hydrate the stores with the parsed equations
                      setProjectName(projectName);
                      setEquations(parsedEquations);
                      setVariables(parsedVariables);

                      // Close the help panel afterwards
                      setHelpOpen(false);
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                      alert(`Unable to read workspace file: ${errorMsg}`);
                    } finally {
                      // Reset the input so the same file can be imported again if needed
                      e.target.value = '';
                    }
                  };

                  reader.onerror = () => {
                    alert('Failed to read file. Please try again.');
                    e.target.value = '';
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
