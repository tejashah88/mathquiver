import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MathfieldElement } from 'mathlive';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { checkCellRef, cycleCellRef } from '@/logic/excel-cell-ref';


enum CELL_REF_STATES {
  VALID,
  INVALID,
};


const CELL_REF_BORDER_STYLES = {
  [CELL_REF_STATES.VALID]: '1px solid #000',
  [CELL_REF_STATES.INVALID]: '4px solid #f00',
  undefined: '1px solid #ccc',
  null: '1px solid #ccc',
};

export default function VariableLine({
  id,
  latexInput,
  excelInput,

  // Listeners
  onLatexInput,
  onExcelInput,
  onNewLineRequested,
  onDelete,
}: {
  id: string;
  latexInput: string;
  excelInput: string;

  // Listeners
  onLatexInput?: (val: string) => void;
  onExcelInput?: (val: string) => void;
  onNewLineRequested: () => void;
  onDelete?: () => void;
}) {
  const latexMathfieldRef = useRef<MathfieldElement | null>(null);

  const [shouldVerifyCellInput, setShouldVerifyCellInput] = useState(false);
  const [inputCellState, setInputCellState] = useState(CELL_REF_STATES.VALID);

  function addNewLine(evt: InputEvent) {
    if (evt.data === 'insertLineBreak') {
      evt.preventDefault();
      onNewLineRequested?.();
    }
  }

  function changeKeyboardLayout() {
    window.mathVirtualKeyboard.layouts = ['alphabetic', 'greek'];
  }

  // Remove the menu (not needed for variables) when the mathfield is mounted
  // Source: https://mathlive.io/mathfield/lifecycle/#-attachedmounted
  useEffect(() => {
    if (!latexMathfieldRef.current) return;
    const mf = latexMathfieldRef.current;

    mf.menuItems = [];
    mf.addEventListener('focusin', changeKeyboardLayout);
    mf.addEventListener('beforeinput', addNewLine);

    return () => {
      mf.removeEventListener('focusin', changeKeyboardLayout);
      mf.removeEventListener('beforeinput', addNewLine);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latexMathfieldRef]);

  // Drag-and-drop logic
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    position: 'relative',
  };


  if (shouldVerifyCellInput) {
    setShouldVerifyCellInput(false);

    if (excelInput === '' || checkCellRef(excelInput)) {
      setInputCellState(CELL_REF_STATES.VALID);
    } else {
      setInputCellState(CELL_REF_STATES.INVALID);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-[2rem_2fr_2fr_2.5rem] bg-gray-50 gap-0 justify-center border border-gray-700">
      <button
        {...attributes}
        {...listeners}
        tabIndex={-1}
        className="hover:bg-gray-200 cursor-grab active:cursor-grabbing place-self-center"
      >
        <FontAwesomeIcon icon={faGripVertical} style={{ color: 'gray' }} />
      </button>

      <div className="place-content-center bg-gray-50 relative p-1">
        <math-field
          ref={latexMathfieldRef}
          default-mode="inline-math"
          className="w-full min-w-[140px] hide-menu"
          style={{
            fontSize: '1.25rem',
            border: '1px solid #ccc',
            borderRadius: '0.25rem',
          }}

          onInput={(event) => {
            const mf = event.target as MathfieldElement;
            onLatexInput?.(mf.value);
          }}
        >
          {latexInput}
        </math-field>
      </div>

      <input
        type="text"
        value={excelInput}
        style={{
          border: CELL_REF_BORDER_STYLES[inputCellState],
          borderRadius: '0.25rem',
        }}
        onChange={(event) => {
          onExcelInput?.(event.target.value);
          setShouldVerifyCellInput(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'F4') {
            e.preventDefault();
            onExcelInput?.(cycleCellRef(excelInput));
          }
        }}
        onKeyUp={e => {
          if (e.key === 'Enter') {
            onNewLineRequested?.();
          }
        }}
        className="w-full min-w-[80px] border rounded px-1 py-2 my-2 place-self-center"
      />

      <div className="place-content-center p-1">
        <button
          onClick={onDelete}
          className="border rounded bg-red-100 hover:bg-red-200 text-red-700 p-1"
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
    </div>
  );
}
