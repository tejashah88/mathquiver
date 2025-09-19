import { useEffect, useRef } from 'react';
import { MathfieldElement } from 'mathlive';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';


export default function VariableLine({
  equationVar,
  excelRef,
  onVarChange,
  onExcelChange,
  onDelete,
  enableCompactView = false,
}: {
  equationVar: string;
  excelRef: string;
  onVarChange?: (val: string) => void;
  onExcelChange?: (val: string) => void;
  onDelete?: () => void;
  editableVariable?: boolean;
  count?: number;
  enableCompactView?: boolean;
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

      mathfieldRef.current = mf;
      containerRef.current.appendChild(mf);
    }
  }, [equationVar, onVarChange]);

  return (
    <tr className="w-full">
      {/* Equation variable cell */}
      <td className="border p-2">
        <div ref={containerRef} className="h-full w-full" />
      </td>

      {/* Excel variable cell */}
      <td className="border p-2 min-w-0">
        <div className="flex gap-2 items-center w-full min-w-0">
          <input
            type="text"
            value={excelRef}
            onChange={(e) => onExcelChange?.(e.target.value)}
            className={`flex-1 min-w-0 border rounded py-2 px-2 ${enableCompactView ? 'w-full' : 'w-auto'}`}
          />
          <button
            onClick={onDelete}
            className="flex-none border rounded bg-red-100 hover:bg-red-200 text-red-700 p-2"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        </div>
      </td>
    </tr>
  );
}
