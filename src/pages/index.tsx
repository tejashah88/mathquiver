import "mathlive/fonts.css";

import { useState } from "react";
import { nanoid } from "nanoid";
import ReactMarkdown from "react-markdown";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';

import EquationLine from "../components/EquationLine";
import VariableLine from "../components/VariableLine";

export default function Home() {
  const [equations, setEquations] = useState([{ id: nanoid(), latex: "" }]);
  const [variables, setVariables] = useState([
    { id: nanoid(), variable: "x", excelRef: "A1" },
    { id: nanoid(), variable: "y", excelRef: "B2" },
  ]);

  const [helpOpen, setHelpOpen] = useState(false);

  const addEquation = () =>
    setEquations((prev) => [...prev, { id: nanoid(), latex: "" }]);

  const addVariable = () =>
    setVariables((prev) => [
      ...prev,
      { id: nanoid(), variable: "", excelRef: "" },
    ]);

  const helpMarkdown = `
# Equation Manager Help

- **Equations Panel**: Enter LaTeX equations.
- **Variables Panel**: Map variables to Excel cell references.
- Use the copy buttons to copy LaTeX or PNG.
- Delete with the red **X**.
`;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Equations Panel */}
      <div className="flex-1 md:flex-[3_1_70%] md:h-auto h-1/2 p-4 border-b md:border-b-0 md:border-r border-gray-300 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Equations</h2>
          <button
            onClick={addEquation}
            className="px-3 py-1 border rounded hover:bg-gray-200 text-xl font-bold"
          >
            +
          </button>
        </div>

        {equations.map((eq, idx) => (
          <EquationLine
            key={eq.id}
            index={idx}
            value={eq.latex}
            onMathChange={(latex) => {
              setEquations((prev) =>
                prev.map((e) => (e.id === eq.id ? { ...e, latex } : e))
              );
            }}
            onDelete={() =>
              setEquations((prev) => prev.filter((e) => e.id !== eq.id))
            }
          />
        ))}
      </div>

      {/* Variables Panel */}
      <div className="w-full md:flex-[1_1_30%] md:h-auto h-1/2 p-4 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-300 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Variables</h2>
          <button
            onClick={addVariable}
            className="px-3 py-1 border rounded hover:bg-gray-200 text-xl font-bold"
          >
            +
          </button>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Variable</th>
              <th className="border p-2 text-left">Starting Excel Variable</th>
            </tr>
          </thead>
          <tbody>
            {variables.map(v => (
              <VariableLine
                key={v.id}
                variable={v.variable}
                excelRef={v.excelRef}
                count={0}
                onChange={(val) =>
                  setVariables((prev) =>
                    prev.map((varItem) =>
                      varItem.id === v.id ? { ...varItem, excelRef: val } : varItem
                    )
                  )
                }
                onDelete={() =>
                  setVariables((prev) => prev.filter((varItem) => varItem.id !== v.id))
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Help Button */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
      >
        <FontAwesomeIcon icon={faQuestion} />
      </button>

      {/* Help Modal */}
      {helpOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full shadow-lg">
            <div className="prose max-w-none">
              <ReactMarkdown>{helpMarkdown}</ReactMarkdown>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
