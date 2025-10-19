'use client';

// React imports
import { FormEvent, memo, useEffect, useRef, useState } from 'react';

// Drag-and-drop kit integration
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Mathlive integration
import { Expression, MathfieldElement } from 'mathlive';

// Font Awesome Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faFileExcel, faTrashCan } from '@fortawesome/free-solid-svg-icons';

// Local imports
import { mathjsonToExcel } from '@/logic/mathjson-excel';
import { extractLatexVariables } from '@/logic/latex-var-extract';
import { VariableItem, VarMapping } from '@/types';
import extractEquationParts from '@/logic/extract-equation-parts';
import {
  parseMathfieldDOM,
  applyStyleToRange,
  clearStyles,
} from '@/logic/mathfield-dom-stylizer';


// Equation validation states for border rendering
enum EQUATION_STATES { VALID, INVALID, ERROR };

const MF_BORDER_STYLES = {
  [EQUATION_STATES.VALID]: '1px solid #000',
  [EQUATION_STATES.INVALID]: '4px solid #fa0',
  [EQUATION_STATES.ERROR]: '4px solid #f00',
  undefined: '1px solid #ccc',
  null: '1px solid #ccc',
};

function checkMathjsonToExcel(mathJson: Expression, varMap: VarMapping = {}): boolean {
  try {
    mathjsonToExcel(mathJson, varMap);
    return true;
  } catch {
    return false;
  }
}


interface EquationLineProps {
  id: string;
  equation: string;
  variableList: VariableItem[];
  onEquInput: (val: string) => void;
  onNewLineRequested: () => void;
  onDeleteLine: () => void;
  onFocus: () => void;
}

