'use client';

// React imports
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

// Drag-and-drop kit integration
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Mathlive integration
import { MathfieldElement } from 'mathlive';

// Font Awesome Icons
import { faGripVertical, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Hooks
import { useDebounceCallback } from 'usehooks-ts';

// Local algorithms
import { cycleCellRef, parseCellRef } from '@/logic/excel-cell-ref';
import { parseMathfieldDOM } from '@/logic/mathfield-dom-parser';

// Local utilities
import { applyStyleToRange, clearColors } from '@/logic/mathfield-dom-stylizer';
import { FLAGS } from '@/debug/feature-flags';

// Constants
export const INPUT_DEBOUNCE_DELAY = 200;
export const RESIZE_DEBOUNCE_DELAY = 300;


// Excel cell reference validation states for border rendering
const enum CELL_REF_STATES { VALID, MISSING, INVALID };

const CELL_REF_BORDER_STYLES = {
  [CELL_REF_STATES.VALID]: '1px solid #000',
  [CELL_REF_STATES.MISSING]: '4px solid #fa0',
  [CELL_REF_STATES.INVALID]: '4px solid #f00',
};

// Static style objects (extracted to avoid recreation on every render)
const GRIP_ICON_STYLE = { color: 'gray' } as const;
const MATHFIELD_STYLE = {
  fontSize: '1.25rem',
  border: '1px solid #ccc',
  borderRadius: '0.25rem',
} as const;

function isValidCellRef(cellRef: string): boolean {
  try {
    parseCellRef(cellRef);
    return true;
  } catch {
    return false;
  }
}


interface VariableLineProps {
  // Parameters
  id: string;
  latexInput: string;
  excelInput: string;
  inFocusMode: boolean;

  // Global Handlers
  onVariableLatexInput: (id: string, val: string) => void;
  onVariableExcelInput: (id: string, val: string) => void;
  onVariableNewLine: (id: string) => void;
  onVariableDelete: (id: string) => void;
  onVariableFocus: (id: string) => void;
}

export interface VariableLineHandle {
  focus: () => void;
}

const VariableLine = memo(
  function VariableLine(
    {
      ref,

      // Parameters
      id,

      latexInput,
      excelInput,
      inFocusMode,

      // Global handlers
      onVariableLatexInput,

      onVariableExcelInput,
      onVariableNewLine,
      onVariableDelete,
      onVariableFocus
    }: VariableLineProps & {
      ref?: React.Ref<VariableLineHandle | null>;
    }
  ) {
  //////////
  // REFS //
  //////////

  // Main mathfield element ref
  const latexMathfieldRef = useRef<MathfieldElement | null>(null);

  // Track dragging state in a ref so the observer callback can read latest value
  // without recreating the observer on every drag state change
  const isDraggingRef = useRef<boolean>(false);

  // Track window resize state in a ref so the observer callback can read latest value
  // without recreating the observer on every resize event
  const isResizingRef = useRef<boolean>(false);

  // Store function to force style updates (set by MutationObserver effect)
  const forceStyleUpdateRef = useRef<(() => void) | null>(null);

  ///////////
  // STATE //
  ///////////

  // Local state for immediate visual feedback (debounced updates to parent)
  const [localLatexInput, setLocalLatexInput] = useState<string>(latexInput);
  const [localExcelInput, setLocalExcelInput] = useState<string>(excelInput);

  // Cell reference verification state for border rendering
  const [inputCellState, setInputCellState] = useState<CELL_REF_STATES>(CELL_REF_STATES.VALID);

  ///////////////
  // CALLBACKS //
  ///////////////

  const onLatexInput = useCallback(
    (val: string) => {
      onVariableLatexInput(id, val);
    },
    [id, onVariableLatexInput]
  );

  const onExcelInput = useCallback(
    (val: string) => {
      onVariableExcelInput(id, val);
    },
    [id, onVariableExcelInput]
  );

  // Create debounced versions of the callbacks
  const debouncedOnLatexInput = useDebounceCallback(onLatexInput, INPUT_DEBOUNCE_DELAY);
  const debouncedOnExcelInput = useDebounceCallback(onExcelInput, INPUT_DEBOUNCE_DELAY);

  const onNewLineRequested = useCallback(() => {
    onVariableNewLine(id);
  }, [id, onVariableNewLine]);

  const onDelete = useCallback(() => {
    onVariableDelete(id);
  }, [id, onVariableDelete]);

  const onFocus = useCallback(() => {
    onVariableFocus(id);
  }, [id, onVariableFocus]);

  ///////////
  // HOOKS //
  ///////////

  // Drag-and-drop integration
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  // Expose focus method to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      latexMathfieldRef.current?.focus();
    },
  }), []);

  ///////////////////////
  // EFFECTS: REF SYNC //
  ///////////////////////

  // Keep the dragging ref in sync with isDragging state
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Track window resize to skip expensive styling operations during resize
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout | undefined;

    const handleResize = () => {
      // Set flag immediately when resize starts
      isResizingRef.current = true;

      // Clear existing timeout
      if (resizeTimeout) clearTimeout(resizeTimeout);

      // Debounce: clear flag after resize stops and force style update
      resizeTimeout = setTimeout(() => {
        isResizingRef.current = false;
        // Force a style update now that resize has stopped
        forceStyleUpdateRef.current?.();
      }, RESIZE_DEBOUNCE_DELAY);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  ////////////////////////
  // EFFECTS: PROP SYNC //
  ////////////////////////

  // Sync prop changes to local state (handles external updates like imports)
  useEffect(() => {
    setLocalLatexInput(latexInput);
  }, [latexInput]);

  useEffect(() => {
    setLocalExcelInput(excelInput);
  }, [excelInput]);

  /////////////////////////////////
  // EFFECTS: SETUP (MOUNT ONLY) //
  /////////////////////////////////

  // Setup the mathfield element on mount
  // Source: https://mathlive.io/mathfield/lifecycle/#-attachedmounted
  // OPTIMIZED: Callbacks are stable (via useCallback), so event listeners can use them directly.
  useEffect(() => {
    const mf = latexMathfieldRef.current;
    if (!mf) return;

    // Remove menu items for the variable editor
    mf.menuItems = [];

    // Listener to add a new line when pressing Enter/Return
    const addNewLine = (evt: InputEvent) => {
      if (evt.data === 'insertLineBreak') {
        evt.preventDefault();
        onNewLineRequested();
      }
    };

    // Listener to enforce alpha and greek virtual keyboards for variable typing
    const changeKeyboardLayout = () => {
      window.mathVirtualKeyboard.layouts = ['alphabetic', 'greek'];
      onFocus();
    };

    // Add necessary event listeners
    mf.addEventListener('focusin', changeKeyboardLayout);
    mf.addEventListener('beforeinput', addNewLine);

    // Remember to remove the listeners, especially since dev mode can reload the same webpage multiple times
    return () => {
      mf.removeEventListener('focusin', changeKeyboardLayout);
      mf.removeEventListener('beforeinput', addNewLine);
    };
  }, [onNewLineRequested, onFocus]);

  // Apply visual styling to units parts using shadow DOM manipulation. This bypasses using LaTeX
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

      // Skip styling during window resize to improve resize performance
      if (isResizingRef.current) return;

      try {
        const charIndex = parseMathfieldDOM(mf);
        clearColors(charIndex);

        // Find markers at depth 0 (top-level, not in subscripts/superscripts)
        const leftBracket = charIndex.find(item => item.char === '[' && item.depth === 0);

        // Color RHS (everything after left bracket) gray
        if (leftBracket) {
          applyStyleToRange(charIndex, leftBracket.index + 1, charIndex.length, { color: '#6b7280' });
          leftBracket.element.style.color = '#6b7280';
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

    // Store the style updater function so resize handler can force updates
    forceStyleUpdateRef.current = scheduleStyleApplication;

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
      forceStyleUpdateRef.current = null;
    };
    // NOTE: Setup runs once on mount, while listeners use refs for latest callbacks
  }, []);

  /////////////////////////
  // EFFECTS: VALIDATION //
  /////////////////////////

  // Re-render the cell reference border based on content validity
  useEffect(() => {
    if (localExcelInput === '') {
      setInputCellState(CELL_REF_STATES.MISSING);
    } else if (!isValidCellRef(localExcelInput)) {
      setInputCellState(CELL_REF_STATES.INVALID);
    } else {
      setInputCellState(CELL_REF_STATES.VALID);
    }
  }, [localExcelInput]);

  //////////////////////
  // MEMOIZED VALUES //
  /////////////////////

  // Memoize mathfield inline style object with calculated border style
  const inputStyle = useMemo(() => ({
    border: inFocusMode ? CELL_REF_BORDER_STYLES[CELL_REF_STATES.VALID] : CELL_REF_BORDER_STYLES[inputCellState],
    borderRadius: '0.25rem',
  }), [inFocusMode, inputCellState]);

  ///////////////
  // CALLBACKS //
  ///////////////

  // Memoize mathfield input handler with immediate local update and debounced parent update
  const handleLatexInput = useCallback((event: FormEvent<MathfieldElement>) => {
    const mf = event.target as MathfieldElement;
    const latex = mf.getValue('latex-unstyled');

    // Update focus tracking whenever user types (not just on focus event)
    onVariableFocus(id);

    // Update local state immediately for instant visual feedback
    setLocalLatexInput(latex);

    // Debounced update to parent to reduce expensive re-renders
    debouncedOnLatexInput(latex);
  }, [debouncedOnLatexInput, onVariableFocus, id]);

  // Memoize Excel cell input handler with immediate local update and debounced parent update
  const handleExcelChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value;

    // Update focus tracking whenever user types (not just on focus event)
    onVariableFocus(id);

    // Update local state immediately for instant visual feedback
    setLocalExcelInput(value);

    // Debounced update to parent to reduce expensive re-renders
    debouncedOnExcelInput(value);
  }, [debouncedOnExcelInput, onVariableFocus, id]);

  // Memoize F4 key handler (cycle cell references)
  const handleExcelKeyDown = useCallback((evt: KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'F4') {
      evt.preventDefault();
      const cycledRef = cycleCellRef(localExcelInput);

      // Update local state immediately
      setLocalExcelInput(cycledRef);

      // Debounced update to parent
      debouncedOnExcelInput(cycledRef);
    }
  }, [localExcelInput, debouncedOnExcelInput]);

  // Memoize Enter key handler
  const handleExcelKeyUp = useCallback((evt: KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Enter') {
      onNewLineRequested();
    }
  }, [onNewLineRequested]);

  ////////////
  // RENDER //
  ////////////

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        visibility: isDragging ? 'hidden' : undefined,
        position: 'relative',
        // Hint to browser to use GPU acceleration for transforms during drag
        willChange: transform ? 'transform' : undefined,
        // Ensure item has min-height for VList measurement
        minHeight: '40px',
      }}
      className="grid grid-cols-[1.5rem_2fr_2fr_2.5rem] justify-center gap-1 border border-gray-700 bg-gray-50"
    >
      <button
        {...attributes}
        {...listeners}
        tabIndex={-1}
        title="Drag to Reorder"
        className="ml-1 py-2 place-self-center cursor-grab hover:bg-gray-200 active:cursor-grabbing"
      >
        <FontAwesomeIcon icon={faGripVertical} style={GRIP_ICON_STYLE} />
      </button>

      <math-field
        id={`mathfield-${id}`}
        ref={latexMathfieldRef}
        // script-depth={5}
        className="w-full min-w-[120px] my-2 place-content-center hide-menu"
        style={MATHFIELD_STYLE}
        onInput={handleLatexInput}
        onFocus={onFocus}
      >
        {localLatexInput}
      </math-field>

      <input
        type="text"
        value={localExcelInput}
        className="w-full min-w-[80px] px-1 py-2 place-self-center rounded border"
        style={inputStyle}
        onChange={handleExcelChange}
        onKeyDown={handleExcelKeyDown}
        onKeyUp={handleExcelKeyUp}
        onFocus={onFocus}
      />

      <div className="mr-1 place-self-center">
        <button
          onClick={onDelete}
          title="Delete Variable"
          className="p-2 rounded border bg-red-100 text-red-700 hover:bg-red-200"
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
    </div>
  );
  },
  (prevProps: VariableLineProps, nextProps: VariableLineProps) => {
    // Custom comparison to prevent re-renders when only irrelevant fields change
    // Return true if relevant props are equal (component should NOT re-render)

    return (
      prevProps.id === nextProps.id &&
      prevProps.latexInput === nextProps.latexInput &&
      prevProps.excelInput === nextProps.excelInput &&
      prevProps.inFocusMode === nextProps.inFocusMode
    );
  }
);

export default VariableLine;
