import { useEffect, useRef } from 'react';
import { MathfieldElement } from 'mathlive';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';


export default function VariableLine({
  latexVar,
  excelVar,

  // Listeners
  onVarInput,
  onExcelInput,
  onDelete,
}: {
  latexVar: string;
  excelVar: string;

  // Listeners
  onVarInput?: (val: string) => void;
  onExcelInput?: (val: string) => void;
  onDelete?: () => void;
}) {
  const mathfieldRef = useRef<MathfieldElement | null>(null);

  // Remove the menu (not needed for variables) when the mathfield is mounted
  // Source: https://mathlive.io/mathfield/lifecycle/#-attachedmounted
  useEffect(() => {
    if (!mathfieldRef.current) return;
    const mf = mathfieldRef.current;

    mf.menuItems = [];
  }, [mathfieldRef]);

  return (
    <div className="grid grid-cols-[1fr_2fr_auto] items-center border-t border-gray-700">
      <div className="flex flex-1 items-center bg-gray-50 relative p-2 border-r border-gray-700 ">
        <math-field
          ref={mathfieldRef}
          className="w-full hide-menu"
          style={{
            fontSize: '1.25rem',
            width: '100%',
            border: '1px solid #ccc',
            borderRadius: '0.25rem',
          }}

          onInput={(event) => {
            const mf = event.target as MathfieldElement;
            onVarInput?.(mf.value);
          }}
        >
          {latexVar}
        </math-field>
      </div>

      <div className="flex p-2 gap-2 items-center w-full">
        <input
          type="text"
          value={excelVar}
          onChange={(e) => onExcelInput?.(e.target.value)}
          className={`w-full border rounded p-2`}
        />
        <button
          onClick={onDelete}
          className="border rounded bg-red-100 hover:bg-red-200 text-red-700 p-2"
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
    </div>
  );
}
