import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MathfieldElement } from 'mathlive';
import '@cortex-js/compute-engine';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faFileExcel, faTrashCan } from '@fortawesome/free-solid-svg-icons';

import { checkMathjsonToExcel } from '@/logic/mj-excel';


enum EQUATION_STATES {
  VALID,
  INVALID,
  ERROR,
};


const MF_BORDER_STYLES = {
  [EQUATION_STATES.VALID]: '1px solid #000',
  [EQUATION_STATES.INVALID]: '4px solid #fa0',
  [EQUATION_STATES.ERROR]: '4px solid #f00',
  undefined: '1px solid #ccc',
  null: '1px solid #ccc',
};


export default function EquationLine({
  id,
  equation,

  // Listeners
  onUserInput = () => {},
  onCopyExcel = () => {},
  onNewLineRequested,
  onDeleteLine,
}: {
  id: string;
  equation: string;

  // Listeners
  onUserInput: (val: string) => void;
  onCopyExcel: (val: string) => void;
  onNewLineRequested: () => void;
  onDeleteLine: () => void;
}) {
  const mathfieldRef = useRef<MathfieldElement | null>(null);

  const [shouldVerifyInput, setShouldVerifyInput] = useState(false);
  const [inputEquationState, setInputEquationState] = useState(EQUATION_STATES.VALID);

  const [showCopiedFormulaTooltip, setCopiedFormulaTooltip] = useState(false);

  // Drag-and-drop logic
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    position: 'relative',
  };

  function addNewLine(evt: InputEvent) {
    if (evt.data === 'insertLineBreak') {
      evt.preventDefault();
      onNewLineRequested?.();
    }
  }

  // Simplify the menu and add a 'Copy LaTeX Image' command when the mathfield is mounted
  // Source: https://mathlive.io/mathfield/lifecycle/#-attachedmounted
  useEffect(() => {
    if (!mathfieldRef.current) return;
    const mf = mathfieldRef.current;

    // Keep relevent default items
    const defaultMenuItems = mf.menuItems.filter(item =>
      !!item && 'id' in item && item.id !== undefined &&
      ['cut', 'copy', 'paste', 'select-all'].includes(item.id)
    );

    const insertCopyImageIndex = defaultMenuItems.findIndex(item =>
      !!item && 'id' in item && item.id !== undefined && item.id === 'paste'
    );

    // Compile final menu for equation editor
    mf.menuItems = [
      ...defaultMenuItems.slice(0, insertCopyImageIndex),
      // Add new menu item to allow copying of LaTeX rendered image
      {
        id: 'copy-image',
        label: 'Copy Image',
        onMenuSelect: async () => {
          const latex = encodeURIComponent(mf.expression.latex);
            const url = `https://latex.codecogs.com/png.image?\\large&space;\\dpi{300}&space;${latex}`;

            try {
              const res = await fetch(url);
              const blob = await res.blob();
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            } catch (err) {
              alert('Failed to copy LaTeX render:\n' + err);
            }
        },
      },
      ...defaultMenuItems.slice(insertCopyImageIndex),
    ];

    mf.addEventListener('beforeinput', addNewLine);

    // Invalidate the input once to force an expression check (to properly render the status border)
    setShouldVerifyInput(true);

    return () => {
      mf.removeEventListener('beforeinput', addNewLine);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mathfieldRef]);


  if (mathfieldRef.current && shouldVerifyInput) {
    setShouldVerifyInput(false);

    const mf = mathfieldRef.current;

    const isExprValid = mf.expression.isValid;
    if (!isExprValid) {
      setInputEquationState(EQUATION_STATES.INVALID);
      return;
    }

    const splitLatexEquation = (mf.expression.latex as string).split('=');
    const rhsLatexEquation = splitLatexEquation[splitLatexEquation.length - 1];
    const boxedExpression = MathfieldElement.computeEngine!.parse(rhsLatexEquation);

    const canProcessEqu = checkMathjsonToExcel(boxedExpression.json);
    if (!canProcessEqu) {
      setInputEquationState(EQUATION_STATES.ERROR);
      return;
    }

    setInputEquationState(EQUATION_STATES.VALID);
  }


  return (
    <div ref={setNodeRef} style={style} className="flex items-center my-1 w-full">
      <button
        {...attributes}
        {...listeners}
        tabIndex={-1}
        className="hover:bg-gray-100 cursor-grab active:cursor-grabbing mr-2 place-self-center"
      >
        <FontAwesomeIcon icon={faGripVertical} style={{ color: 'gray' }} />
      </button>

      <math-field
        ref={mathfieldRef}
        className="flex-initial"
        style={{
          fontSize: '1.5rem',
          width: '100%',
          border: MF_BORDER_STYLES[inputEquationState],
          borderRadius: '0.25rem',
        }}

        onInput={(event) => {
          const mf = event.target as MathfieldElement;
          onUserInput?.(mf.value);
          setShouldVerifyInput(true);
        }}

        // onKeyUp={e => {
        //   if (e.key === 'Enter') {
        //     console.log(mathfieldRef.current?.mode);
        //     onNewLineRequested?.();
        //   }
        // }}
      >
        {equation}
      </math-field>

      <div className="flex gap-2 px-2">
        <div className="relative group">
          <button
            disabled={!MathfieldElement.computeEngine || equation.length == 0 || inputEquationState != EQUATION_STATES.VALID}
            onClick={() => {
              if (!mathfieldRef.current) return;

              onCopyExcel?.(mathfieldRef.current?.expression.latex);
              setCopiedFormulaTooltip(true);
              setTimeout(() => setCopiedFormulaTooltip(false), 1000);
            }}
            className="p-2 border rounded hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faFileExcel} />
          </button>

          <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded shadow">
            {!showCopiedFormulaTooltip ? 'Copy Excel Formula' : 'Copied!'}
          </span>
        </div>

        <button
          onClick={onDeleteLine}
          className="p-2 border rounded bg-red-100 hover:bg-red-200 text-red-700"
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
    </div>
  );
}
