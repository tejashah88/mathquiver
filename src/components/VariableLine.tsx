import { useEffect, useRef } from 'react';
import { MathfieldElement } from 'mathlive';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';


export default function VariableLine({
  equationVar,
  excelRef,

  // Listeners
  onVarChange,
  onExcelChange,
  onInputEnter,
  onDelete,
}: {
  equationVar: string;
  excelRef: string;

  // Listeners
  onVarChange?: (val: string) => void;
  onExcelChange?: (val: string) => void;
  onInputEnter?: () => void;
  onDelete?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);

  useEffect(() => {
    if (!mathfieldRef.current && containerRef.current) {
      const mf = new MathfieldElement();
      mf.value = equationVar;

      mf.className = 'varMathField';
      mf.style.fontSize = '1rem';
      mf.style.width = '100%';
      mf.style.border = '1px solid #ccc';
      mf.style.borderRadius = '0.25rem';
      mf.style.padding = '0.1rem 0.2rem';

      MathfieldElement.soundsDirectory = null;

      mf.addEventListener('mount', () => {
        mf.menuItems = [];
      });

      mf.addEventListener('input', (event) => {
        onVarChange?.(mf.expression.json);
      });

      mf.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onInputEnter?.();
        }
      });

      mathfieldRef.current = mf;
      containerRef.current.appendChild(mf);
    }
  }, [equationVar, onVarChange, onInputEnter]);

  return (
    <tr className="w-full">
      {/* Equation variable cell */}
      <td className="border p-2">
        <div ref={containerRef} className="w-full" />
      </td>

      {/* Excel variable cell */}
      <td className="border p-2">
        <div className="flex gap-2 items-center w-full">
          <input
            type="text"
            value={excelRef}
            onChange={(e) => onExcelChange?.(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onInputEnter?.();
              }
            }}
            className={`w-full border rounded py-2 px-2`}
          />
          <button
            onClick={onDelete}
            className="border rounded bg-red-100 hover:bg-red-200 text-red-700 p-2"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        </div>
      </td>
    </tr>
  );
}
