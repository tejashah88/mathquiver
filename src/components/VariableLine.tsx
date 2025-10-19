'use client';

// React imports
import { ChangeEvent, FormEvent, KeyboardEvent, memo, useEffect, useRef, useState } from 'react';

// Drag-and-drop kit integration
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Mathlive integration
import { MathfieldElement } from 'mathlive';

// Font Awesome Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTrashCan } from '@fortawesome/free-solid-svg-icons';

// Local imports
import { cycleCellRef, parseCellRef } from '@/logic/excel-cell-ref';


// Excel cell reference validation states for border rendering
enum CELL_REF_STATES {
  VALID,
  MISSING,
  INVALID,
};

const CELL_REF_BORDER_STYLES = {
  [CELL_REF_STATES.VALID]: '1px solid #000',
  [CELL_REF_STATES.MISSING]: '4px solid #fa0',
  [CELL_REF_STATES.INVALID]: '4px solid #f00',
  undefined: '1px solid #ccc',
  null: '1px solid #ccc',
};

function isValidCellRef(cellRef: string): boolean {
  try {
    parseCellRef(cellRef);
    return true;
  } catch {
    return false;
  }
}


interface VariableLineProps {
  id: string;
  latexInput: string;
  excelInput: string;
  onLatexInput: (val: string) => void;
  onExcelInput: (val: string) => void;
  onNewLineRequested: () => void;
  onDelete: () => void;
}

const VariableLine = memo<VariableLineProps>(function VariableLine({
  id,
  latexInput,
  excelInput,

  // Listeners
  onLatexInput,
  onExcelInput,
  onNewLineRequested,
  onDelete,
}) {
  //////////////////////////////
  // Stage 1: Setup variables //
  //////////////////////////////

  const latexMathfieldRef = useRef<MathfieldElement | null>(null);

  // Cell verification
  const [inputCellState, setInputCellState] = useState<CELL_REF_STATES>(CELL_REF_STATES.VALID);

  // Drag-and-drop integration
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  ///////////////////////////////////
  // Stage 2: Setup logic on mount //
  ///////////////////////////////////

  // Setup the mathfield element on mount
  // Source: https://mathlive.io/mathfield/lifecycle/#-attachedmounted
  useEffect(() => {
    if (!latexMathfieldRef.current) return;
    const mf = latexMathfieldRef.current;

    // Remove menu items for the variable editor
    mf.menuItems = [];

    // Listener to add a new line when pressing Enter/Return
    function addNewLine(evt: InputEvent) {
      if (evt.data === 'insertLineBreak') {
        evt.preventDefault();
        onNewLineRequested();
      }
    }

    // Listener to enforce alpha and greek virtual keyboards for variable typing
    function changeKeyboardLayout() {
      window.mathVirtualKeyboard.layouts = ['alphabetic', 'greek'];
    }

    // Add necessary event listeners
    mf.addEventListener('focusin', changeKeyboardLayout);
    mf.addEventListener('beforeinput', addNewLine);

    // Grab focus to the element in case the user has created a new variable via Enter/Return
    mf.focus();

    // Remember to remove the listeners, especially since dev mode can reload the same webpage multiple times
    return () => {
      mf.removeEventListener('focusin', changeKeyboardLayout);
      mf.removeEventListener('beforeinput', addNewLine);
    };
    // NOTE: We don't expect onNewLineRequested to change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latexMathfieldRef]);

  // Re-render the cell reference border based on content validity
  useEffect(() => {
    if (excelInput === '') {
      setInputCellState(CELL_REF_STATES.MISSING);
    } else if (!isValidCellRef(excelInput)) {
      setInputCellState(CELL_REF_STATES.INVALID);
    } else {
      setInputCellState(CELL_REF_STATES.VALID);
    }
  }, [excelInput]);

  ///////////////////////////////
  // Stage 3: Render component //
  ///////////////////////////////

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 999 : undefined,
        position: 'relative',
      }}
      className="grid grid-cols-[1.5rem_2fr_2fr_2.5rem] justify-center gap-1 border border-gray-700 bg-gray-50"
    >
      <button
        {...attributes}
        {...listeners}
        tabIndex={-1}
        className="ml-1 cursor-grab place-self-center py-2 hover:bg-gray-200 active:cursor-grabbing"
      >
        <FontAwesomeIcon icon={faGripVertical} style={{ color: 'gray' }} />
      </button>

      <math-field
        id={`mathfield-${id}`}
        ref={latexMathfieldRef}
        // script-depth={5}
        default-mode="inline-math"
        className="hide-menu w-full min-w-[120px] place-content-center my-2"
        style={{
          fontSize: '1.25rem',
          border: '1px solid #ccc',
          borderRadius: '0.25rem',
        }}
        onInput={(event: FormEvent<MathfieldElement>) => {
          const mf = event.target as MathfieldElement;
          onLatexInput(mf.getValue('latex-unstyled'));
        }}
      >
        {latexInput}
      </math-field>

      <input
        type="text"
        value={excelInput}
        className="w-full min-w-[80px] place-self-center rounded border px-1 py-2"
        style={{
          border: CELL_REF_BORDER_STYLES[inputCellState],
          borderRadius: '0.25rem',
        }}
        onChange={(evt: ChangeEvent<HTMLInputElement>) => {
          onExcelInput(evt.target.value);
        }}
        onKeyDown={(evt: KeyboardEvent<HTMLInputElement>) => {
          if (evt.key === 'F4') {
            evt.preventDefault();
            onExcelInput(cycleCellRef(excelInput));
          }
        }}
        onKeyUp={(evt: KeyboardEvent<HTMLInputElement>) => {
          if (evt.key === 'Enter') {
            onNewLineRequested();
          }
        }}
      />

      <div className="mr-1 place-self-center">
        <button
          onClick={onDelete}
          className="rounded border bg-red-100 p-2 text-red-700 hover:bg-red-200"
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when only irrelevant fields change
  // Return true if props are equal (component should NOT re-render)
  // Note: We intentionally skip comparing callbacks to avoid re-renders from inline functions

  // Check if core data changed
  if (
    prevProps.id !== nextProps.id ||
    prevProps.latexInput !== nextProps.latexInput ||
    prevProps.excelInput !== nextProps.excelInput
  ) {
    return false; // Core data changed, must re-render
  }

  return true; // All relevant props are equal, skip re-render
});

export default VariableLine;