const EquationLine = memo<EquationLineProps>(function EquationLine({
  id,
  equation,
  variableList,

  // Listeners
  onEquInput,
  onNewLineRequested,
  onDeleteLine,
  onFocus,
}) {
  //////////////////////////////
  // Stage 1: Setup variables //
  //////////////////////////////

  const latexMathfieldRef = useRef<MathfieldElement | null>(null);

  // Equation verification
  const [inputEquationState, setInputEquationState] = useState<EQUATION_STATES>(EQUATION_STATES.VALID);

  // Missing variables tracking
  const [missingLatexVars, setMissingLatexVars] = useState<string[]>([]);

  // 'Copy to Excel' tooltip visibility
  const [showCopiedFormulaTooltip, setCopiedFormulaTooltip] = useState<boolean>(false);

  // Drag-and-drop integration
  // NOTE: useSortable causes re-renders during drag due to transform/transition changes
  // This is expected dnd-kit behavior and necessary for smooth drag visual feedback
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  ///////////////////////////////////
  // Stage 2: Setup logic on mount //
  ///////////////////////////////////

  // Setup the mathfield element on mount
  // Source: https://mathlive.io/mathfield/lifecycle/#-attachedmounted
  useEffect(() => {
    if (!latexMathfieldRef.current) return;
    const mf = latexMathfieldRef.current;

    // Keep relevant default items for equation editing
    const defaultMenuItems = mf.menuItems.filter(item =>
      !!item && 'id' in item && item.id !== undefined &&
      ['cut', 'copy', 'paste', 'select-all'].includes(item.id)
    );

    // Compile final menu for equation editor
    const insertCopyImageIndex = defaultMenuItems.findIndex(item =>
      !!item && 'id' in item && item.id !== undefined && item.id === 'paste'
    );

    // Add new menu item to allow copying of LaTeX rendered image
    mf.menuItems = [
      ...defaultMenuItems.slice(0, insertCopyImageIndex),
      {
        id: 'copy-image',
        label: 'Copy Image',
        onMenuSelect: async () => {
          const latex = encodeURIComponent(mf.getValue('latex-unstyled'));
            const url = `https://latex.codecogs.com/png.image?\\large&space;\\dpi{300}&space;${latex}`;

            try {
              const res = await fetch(url);
              const blob = await res.blob();
              // NOTE: This can throw an error if the document if unfocused
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            } catch (err) {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.error('Failed to copy LaTeX image:', err);
              }
              alert('Failed to copy LaTeX image render, please try again!');
            }
        },
      },
      ...defaultMenuItems.slice(insertCopyImageIndex),
    ];

    // Listener to add a new line when pressing Enter/Return
    function addNewLine(evt: InputEvent) {
      if (evt.data === 'insertLineBreak') {
        evt.preventDefault();
        onNewLineRequested();
      }
    }

    // Listener to track focus on this mathfield
    function handleFocus() {
      onFocus();
    }

    // Add necessary event listeners
    mf.addEventListener('beforeinput', addNewLine);
    mf.addEventListener('focusin', handleFocus);

    // Grab focus to the element in case the user has created a new equation via Enter/Return
    mf.focus();

    // Remember to remove the listeners, especially since dev mode can reload the same webpage multiple times
    return () => {
      mf.removeEventListener('beforeinput', addNewLine);
      mf.removeEventListener('focusin', handleFocus);
    };
    // NOTE: We don't expect onNewLineRequested or onFocus to change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latexMathfieldRef]);

  // Task 1: Re-render the equation input border based on content validity
  // Task 2: Update the list of missing variables (in case the variables list changes)
  useEffect(() => {
    if (!latexMathfieldRef.current) return;
    const mf = latexMathfieldRef.current;

    // Extract the main body of the equation to allow the user to type f(x) = ... and limits
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [eqFuncDefinition, eqMainBody, eqLimits] = extractEquationParts(mf.getValue('latex-unstyled'));

    // Extract missing variables from main body of equation
    const extractedLatexVars = extractLatexVariables(eqMainBody);
    const definedLatexVars = variableList.map(_var => _var.latexVar);
    setMissingLatexVars(extractedLatexVars.filter(_foundVar => !definedLatexVars.includes(_foundVar)));

    // Check if the equation main body has a valid MathJSON expression, otherwise prevent further processing
    const boxedExpression = MathfieldElement.computeEngine!.parse(eqMainBody, { canonical: true });
    const isExprValid = boxedExpression.isValid;
    if (!isExprValid) {
      setInputEquationState(EQUATION_STATES.INVALID);
      return;
    }

    // Check if the converted MathJSON expression can be converted to an Excel formula, otherwise prevent further processing
    //   Case 1: There's an invalid expression that's intentionally not implemented
    //   Case 2: There's an invalid expression that needs to be implemented
    const canProcessEqu = checkMathjsonToExcel(boxedExpression.json);
    if (!canProcessEqu) {
      setInputEquationState(EQUATION_STATES.ERROR);
      return;
    }

    // Assume that the equation is fine and render a default border
    setInputEquationState(EQUATION_STATES.VALID);
  }, [equation, variableList]);

  // Apply visual styling to equation parts using shadow DOM manipulation
  // This colors the LHS (before equals) and limits (after comma) gray without mutating LaTeX
  // Uses MutationObserver to automatically re-apply styles whenever MathLive re-renders its shadow DOM
  useEffect(() => {
    if (!latexMathfieldRef.current) return;
    const mf = latexMathfieldRef.current;
    if (!mf.shadowRoot) return;

    // Styling function that applies gray color to specific equation parts
    const applyStylesToMathfield = () => {
      try {
        const charIndex = parseMathfieldDOM(mf);
        clearStyles(charIndex);

        // Find markers at depth 0 (top-level, not in subscripts/superscripts)
        const equalsSign = charIndex.find(item => item.char === '=' && item.depth === 0);
        const firstComma = charIndex.find(item => item.char === ',' && item.depth === 0);

        // Color LHS (everything before equals sign) gray
        if (equalsSign) {
          applyStyleToRange(charIndex, 0, equalsSign.index, { color: '#6b7280' });
          equalsSign.element.style.color = '#6b7280';
        }

        // Color limits (everything after first comma) gray
        if (firstComma) {
          firstComma.element.style.color = '#6b7280';
          applyStyleToRange(charIndex, firstComma.index + 1, charIndex.length, { color: '#6b7280' });
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Failed to apply equation styling:', err);
        }
      }
    };

    // Track pending animation frame to debounce rapid DOM mutations
    let pendingRaf: number | undefined;
    const scheduleStyleApplication = () => {
      // Cancel any pending style application
      if (pendingRaf !== undefined) cancelAnimationFrame(pendingRaf);
      // Schedule new style application for next frame
      pendingRaf = requestAnimationFrame(applyStylesToMathfield);
    };

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

    // Cleanup function
    return () => {
      if (pendingRaf !== undefined) cancelAnimationFrame(pendingRaf);
      observer.disconnect();
    };
  }, [equation]);

  //////////////////////////////////////////
  // Stage 3: Conditional logic on render //
  //////////////////////////////////////////

  ///////////////////////////////
  // Stage 4: Render component //
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
      className="flex flex-col"
    >
      <div className="flex w-full flex-row items-center my-[2px]">
        <button
          {...attributes}
          {...listeners}
          tabIndex={-1}
          className="mr-2 cursor-grab rounded border border-gray-400 py-2 hover:bg-gray-200 active:cursor-grabbing"
        >
          <FontAwesomeIcon
            icon={faGripVertical}
            size="lg"
            style={{ color: 'gray' }}
          />
        </button>

        <math-field
          id={`mathfield-${id}`}
          ref={latexMathfieldRef}
          // script-depth={5}
          className="min-w-0 flex-1"
          style={{
            fontSize: '1.5rem',
            border: MF_BORDER_STYLES[inputEquationState],
            borderRadius: '0.25rem',
          }}
          onInput={(event: FormEvent<MathfieldElement>) => {
            const mf = event.target as MathfieldElement;
            onEquInput(mf.getValue('latex-unstyled'));
          }}
        >
          {equation}
        </math-field>

        <div className="flex flex-shrink-0 gap-2 px-2">
          <div className="group relative">
            <button
              disabled={!MathfieldElement.computeEngine || equation.length == 0 || inputEquationState != EQUATION_STATES.VALID}
              onClick={async () => {
                if (!latexMathfieldRef.current) return;
                const mf = latexMathfieldRef.current;

                // Extract the main body of the equation to allow the user to type f(x) = ... and limits
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [eqFuncDefinition, eqMainBody, eqLimits] = extractEquationParts(mf.getValue('latex-unstyled'));
                const boxedExpression = MathfieldElement.computeEngine!.parse(eqMainBody, { canonical: true });

                // Create the variable map to convert MathJSON variables to Excel cell references
                const variableMap = variableList.reduce((acc, entry) => {
                  if (entry.latexVar) {
                    const mjsonVar = MathfieldElement.computeEngine!.parse(entry.latexVar.trim());
                    acc[mjsonVar.json.toString()] = entry.excelVar.trim();
                  }
                  return acc;
                }, {} as VarMapping);

                // Generate the Excel Formula and copy it to the clipboard
                const excelFormula = mathjsonToExcel(boxedExpression.json, variableMap);

                try {
                  // NOTE: This can throw an error if the document if unfocused
                  await navigator.clipboard.writeText(excelFormula);
                } catch (err) {
                  if (process.env.NODE_ENV === 'development') {
                    // eslint-disable-next-line no-console
                    console.error('Failed to copy Excel formula:', err);
                  }
                  alert('Failed to copy Excel formula, please try again!');
                  return;
                }

                // Show a tooltip saying that the copy action was successful
                setCopiedFormulaTooltip(true);
                setTimeout(() => setCopiedFormulaTooltip(false), 1000);
              }}
              className="rounded border p-2 hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faFileExcel} />
            </button>

            <span
              className="absolute right-full top-1/2 mr-2 hidden -translate-y-1/2 rounded bg-gray-700 px-2 py-1 text-xs text-white shadow group-hover:block"
            >
              {!showCopiedFormulaTooltip ? 'Copy Excel Formula' : 'Copied!'}
            </span>
          </div>

          <button
            onClick={onDeleteLine}
            className="rounded border bg-red-100 p-2 text-red-700 hover:bg-red-200"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        </div>
      </div>

      {missingLatexVars.length > 0 && <div className="flex w-full flex-row items-center gap-1 my-[2px]">
        <math-field
          read-only
          style={{
            display: 'inline-block',
            fontSize: '1.2rem',
            background: 'none',
          }}
        >
          {'\\text{Missing:}'}
        </math-field>

        {missingLatexVars.map((_var, idx) => (
          <math-field
            key={idx}
            read-only
            className="border"
            style={{
              display: 'inline-block',
              fontSize: '1.2rem',
            }}
          >
            {_var}
          </math-field>
        ))}
      </div>}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when only irrelevant fields change
  // Return true if props are equal (component should NOT re-render)
  // Note: We intentionally skip comparing callbacks to avoid re-renders from inline functions

  // Check if core data changed
  if (
    prevProps.id !== nextProps.id ||
    prevProps.equation !== nextProps.equation
  ) {
    return false; // Core data changed, must re-render
  }

  // Deep comparison of variableList - only compare latexVar and excelVar
  // These are the only fields that affect equation validation
  // Filter out empty variables since they don't affect equation validation
  const prevNonEmptyVars = prevProps.variableList.filter(v => v.latexVar.trim() !== '');
  const nextNonEmptyVars = nextProps.variableList.filter(v => v.latexVar.trim() !== '');

  if (prevNonEmptyVars.length !== nextNonEmptyVars.length) {
    return false;
  }

  for (let i = 0; i < prevNonEmptyVars.length; i++) {
    if (
      prevNonEmptyVars[i].latexVar !== nextNonEmptyVars[i].latexVar ||
      prevNonEmptyVars[i].excelVar !== nextNonEmptyVars[i].excelVar
    ) {
      return false; // Variables changed, must re-render
    }
  }

  return true; // All relevant props are equal, skip re-render
});

export default EquationLine;
