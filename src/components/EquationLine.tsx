import { useEffect, useRef, useState } from "react";
import { MathfieldElement } from "mathlive";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faImage, faTrashCan } from '@fortawesome/free-solid-svg-icons';

export default function EquationLine({
  index,
  value,
  onDelete,
  onMathChange,
}: {
  index: number;
  value: string;
  onDelete?: () => void;
  onMathChange?: (val: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);

  useEffect(() => {
    if (!mathfieldRef.current && containerRef.current) {
      const mf = new MathfieldElement();

      mf.value = value;
      mf.style.fontSize = "1.2rem";
      mf.style.width = "100%";
      mf.style.border = "1px solid #ccc";
      mf.style.borderRadius = "0.25rem";
      mf.style.padding = "0.1rem 0.2rem";

      mf.addEventListener("input", (e) => {
        const latex = (e.target as MathfieldElement).value;
        onMathChange?.(latex);
      });

      mathfieldRef.current = mf;
      containerRef.current.appendChild(mf);

      mf.menuItems = mf.menuItems.filter(item =>
        !!item && 'id' in item && item.id !== undefined &&
        ["cut", "copy", "paste", "select-all"].includes(item.id)
      );
    }
  }, [value, onMathChange]);

  const copyToClipboard = async () => {
    if (mathfieldRef.current) {
      await navigator.clipboard.writeText(mathfieldRef.current.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const copyPNGToClipboard = async () => {
    if (!mathfieldRef.current) return;

    const latex = encodeURIComponent(mathfieldRef.current.value);
    const url = `https://latex.codecogs.com/png.image?\\large&space;\\dpi{300}&space;${latex}`;

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy PNG:", err);
    }
  };

  return (
    <div className="flex items-center mb-2 w-full">
      <span
        className="mr-2 font-semibold flex items-center justify-center"
        style={{ fontSize: "1.2rem", width: "2rem" }}
      >
        {index + 1})
      </span>

      <div className="flex-1 flex items-center border rounded px-2 py-1 bg-gray-50 min-h-[2.5rem] relative">
        <div ref={containerRef} className="flex-1"></div>

        {/* Copy buttons with tooltips */}
        <div className="flex flex-col ml-2 space-y-1">
          <div className="relative group">
            <button
              onClick={copyToClipboard}
              className="p-2 rounded hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faFileExcel} />
            </button>
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded shadow">
              {!copied ? "Copy Excel Formula" : "Copied!"}
            </span>
          </div>

          <div className="relative group">
            <button
              onClick={copyPNGToClipboard}
              className="p-2 rounded hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faImage} />
            </button>
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded shadow">
              {!imageCopied ? "Copy Image" : "Copied!"}
            </span>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-2 p-2 border rounded bg-red-100 hover:bg-red-200 text-red-700"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        )}
      </div>
    </div>
  );
}
