import 'mathlive/fonts.css';

import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { saveAs } from 'file-saver';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faPlus } from '@fortawesome/free-solid-svg-icons';

import EquationLine from '../components/EquationLine';
import VariableLine from '../components/VariableLine';
import { mathjsonToExcel } from '@/logic/mj-excel';
import { BoxedExpression } from '@cortex-js/compute-engine';
import { VarMapping } from '@/logic/types';

export default function Home() {
  const [isMathliveLoaded, setMathliveLoaded] = useState(false);

  const [equations, setEquations] = useState([
    { id: nanoid(), latex: '' }
  ]);

  const [variables, setVariables] = useState([
    { id: nanoid(), latexVar: '', excelVar: '' },
  ]);

  const [helpOpen, setHelpOpen] = useState(false);

  const [enableCompactView, setEnableCompactView] = useState(false);

  useEffect(() => {
    const handleResize = () => setEnableCompactView(window.innerWidth < (window.screen.availWidth * 0.55));
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Properly load mathlive to prevent hydration issues with dev mode
  // Source: https://github.com/RaksaOC/KOMPLEX/blob/78fc3b10381edbc99513deaf476a5c45d49092e7/apps/web/src/components/common/Editor.tsx#L123
  useEffect(() => {
    setMathliveLoaded(true);

    // Initialize MathLive when component mounts
    if (typeof window !== 'undefined') {
      import('mathlive').then((mathlive) => {
        // MathLive is now available globally
        mathlive.MathfieldElement.soundsDirectory = null;

        console.log(`MathLive version ${mathlive.version.mathlive} loaded and configured!`);
      }).catch(console.error);
    }
  }, []);

  const addEquation = () =>
    setEquations((prev) => [...prev, { id: nanoid(), latex: '' }]);

  const addVariable = () =>
    setVariables((prev) => [
      ...prev,
      { id: nanoid(), latexVar: '', excelVar: '' },
    ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isMathliveLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 h-screen overflow-hidden">
        <h1 className="text-3xl">Loading...</h1>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-gray-100 h-screen overflow-hidden ${enableCompactView ? '' : 'md:flex-row'}`}>
      {/* Equations Panel */}
      <div
        className={`p-4 border-gray-300 border-b overflow-y-auto overscroll-contain ${
          enableCompactView
            ? 'h-2/3'
            : 'md:flex-[3_1_70%] md:h-auto md:border-b-0 md:border-r'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Equations</h2>
          <button
            onClick={addEquation}
            className="p-2 border rounded hover:bg-gray-200 font-bold"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        {equations.map((eq, idx) => (
          <EquationLine
            index={idx}
            key={eq.id}
            equation={eq.latex}
            onUserInput={(latex) => {
              setEquations((prev) => prev.map((line) => (line.id === eq.id ? { ...line, latex } : line)));
            }}
            onCopyExcel={async (mfExpression: BoxedExpression) => {
              const variableMap = variables.reduce((acc, entry) => {
                if (entry.latexVar)
                  acc[entry.latexVar] = entry.excelVar.trim();
                return acc;
              }, {} as VarMapping);
              const excelFormula = mathjsonToExcel(mfExpression.json, variableMap);

              await navigator.clipboard.writeText(excelFormula);
            }}
            onDeleteLine={() => {
              setEquations((prev) => prev.filter((line) => line.id !== eq.id));
            }}
          />
        ))}
      </div>

      {/* Variables Panel */}
      <div
        className={`p-4 bg-gray-50 border-gray-300 border-t overflow-y-auto ${
          enableCompactView
            ? 'h-1/3'
            : 'md:flex-[1_1_30%] min-w-[350px] md:h-auto md:border-t-0 md:border-l'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Variables</h2>
          <button
            onClick={addVariable}
            className="p-2 border rounded hover:bg-gray-200 font-bold"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        <table className="w-full text-sm min-w-0">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Variable</th>
              <th className="border p-2 text-left">Excel Reference</th>
            </tr>
          </thead>

          <tbody>
            {variables.map((v) => (
              <VariableLine
                key={v.id}
                latexVar={v.latexVar}
                excelVar={v.excelVar}
                onVarInput={(val) => {
                  setVariables((prev) => prev.map((line) => line.id === v.id ? { ...line, latexVar: val } : line));
                }}
                onExcelInput={(val) => {
                  setVariables((prev) => prev.map((line) => line.id === v.id ? { ...line, excelVar: val } : line));
                }}
                onDelete={() =>
                  setVariables((prev) => prev.filter((line) => line.id !== v.id))
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Help Button */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded shadow-lg hover:bg-blue-700"
      >
        <FontAwesomeIcon icon={faBars} size="lg" />
      </button>

      {helpOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50/75 z-50">
          <div className="bg-white border p-6 rounded-md max-w-lg w-full shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Main Menu</h2>
              <button
                onClick={() => setHelpOpen(false)}
                className="border px-3 py-1 text-red-700 text-xl font-bold hover:bg-gray-100"
              >
                X
              </button>
            </div>

            {/* Help Section */}
            <div className="border p-6 text-center mb-6">
              <p className="text-lg font-medium">HELP Section</p>
              <p className="text-gray-500">(markdown)</p>
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="border px-6 py-2 hover:bg-gray-100"
              >
                Import...
              </button>

              <button
                onClick={() => {
                  const data = { equations, variables };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  saveAs(blob, `mq-workspace-${timestamp}.json`);

                  setHelpOpen(false);
                }}
                className="border px-6 py-2 hover:bg-gray-100"
              >
                Export...
              </button>

              <input
                type="file"
                accept="application/json"
                ref={fileInputRef}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const parsed = JSON.parse(reader.result as string);
                      setEquations(parsed.equations || []);
                      setVariables(parsed.variables || []);

                      setHelpOpen(false);
                    } catch (err) {
                      console.error('Invalid JSON file', err);
                    }
                  };

                  reader.readAsText(file);
                }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
