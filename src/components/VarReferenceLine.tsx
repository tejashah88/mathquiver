import { useEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";
import { FaTrashAlt } from "react-icons/fa";

export default function VariableReference({
  variable,
  excelRef,
  onChange,
  onDelete,
  editableVariable = true,
}: {
  variable: string;
  excelRef: string;
  onChange?: (val: string) => void;
  onDelete?: () => void;
  editableVariable?: boolean;
  count?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);

  useEffect(() => {
    if (editableVariable && !mathfieldRef.current && containerRef.current) {
      const mf = new MathfieldElement();
      mf.value = variable;
      mf.style.fontSize = "1rem";
      mf.style.width = "100%";
      mf.style.border = "1px solid #ccc";
      mf.style.borderRadius = "0.25rem";
      mf.style.padding = "0.1rem 0.2rem";

      mf.addEventListener("input", (e) => {
        const val = (e.target as MathfieldElement).value;
        onChange?.(val);
      });

      mathfieldRef.current = mf;
      containerRef.current.appendChild(mf);
    }
  }, [variable, onChange, editableVariable]);

  return (
    <tr>
      <td className="border p-2 items-center space-x-2">
        {editableVariable ? <div ref={containerRef}></div> : <span>{variable}</span>}
      </td>
      <td className="border p-2 flex items-center space-x-2">
        <input
          type="text"
          value={excelRef}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full border rounded px-1 py-0.5"
        />

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="p-2 border rounded bg-red-100 hover:bg-red-200 text-red-700"
        >
          <FaTrashAlt />
        </button>
      </td>
    </tr>
  );
}
