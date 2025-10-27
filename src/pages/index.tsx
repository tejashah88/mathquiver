'use client';

// React imports
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Mathlive integration
import { MathfieldElement, version as mathliveVersion} from 'mathlive';
import '@cortex-js/compute-engine';

// Drag-and-drop kit integration
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

// List Virtualization
import { type VListHandle } from 'virtua';

// Markdown integration for help section
import Markdown from 'react-markdown';

// Font Awesome Icons
import { faBars, faEye, faEyeSlash, faPlus, faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Utility methods for QoL
import { nanoid } from 'nanoid';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import sanitize from 'sanitize-filename';
import slugify from 'slugify';

// Local imports
import { EquationLineHandle } from '@/components/EquationLine';
import { VariableLineHandle } from '@/components/VariableLine';
import EquationsList from '@/components/EquationsList';
import VariablesList from '@/components/VariablesList';
import { splitVarUnits } from '@/logic/split-var-units';
import { setupExtendedAlgebraMode } from '@/logic/prep-compute-engine';
import { EquationItem, VariableItem } from '@/types';
import { FLAGS } from '@/debug/feature-flags';


export default function Home() {
  //////////
  // REFS //
  //////////

  // Input element for asking user to import previously-saved workspace
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Refs to access imperative handles for programmatic focus control
  const equationRefs = useRef<Map<string, EquationLineHandle>>(new Map());
  const variableRefs = useRef<Map<string, VariableLineHandle>>(new Map());

  // Refs for virtualized lists to enable scroll-to-top after import
  const virtualEquationsRef = useRef<VListHandle>(null);
  const virtualVariablesRef = useRef<VListHandle>(null);

  // Track focused equation/variable for context-aware insertion using refs to avoid re-renders
  const focusedEquationIdRef = useRef<string | null>(null);
  const focusedVariableIdRef = useRef<string | null>(null);

  ///////////
  // STATE //
  ///////////

  // Controls for handling responsiveness
  const [enableCompactView, setEnableCompactView] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Equations store
  const [equations, setEquations] = useState<EquationItem[]>([
    { id: nanoid(), latex: '' },
  ]);

  // Variables store
  const [variables, setVariables] = useState<VariableItem[]>([
    { id: nanoid(), latexVar: '', units: '', excelVar: '', _latexRender: '' },
  ]);

  // Track which item is being dragged for DragOverlay
  const [draggedEquationId, setDraggedEquationId] = useState<string | null>(null);
  const [draggedVariableId, setDraggedVariableId] = useState<string | null>(null);

  // Help panel content and controls
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [helpContent, setHelpContent] = useState<string>('');

  // Workspace settings
  const [projectName, setProjectName] = useState<string>('');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  //////////////////////
  // MEMOIZED VALUES ///
  //////////////////////

  // Calculate condensed variable list for equation components [O(n)]
  const condensedVariables = useMemo(
    () => variables.map(({ latexVar, excelVar }) => ({ latexVar, excelVar })),
    [variables]
  );

  // Don't import unless the user wants to overwrite their work [~O(n)]
  const hasDirtyWork = useMemo(() => {
    const hasNonEmptyEquations = equations.some(equ => !!equ.latex);
    const hasNonEmptyVariables = variables.some(v => !!v.latexVar || !!v.units || !!v.excelVar);

    return hasNonEmptyEquations || hasNonEmptyVariables;
  }, [equations, variables]);

  ///////////////
  // CALLBACKS //
  ///////////////

  ///////////////////////
  // General Callbacks //
  ///////////////////////

  const handleProjectNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
  }, []);

  const handleFocusModeToggle = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  const handleHelpOpen = useCallback(() => {
    setHelpOpen(true);
  }, []);

  const handleHelpClose = useCallback(() => {
    setHelpOpen(false);
  }, []);

  // Handler for import button click
  const handleImportClick = useCallback(() => {
    if (hasDirtyWork) {
      const wantToOverride = confirm('Do you want to overwrite your existing work?');
      if (!wantToOverride) return;
    }
    fileInputRef.current?.click();
  }, [hasDirtyWork]);

  // Handler for export button click
  const handleExportClick = useCallback(() => {
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
    const projectFilename = projectName ?
      sanitize(slugify(projectName)) :
      `ws-${format(new Date(), 'yyyy_MM_dd_hh_mm_a')}`;

    // Save the workspace file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `${projectFilename}.mq.json`);

    // Close the help panel afterwards
    setHelpOpen(false);
  }, [projectName, equations, variables]);

  // Handler for file input change (import workspace)
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const parsed = JSON.parse(reader.result as string);
      let errorMsg = '';

      // Validate the structure of the parsed data
      if (!parsed || typeof parsed !== 'object') {
        errorMsg = 'Invalid workspace file format';
      }

      if (!Array.isArray(parsed.equations)) {
        errorMsg = 'Workspace file is missing the list of equations';
      }

      if (!Array.isArray(parsed.variables)) {
        errorMsg = 'Workspace file is missing the list of variables';
      }

      if (errorMsg) {
        alert(`Unable to read workspace file: ${errorMsg}`);
        return;
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

      // Clear focused IDs to prevent auto-focusing during bulk import
      focusedEquationIdRef.current = null;
      focusedVariableIdRef.current = null;

      // Hydrate the stores with the parsed equations
      setProjectName(projectName);
      setEquations(parsedEquations);
      setVariables(parsedVariables);

      // Scroll both panels to the top after import
      virtualEquationsRef.current?.scrollToIndex(0);
      virtualVariablesRef.current?.scrollToIndex(0);

      // Close the help panel afterwards
      setHelpOpen(false);

      // Reset the input so the same file can be imported again if needed
      e.target.value = '';
    };

    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
      e.target.value = '';
    };

    reader.readAsText(file);
  }, []);

  ///////////////////////////////
  // Equation Editor Callbacks //
  ///////////////////////////////

  const handleEquationInput = useCallback((id: string, latex: string) => {
    setEquations((prev: EquationItem[]) =>
      prev.map(line => (line.id === id ? { ...line, latex } : line))
    );
  }, []);

  // Helper to insert a new equation after a specific ID (or at the end if no ID)
  const insertEquationAfter = useCallback((afterId: string | null) => {
    const newId = nanoid();

    setEquations((prev: EquationItem[]) => {
      if (afterId) {
        const index = prev.findIndex(equ => equ.id === afterId);
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

    // Track the focused equation for context-aware insertion
    focusedEquationIdRef.current = newId;
    // Use requestAnimationFrame to ensure DOM is ready before focusing
    requestAnimationFrame(() => {
      equationRefs.current.get(newId)?.focus();
    });
  }, []);

  const handleAddEquation = useCallback(() => {
    insertEquationAfter(focusedEquationIdRef.current);
  }, [insertEquationAfter]);

  const handleEquationNewLine = useCallback((id: string) => {
    insertEquationAfter(id);
  }, [insertEquationAfter]);

  const handleEquationDelete = useCallback((id: string) => {
    setEquations((prev: EquationItem[]) => prev.filter(line => line.id !== id));
  }, []);

  // Handler for equation drag start (for DragOverlay)
  const handleEquationDragStart = useCallback((event: DragStartEvent) => {
    setDraggedEquationId(event.active.id as string);
  }, []);

  // Handler for swapping equations after drag-and-drop event
  const handleEquationDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Clear active state
    setDraggedEquationId(null);

    if (!over || active.id === over.id) return;

    // Reorder equations if both active and over belong to equations
    setEquations((prev) => {
      const eqIds = prev.map((e) => e.id);
      const oldIndex = eqIds.indexOf(active.id as string);
      const newIndex = eqIds.indexOf(over.id as string);

      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleEquationFocus = useCallback((id: string) => {
    focusedEquationIdRef.current = id;
  }, []);

  ///////////////////////////////
  // Variable Editor Callbacks //
  ///////////////////////////////

  const handleVariableLatexInput = useCallback((id: string, val: string) => {
    const { latexVar, units } = splitVarUnits(val);
    // Recompute _latexRender when latexVar or units change
    const _latexRender = units ? `${latexVar}\\left\\lbrack ${units}\\right\\rbrack` : latexVar;

    setVariables((prev: VariableItem[]) =>
      prev.map(line => (line.id === id ? { ...line, latexVar, units, _latexRender } : line))
    );
  }, []);

  const handleVariableExcelInput = useCallback((id: string, val: string) => {
    setVariables((prev: VariableItem[]) =>
      prev.map(line => (line.id === id ? { ...line, excelVar: val } : line))
    );
  }, []);

  // Helper to insert a new variable after a specific ID (or at the end if no ID)
  const insertVariableAfter = useCallback((afterId: string | null) => {
    const newId = nanoid();

    setVariables((prev: VariableItem[]) => {
      if (afterId) {
        const index = prev.findIndex(_var => _var.id === afterId);
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

    // Track the focused variable for context-aware insertion
    focusedVariableIdRef.current = newId;
    // Use requestAnimationFrame to ensure DOM is ready before focusing
    requestAnimationFrame(() => {
      variableRefs.current.get(newId)?.focus();
    });
  }, []);

  const handleVariableNewLine = useCallback((id: string) => {
    insertVariableAfter(id);
  }, [insertVariableAfter]);

  const handleVariableDelete = useCallback((id: string) => {
    setVariables((prev: VariableItem[]) => prev.filter(line => line.id !== id));
  }, []);

  const handleVariableDragStart = useCallback((event: DragStartEvent) => {
    setDraggedVariableId(event.active.id as string);
  }, []);

  const handleVariableDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Clear active state
    setDraggedVariableId(null);

    if (!over || active.id === over.id) return;

    // Reorder variables if both active and over belong to variables
    setVariables((prev) => {
      const varIds = prev.map((v) => v.id);
      const oldIndex = varIds.indexOf(active.id as string);
      const newIndex = varIds.indexOf(over.id as string);

      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleAddVariable = useCallback(() => {
    insertVariableAfter(focusedVariableIdRef.current);
  }, [insertVariableAfter]);

  const handleVariableFocus = useCallback((id: string) => {
    focusedVariableIdRef.current = id;
  }, []);

  ////////////////////
  // EFFECTS: SETUP //
  // (MOUNT ONLY)   //
  ////////////////////

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
        if (FLAGS.enableDebugLogging) {
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
      // MathLive is now available globally
      MathfieldElement.soundsDirectory = null;

      // Disable recognizing certain constants/functions
      const ce = MathfieldElement.computeEngine!;
      setupExtendedAlgebraMode(ce);

      if (FLAGS.enableDebugLogging) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const computeEngineVersion = (window as any)[Symbol.for('io.cortexjs.compute-engine')].version;

          // eslint-disable-next-line no-console
          console.log([
            `Compute Engine: v${computeEngineVersion}`,
            `MathLive: v${mathliveVersion.mathlive}`,
          ].join('\n'));
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Could not retrieve library versions:', err);
        }
      }
    }
  }, []);

  // Setup a listener to ask user to save their work before exiting
  // NOTE: Do not enable the 'unsaved work' prompt during development
  useEffect(() => {
    // Only add listener if feature flag is enabled AND there's dirty work
    const shouldWarn = FLAGS.enableBeforeUnloadWarning && hasDirtyWork;

    if (!shouldWarn) {
      return;
    }

    // Preventing the event causes the 'Do you want to exit?' prompt
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handler);

    return () => window.removeEventListener('beforeunload', handler);
  }, [hasDirtyWork]);

  ////////////
  // RENDER //
  ////////////

  // Don't render the website on mobile
  if (isMobile) {
    return (
      <div className="flex h-screen items-center justify-center overflow-hidden bg-gray-100 text-center">
        <h1 className="text-xl">
          Change to &quot;Desktop site&quot; mode<br/>
          for the best viewing experience.
        </h1>
      </div>
    );
  }

  return (
    <div className={`flex h-dvh overflow-y-hidden bg-gray-100 ${enableCompactView ? 'flex-col' : 'md:flex-row'}`}>
      {/* Equations Panel */}
      <div className={`flex flex-col border-gray-300 ${
        enableCompactView ? (variables.length > 0 ? 'h-3/5 border-b' : 'h-4/5 border-b') : 'h-auto w-2/3 border-r'
      }`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-400">
          {/* Left side: Workspace name input */}
          <input
            id="project-name"
            type="text"
            value={projectName}
            onChange={handleProjectNameChange}
            placeholder="Untitled Project"
            className="flex shrink items-center gap-4 w-100 px-2 py-1 rounded border border-gray-400 text-2xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Right side: Focus mode + Add button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFocusModeToggle}
              title={focusMode ? 'Disable Focus Mode' : 'Enable Focus Mode'}
              className="p-2 rounded border font-semibold whitespace-nowrap border-black hover:bg-gray-200 text-black"
            >
              {'Focus Mode: '}
              <FontAwesomeIcon className={focusMode ? 'text-green-600' : 'text-black'} icon={focusMode ? faEye : faEyeSlash} />
            </button>

            <button
              className="p-2 rounded border ml-2 font-bold hover:bg-gray-200"
              onClick={handleAddEquation}
              title="Add Equation"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>

        <div className="flex-1 py-2 pl-2 pr-0">
          <EquationsList
            equations={equations}
            condensedVariables={condensedVariables}
            focusMode={focusMode}
            draggedEquationId={draggedEquationId}
            equationRefs={equationRefs}
            virtualEquationsRef={virtualEquationsRef}
            onEquationInput={handleEquationInput}
            onEquationNewLine={handleEquationNewLine}
            onEquationDelete={handleEquationDelete}
            onEquationFocus={handleEquationFocus}
            onEquationDragStart={handleEquationDragStart}
            onEquationDragEnd={handleEquationDragEnd}
          />
        </div>
      </div>

      {/* Variables Panel */}
      <div className={`flex flex-col border-gray-300 bg-gray-50 ${
        enableCompactView ? (variables.length > 0 ? 'h-2/5 border-t' : 'h-1/5 border-t') : 'h-auto w-1/3 min-w-[300px] border-l'
      }`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-400">
          <h2 className="text-2xl font-semibold">Variables</h2>
          <button
            onClick={handleAddVariable}
            title="Add Variable"
            className="p-2 rounded border font-bold hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        <div className="flex-1 w-full p-4">
          <div className={`grid grid-cols-[1.7rem_2fr_2fr_2.7rem] border-t gap-0 bg-gray-200 font-bold ${
            variables.length === 0 ? 'border-b' : ''}`
          }>
            <div className="p-2 border-x border-gray-700 text-left text-sm"></div>
            <div className="min-w-[125px] p-2 border-r border-gray-700 text-left text-sm">Variable [Units]</div>
            <div className="min-w-[80px] p-2 border-r border-gray-700 text-left text-sm">Excel Ref</div>
            <div className="p-2 border-r border-gray-700 text-left text-sm"></div>
          </div>

          <VariablesList
            variables={variables}
            focusMode={focusMode}
            draggedVariableId={draggedVariableId}
            variableRefs={variableRefs}
            virtualVariablesRef={virtualVariablesRef}
            onVariableLatexInput={handleVariableLatexInput}
            onVariableExcelInput={handleVariableExcelInput}
            onVariableNewLine={handleVariableNewLine}
            onVariableDelete={handleVariableDelete}
            onVariableFocus={handleVariableFocus}
            onVariableDragStart={handleVariableDragStart}
            onVariableDragEnd={handleVariableDragEnd}
          />
        </div>
      </div>

      {/* Floating Help Button */}
      <button
        onClick={handleHelpOpen}
        title="Open Main Menu"
        className="fixed bottom-4 right-4 p-2 rounded bg-blue-600 text-white shadow-lg hover:bg-blue-700"
      >
        <FontAwesomeIcon icon={faBars} size="sm" />
      </button>

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/75">
          <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-md border bg-white shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-2xl font-semibold">Main Menu</h2>
              <button
                onClick={handleHelpClose}
                title="Close Menu"
                className="p-2 border text-red-700 hover:bg-gray-100"
              >
                <FontAwesomeIcon icon={faX} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-none p-6 border prose markdown-content text-black">
                <Markdown>{helpContent}</Markdown>
              </div>
            </div>

            {/* Import/Export buttons */}
            <div className="flex items-center justify-between p-4 border-t">
              <button
                onClick={handleImportClick}
                title="Import Workspace"
                className="px-6 py-2 border hover:bg-gray-100"
              >
                Import...
              </button>

              <div className="text">
                {'Made by Tejas Shah ('}
                <a target="_blank" rel="noopener noreferrer" className="text-blue-500 underline" href="https://github.com/tejashah88">@tejashah88</a>
                {')'}
              </div>

              <button
                className="px-6 py-2 border hover:bg-gray-100"
                onClick={handleExportClick}
                title="Export Workspace"
              >
                Export...
              </button>

              <input
                type="file"
                accept="application/json"
                ref={fileInputRef}
                // NOTE: This is hidden since we use a custom button to allow triggering the "File Import" dialog
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
