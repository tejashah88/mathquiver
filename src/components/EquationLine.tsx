import { useEffect, useRef, useState } from 'react';

import { MathfieldElement } from 'mathlive';
import '@cortex-js/compute-engine';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faImage, faTrashCan } from '@fortawesome/free-solid-svg-icons';

import { checkMathjsonToExcel, mathjsonToExcel } from '@/logic/mj-excel';
import { BoxedExpression } from '@cortex-js/compute-engine';

const MF_BORDER_STYLES = {
  exprValid: '1px solid #ccc',
  exprInvalid: '4px solid #fa0',
  computeError: '4px solid #f00',
};

export default function EquationLine({
  index,
  value,

  // Listeners
  onMathInput,
  onCopyExcel,
  onCopyImage,
  onDeleteLine,
}: {
  index: number;
  value: string;

  // Listeners
  onMathInput?: (val: string) => void;
  onCopyExcel?: (val: BoxedExpression) => void;
  onCopyImage?: (val: BoxedExpression) => void;
  onDeleteLine?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);

  const [isExpressionValid, setIsExpressionValid] = useState(false);
  const [hasComputeError, setHasComputeError] = useState(false);

  const [showCopiedFormulaTooltip, setCopiedFormulaTooltip] = useState(false);
  const [showCopiedImageTooltip, setCopiedImageTooltip] = useState(false);

  useEffect(() => {
    if (!mathfieldRef.current && containerRef.current) {
      const mf = new MathfieldElement();

      mf.value = value;
      mf.style.fontSize = '1.2rem';
      mf.style.width = '100%';
      mf.style.border = '1px solid #ccc';
      mf.style.borderRadius = '0.25rem';
      mf.style.padding = '0.1rem 0.2rem';

      MathfieldElement.soundsDirectory = null;

      mf.addEventListener('mount', () => {
        mf.menuItems = mf.menuItems.filter(item =>
          !!item && 'id' in item && item.id !== undefined &&
          ['cut', 'copy', 'paste', 'select-all'].includes(item.id)
        );
      });

      mf.addEventListener('input', (event) => {
        const isExprValid = mf.expression.isValid;
        setIsExpressionValid(isExprValid);

        mf.style.border = isExprValid ? MF_BORDER_STYLES.exprValid : MF_BORDER_STYLES.exprInvalid;
        if (isExprValid) {
          const mathJson = mf.expression.json;
          onMathInput?.(mathJson);

          const canProcessEquation = checkMathjsonToExcel(mathJson);
          setHasComputeError(!canProcessEquation);
          if (!canProcessEquation) {
            mf.style.border = MF_BORDER_STYLES.computeError;
          }
        }
      });

      mathfieldRef.current = mf;
      containerRef.current.appendChild(mf);
    }
  }, [value, onMathInput]);

  // const copyToClipboard = async (mfExpression) => {
  //   const excelFormula = mathjsonToExcel(mfExpression.json);

  //   await navigator.clipboard.writeText(excelFormula);

  //   setCopiedFormulaTooltip(true);
  //   setTimeout(() => setCopiedFormulaTooltip(false), 1250);
  // };

  // const copyPNGToClipboard = async (mfExpression) => {
  //   const latex = encodeURIComponent(mfExpression.latex);
  //   const url = `https://latex.codecogs.com/png.image?\\large&space;\\dpi{300}&space;${latex}`;

  //   try {
  //     const res = await fetch(url);
  //     const blob = await res.blob();
  //     await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

  //     setCopiedImageTooltip(true);
  //     setTimeout(() => setCopiedImageTooltip(false), 1250);
  //   } catch (err) {
  //     console.error('Failed to copy PNG:', err);
  //   }
  // };

  return (
    <div className="flex items-center mb-2 w-full">
      <span
        className="mr-2 font-semibold flex items-center justify-center"
        style={{ fontSize: '1.2rem', width: '2rem' }}
      >
        {index + 1})
      </span>

      <div className="flex-1 flex items-center border rounded px-2 py-1 bg-gray-50 min-h-[2.5rem] relative">
        <div ref={containerRef} className="flex-1"></div>

        {/* Copy buttons with tooltips */}
        <div className="flex flex-col ml-2 space-y-1">
          <div className="relative group">
            <button
              disabled={!isExpressionValid || hasComputeError}
              onClick={() => {
                if (!mathfieldRef.current) {
                  return;
                } else {
                  onCopyExcel?.(mathfieldRef.current?.expression);
                }

                setCopiedFormulaTooltip(true);
                setTimeout(() => setCopiedFormulaTooltip(false), 1250);
              }}
              className="p-2 rounded hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faFileExcel} />
            </button>
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded shadow">
              {!showCopiedFormulaTooltip ? 'Copy Excel Formula' : 'Copied!'}
            </span>
          </div>

          <div className="relative group">
            <button
              disabled={!isExpressionValid || hasComputeError}
              onClick={() => {
                if (!mathfieldRef.current) {
                  return;
                } else {
                  onCopyImage?.(mathfieldRef.current?.expression);
                }

                setCopiedImageTooltip(true);
                setTimeout(() => setCopiedImageTooltip(false), 1250);
              }}
              className="p-2 rounded hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faImage} />
            </button>
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded shadow">
              {!showCopiedImageTooltip ? 'Copy Image' : 'Copied!'}
            </span>
          </div>
        </div>

        {onDeleteLine && (
          <button
            onClick={onDeleteLine}
            className="ml-2 p-2 border rounded bg-red-100 hover:bg-red-200 text-red-700"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        )}
      </div>
    </div>
  );
}
