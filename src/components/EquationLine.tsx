'use client';

// React imports
import { FormEvent, forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

// Drag-and-drop integration
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// MathLive integration
import { Expression, MathfieldElement } from 'mathlive';

// Font Awesome icons
import { faFileExcel, faGripVertical, faTrashCan } from '@fortawesome/free-solid-svg-icons';

// Utilities
import { deepEqual } from 'fast-equals';

// Hooks
import { useDebounceCallback } from 'usehooks-ts';

// Local components
import MemoizedIcon from '@/components/MemoizedIcon';

// Local algorithms
import extractEquationParts from '@/logic/extract-equation-parts';
import { extractLatexVariables } from '@/logic/latex-var-extract';
import { mathjsonToExcel } from '@/logic/mathjson-excel';
import { parseMathfieldDOM } from '@/logic/mathfield-dom-parser';

// Local utilities
import { applyStyleToRange, clearColors } from '@/logic/mathfield-dom-stylizer';
import { FLAGS } from '@/utils/feature-flags';

// Types
import { CondensedVariableItem, VarMapping } from '@/types';

// Constants
export const INPUT_DEBOUNCE_DELAY = 200;


// Equation validation states for border rendering
const enum EQUATION_STATES { VALID, INVALID, ERROR };

const MF_BORDER_STYLES = {
  [EQUATION_STATES.VALID]: '1px solid #000',
  [EQUATION_STATES.INVALID]: '4px solid #fa0',
  [EQUATION_STATES.ERROR]: '4px solid #f00',
  undefined: '1px solid #ccc',
  null: '1px solid #ccc',
};

// Static style objects (extracted to avoid recreation on every render)
const GRIP_ICON_STYLE = { color: 'gray' } as const;
const MISSING_VAR_LABEL_STYLE = {
  display: 'inline-block',
  fontSize: '1.2rem',
  background: 'none',
} as const;
const MISSING_VAR_ITEM_STYLE = {
  display: 'inline-block',
  fontSize: '1.2rem',
} as const;

function checkMathjsonToExcel(mathJson: Expression, varMap: VarMapping = {}): boolean {
  try {
    mathjsonToExcel(mathJson, varMap);
    return true;
  } catch {
    return false;
  }
}

interface EquationLineProps {
  id: string;
  equation: string;
  variableList: CondensedVariableItem[];
  inFocusMode: boolean;
  onEquationInput: (id: string, latex: string) => void;
  onEquationNewLine: (id: string) => void;
  onEquationDelete: (id: string) => void;
  onEquationFocus: (id: string) => void;
}

export interface EquationLineHandle {
  focus: () => void;
}


// eslint-disable-next-line require-explicit-generics/require-explicit-generics
const EquationLine = memo(
  forwardRef<EquationLineHandle, EquationLineProps>(
    function EquationLine({
      id,
      equation,
      variableList,
      inFocusMode,

      // Global handlers
      onEquationInput,
      onEquationNewLine,
      onEquationDelete,
      onEquationFocus,
    },
    ref
  ) {
    //////////
    // REFS //
    //////////

    // Main mathfield element ref
    const latexMathfieldRef = useRef<MathfieldElement | null>(null);

    // Track dragging state in a ref so the observer callback can read latest value
    // without recreating the observer on every drag state change
    const isDraggingRef = useRef<boolean>(false);

    ///////////
    // STATE //
    ///////////

    // Local equation state for immediate visual feedback (debounced updates to parent)
    const [localEquation, setLocalEquation] = useState<string>(equation);

    // Equation verification state for border rendering
    const [inputEquationState, setInputEquationState] = useState<EQUATION_STATES>(EQUATION_STATES.VALID);

    // Missing variables tracking
    const [missingLatexVars, setMissingLatexVars] = useState<string[]>([]);

    // 'Copy to Excel' tooltip visibility
    const [showCopiedFormulaTooltip, setCopiedFormulaTooltip] = useState<boolean>(false);

    ///////////////
    // CALLBACKS //
    ///////////////

    // Create stable callbacks that close over the ID
    const onEquInput = useCallback(
      (latex: string) => {
        onEquationInput(id, latex);
      },
      [id, onEquationInput]
    );

    // Create debounced version of the equation input callback
    const debouncedOnEquInput = useDebounceCallback(onEquInput, INPUT_DEBOUNCE_DELAY);

    const onNewLineRequested = useCallback(() => {
      onEquationNewLine(id);
    }, [id, onEquationNewLine]);

    const onDeleteLine = useCallback(() => {
      onEquationDelete(id);
    }, [id, onEquationDelete]);

    const onFocus = useCallback(() => {
      onEquationFocus(id);
    }, [id, onEquationFocus]);

    ///////////
    // HOOKS //
    ///////////

    // Drag-and-drop integration
    // NOTE: useSortable causes re-renders during drag due to transform/transition changes
    // This is expected dnd-kit behavior and necessary for smooth drag visual feedback
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    // Expose focus method to parent via ref
    useImperativeHandle<EquationLineHandle, EquationLineHandle>(ref, () => ({
      focus: () => {
        latexMathfieldRef.current?.focus();
      },
    }), []); // Empty deps: focus method is stable and only depends on ref

    ///////////////////////
    // EFFECTS: REF SYNC //
    ///////////////////////

    // Keep the dragging ref in sync with isDragging state
    useEffect(() => {
      isDraggingRef.current = isDragging;
    }, [isDragging]);

    // Sync prop changes to local state (handles external updates like imports)
    useEffect(() => {
      setLocalEquation(equation);
    }, [equation]);

    /////////////////////////////////
    // EFFECTS: SETUP (MOUNT ONLY) //
    /////////////////////////////////

    // Setup the mathfield element on mount
    // Source: https://mathlive.io/mathfield/lifecycle/#-attachedmounted
    useEffect(() => {
      const mf = latexMathfieldRef.current;
      if (!mf) return;

      // Docs: https://mathlive.io/mathfield/guides/commands/#editing-commands
      // BROKEN: Add a placeholder for subscripts and superscripts to avoid ghost characters
      // See open issue here: https://github.com/arnog/mathlive/issues/2886

      // const addPlaceholderSubSuper = (evt: any) => {
      //   const currentValue = mf.getValue();
      //   const newValue = currentValue
      //     .replaceAll(/_{}/g, '_{\\placeholder{}}')
      //     .replaceAll(/\^{}/g, '^{\\placeholder{}}');

      //   if (currentValue === newValue) return;
      //   console.log(currentValue, newValue);

      //   // Use selectionMode: 'after' to keep cursor at the end
      //   mf.setValue(newValue, {
      //     selectionMode: 'after'
      //   });

      //   const lastCursorPos = mf.position;
      //   mf.executeCommand('moveToPreviousPlaceholder');
      //   if (Math.abs(lastCursorPos - mf.position) > 1) {
      //     mf.position = lastCursorPos
      //   }
      // }

      // Setup custom menu for equation editing
      mf.menuItems = [
        {
          type: 'command',
          id: 'cut',
          label: 'Cut',
          keyboardShortcut: 'meta+X',
          visible: () => !mf.readOnly && mf.isSelectionEditable,
          onMenuSelect: () => mf.executeCommand('cutToClipboard'),
        },
        {
          type: 'command',
          id: 'copy-latex',
          label: 'Copy LaTeX',
          keyboardShortcut: 'meta+C',
          onMenuSelect: () => mf.executeCommand('copyToClipboard'),
        },
        {
          type: 'command',
          id: 'paste-latex',
          label: 'Paste LaTeX',
          keyboardShortcut: 'meta+V',
          visible: () => mf.hasEditableContent,
          onMenuSelect: () => mf.executeCommand('pasteFromClipboard'),
        },
        {
          type: 'command',
          id: 'select-all',
          label: 'Select All',
          keyboardShortcut: 'meta+A',
          visible: () => !mf.readOnly && mf.isSelectionEditable,
          onMenuSelect: () => mf.executeCommand('selectAll'),
        },
      ];

      // Listener to add a new line when pressing Enter/Return
      const addNewLine = (evt: InputEvent) => {
        if (evt.data === 'insertLineBreak') {
          evt.preventDefault();
          onNewLineRequested();
        }
      };

      // Listener to track focus on this mathfield
      const handleFocus = () => {
        onFocus();
      };

      // Add necessary event listeners
      // mf.addEventListener('selection-change', addPlaceholderSubSuper);
      mf.addEventListener('beforeinput', addNewLine);
      mf.addEventListener('focusin', handleFocus);

      // Remember to remove the listeners, especially since dev mode can reload the same webpage multiple times
      return () => {
        // mf.removeEventListener('selection-change', addPlaceholderSubSuper);
        mf.removeEventListener('beforeinput', addNewLine);
        mf.removeEventListener('focusin', handleFocus);
      };
    }, [onNewLineRequested, onFocus]);

    // Apply visual styling to equation parts using shadow DOM manipulation. This bypasses using LaTeX
    // to color the elements (like \textcolor) since that mutates the LaTeX equation string.
    // NOTE: MutationObserver is used to automatically re-apply styles whenever MathLive re-renders its shadow DOM
    useEffect(() => {
      const mf = latexMathfieldRef.current;
      if (!mf?.shadowRoot) return;

      // Track pending animation frame to debounce rapid DOM mutations
      let pendingRaf: number | undefined;

      // Styling function that applies gray color to specific equation parts
      // Reads current DOM state, so it automatically reflects equation changes
      const applyStylesToMathfield = () => {
        // Skip styling during drag to improve drag performance
        if (isDraggingRef.current) return;

        try {
          const charIndex = parseMathfieldDOM(mf);
          clearColors(charIndex);

          // Find markers at depth 0 (top-level, not in subscripts/superscripts)
          const equalsSign = charIndex.find(item => item.char === '=' && item.depth === 0);
          const firstComma = charIndex.find(item => item.char === ',' && item.depth === 0);

          // Color LHS (everything before equals sign) gray
          if (equalsSign) {
            applyStyleToRange(charIndex, 0, equalsSign.index, { color: '#6b7280' });
            equalsSign.element.style.color = '#6b7280';
          }

          // Color limits (everything after first comma) gray
          if (firstComma) {
            firstComma.element.style.color = '#6b7280';
            applyStyleToRange(charIndex, firstComma.index + 1, charIndex.length, { color: '#6b7280' });
          }
        } catch (err) {
          if (FLAGS.enableDebugLogging) {
            // eslint-disable-next-line no-console
            console.warn('Failed to apply equation styling:', err);
          }
        }
      };

      const scheduleStyleApplication = () => {
        // Cancel any pending style application
        if (pendingRaf !== undefined) cancelAnimationFrame(pendingRaf);
        // Schedule new style application for next frame
        pendingRaf = requestAnimationFrame(applyStylesToMathfield);
      };

      // Set up MutationObserver to watch for shadow DOM changes
      // Handles: typing, blur, focus, DevTools, window resize, file imports, etc.
      const observer = new MutationObserver(scheduleStyleApplication);
      observer.observe(mf.shadowRoot, {
        childList: true,    // Watch for nodes being added/removed
        subtree: true,      // Watch entire shadow DOM tree
        attributes: false,  // Ignore attribute changes to prevent infinite loops
      });

      // Apply initial styles after shadow DOM is ready
      scheduleStyleApplication();

      // Cleanup function runs only when component unmounts
      return () => {
        if (pendingRaf !== undefined) cancelAnimationFrame(pendingRaf);
        observer.disconnect();
      };
      // NOTE: Setup runs once on mount, while listeners use refs for latest callbacks
    }, []);

    //////////////////////
    // MEMOIZED VALUES //
    /////////////////////

    // Memoize mathfield inline style object with calculated border style
    const mathfieldStyle = useMemo(() => ({
      fontSize: '1.5rem',
      border: inFocusMode ? MF_BORDER_STYLES[EQUATION_STATES.VALID] : MF_BORDER_STYLES[inputEquationState],
      borderRadius: '0.25rem',
    }), [inFocusMode, inputEquationState]);

    ////////////////////////////////////
    // EFFECTS: VALIDATION & TRACKING //
    ////////////////////////////////////

    // Validate equation and update border styling (runs when localEquation changes)
    useEffect(() => {
      const mf = latexMathfieldRef.current;
      if (!mf) return;

      // Extract the main body of equation to allow typing f(x) = ... and limits (note: keep other variables for readability)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [eqFuncDefine, eqMainBody, eqLimits] = extractEquationParts(localEquation);

      // Check if the equation main body has a valid MathJSON expression
      const boxedExpression = MathfieldElement.computeEngine!.parse(eqMainBody, { canonical: true });
      if (!boxedExpression.isValid) {
        setInputEquationState(EQUATION_STATES.INVALID);
        return;
      }

      // Check if the converted MathJSON expression can be converted to an Excel formula
      //   Case 1: There's an invalid expression that's intentionally not implemented
      //   Case 2: There's an invalid expression that needs to be implemented
      const canProcessEqu = checkMathjsonToExcel(boxedExpression.json);
      if (!canProcessEqu) {
        setInputEquationState(EQUATION_STATES.ERROR);
        return;
      }

      // Equation is valid
      setInputEquationState(EQUATION_STATES.VALID);
    }, [localEquation]);

    // Update missing variables (runs when localEquation or variableList changes)
    useEffect(() => {
      // Extract the main body of equation to allow typing f(x) = ... and limits (note: keep other variables for readability)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [eqFuncDefine, eqMainBody, eqLimits] = extractEquationParts(localEquation);

      // Extract missing variables from main body of equation
      const extractedLatexVars = extractLatexVariables(eqMainBody);
      const definedLatexVars = variableList.filter(v => v.latexVar.trim() !== '').map(v => v.latexVar);
      const missing = extractedLatexVars.filter(_foundVar => !definedLatexVars.includes(_foundVar));

      // Only update state if the missing variables actually changed (avoid unnecessary renders)
      setMissingLatexVars(prev => {
        if (prev.length !== missing.length || !prev.every((v, i) => v === missing[i]))
          return missing;
        return prev;
      });
    }, [localEquation, variableList]);

    ///////////////
    // CALLBACKS //
    ///////////////

    // Memoize mathfield input handler with immediate local update and debounced parent update
    const handleEquationInput = useCallback((event: FormEvent<MathfieldElement>) => {
      const mf = event.target as MathfieldElement;
      const latex = mf.getValue('latex-unstyled');

      // Update local state immediately for instant visual feedback
      setLocalEquation(latex);

      // Debounced update to parent to reduce expensive re-renders
      debouncedOnEquInput(latex);
    }, [debouncedOnEquInput]);

    // Memoize Excel export handler (expensive: equation parsing + variable mapping + clipboard)
    const handleExcelExport = useCallback(async () => {
      // Extract the main body of equation to allow typing f(x) = ... and limits (note: keep other variables for readability)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [eqFuncDefine, eqMainBody, eqLimits] = extractEquationParts(localEquation);
      const boxedExpression = MathfieldElement.computeEngine!.parse(eqMainBody, { canonical: true });

      // Create variable to Excel cell reference map
      const variableExcelMap = variableList.reduce((acc, entry) => {
        if (entry.latexVar) {
          const mjsonVar = MathfieldElement.computeEngine!.parse(entry.latexVar.trim());
          acc[mjsonVar.json.toString()] = entry.excelVar.trim();
        }
        return acc;
      }, {} as VarMapping);

      // Generate the Excel Formula and copy it to the clipboard
      const excelFormula = mathjsonToExcel(boxedExpression.json, variableExcelMap);

      try {
        // NOTE: This can throw an error if the document if unfocused
        await navigator.clipboard.writeText(excelFormula);
      } catch (err) {
        if (FLAGS.enableDebugLogging) {
          // eslint-disable-next-line no-console
          console.error('Failed to copy Excel formula:', err);
        }
        alert('Failed to copy Excel formula, please try again!');
        return;
      }

      // Show a tooltip saying that the copy action was successful
      setCopiedFormulaTooltip(true);
      setTimeout(() => setCopiedFormulaTooltip(false), 1000);
    }, [localEquation, variableList]);

    ////////////
    // RENDER //
    ////////////

    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Translate.toString(transform),
          transition,
          zIndex: isDragging ? 999 : undefined,
          position: 'relative',
          // Hint to browser to use GPU acceleration for transforms during drag
          willChange: transform ? 'transform' : undefined,
        }}
        className="flex flex-col"
      >
        <div className="flex flex-row w-full items-center my-[2px]">
          <button
            {...attributes}
            {...listeners}
            tabIndex={-1}
            className="mr-2 py-2 rounded border border-gray-400 cursor-grab hover:bg-gray-200 active:cursor-grabbing"
          >
            <MemoizedIcon
              icon={faGripVertical}
              size="lg"
              style={GRIP_ICON_STYLE}
            />
          </button>

          <math-field
            id={`mathfield-${id}`}
            ref={latexMathfieldRef}
            // script-depth={5}
            className="min-w-0 flex-1"
            style={mathfieldStyle}
            onInput={handleEquationInput}
          >
            {localEquation}
          </math-field>

          <div className="flex flex-shrink-0 gap-2 px-2">
            <div className="group relative">
              <button
                disabled={!MathfieldElement.computeEngine || localEquation.length == 0 || inputEquationState != EQUATION_STATES.VALID}
                onClick={handleExcelExport}
                className="p-2 rounded border hover:bg-gray-200"
              >
                <MemoizedIcon icon={faFileExcel} />
              </button>

              <span
                className="absolute right-full top-1/2 hidden mr-2 px-2 py-1 rounded bg-gray-700 text-xs text-white shadow -translate-y-1/2 group-hover:block"
              >
                {!showCopiedFormulaTooltip ? 'Copy Excel Formula' : 'Copied!'}
              </span>
            </div>

            <button
              onClick={onDeleteLine}
              className="p-2 rounded border bg-red-100 text-red-700 hover:bg-red-200"
            >
              <MemoizedIcon icon={faTrashCan} />
            </button>
          </div>
        </div>

        {/* In focus mode, hide the missing variables for minimal distraction */}
        <div
          className="flex flex-row w-full items-center gap-1 my-[2px]"
          style={{ display: inFocusMode || missingLatexVars.length === 0 ? 'none' : 'flex' }}
        >
          <math-field
            read-only
            tabIndex={-1}
            style={MISSING_VAR_LABEL_STYLE}
          >
            {'\\text{Missing:}'}
          </math-field>

          {missingLatexVars.map(_var => (
            <math-field
              key={_var}
              tabIndex={-1}
              read-only
              className="border"
              style={MISSING_VAR_ITEM_STYLE}
            >
              {_var}
            </math-field>
          ))}
        </div>
      </div>
    );
  }),
  (prevProps: EquationLineProps, nextProps: EquationLineProps) => {
    // Custom comparison to prevent re-renders when only irrelevant fields change
    // Return true if props are equal (component should NOT re-render)

    return (
      prevProps.id === nextProps.id &&
      prevProps.equation === nextProps.equation &&
      prevProps.inFocusMode === nextProps.inFocusMode &&
      deepEqual(prevProps.variableList, nextProps.variableList)
    );
  }
);

export default EquationLine;
