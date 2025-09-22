'use client';

import 'mathlive/fonts.css';

import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

import Markdown from 'react-markdown';

import { BoxedExpression } from '@cortex-js/compute-engine';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faPlus, faX } from '@fortawesome/free-solid-svg-icons';

import EquationLine from '@/components/EquationLine';
import VariableLine from '@/components/VariableLine';
import { mathjsonToExcel } from '@/logic/mj-excel';
import { VarMapping } from '@/logic/types';
import { MathfieldElement } from 'mathlive';


export default function Home() {
  const [isMathliveLoaded, setMathliveLoaded] = useState(false);
  const [enableCompactView, setEnableCompactView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [equations, setEquations] = useState([
    { id: nanoid(), latex: '' }
  ]);

  const [variables, setVariables] = useState([
    { id: nanoid(), latexVar: '', excelVar: '' },
  ]);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpContent, setHelpContent] = useState('');

  // Setup a resize handler for dynamic responsiveness for custom breakpoints (desktop or tablet mode)
  useEffect(() => {
    const handleResize = () => setEnableCompactView(
      window.innerWidth < (window.screen.availWidth * 0.55) || window.innerWidth <= 768
    );
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Setup a mobile detection handler to recommend activating desktop mode
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(ua);
      // Largest mobile width according to chromium mobile debug viewer
      const isSmallScreen = window.innerWidth <= 425;
      setIsMobile(isMobileUA && isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  // Load the help content from a markdown file for the menu
  // NOTE: Since this will be a static-rendered site, all locally loaded files should reside in 'public/'
  useEffect(() => {
    fetch('./markdown/help.md')
      .then((res) => res.text())
      .then((text) => setHelpContent(text));
  }, []);


  // Properly load mathlive to prevent hydration issues with Next.js's developer mode
  // Source: https://github.com/RaksaOC/KOMPLEX/blob/78fc3b10381edbc99513deaf476a5c45d49092e7/apps/web/src/components/common/Editor.tsx#L123
  useEffect(() => {
    // Initialize MathLive when component mounts
    if (typeof window !== 'undefined') {
      import('mathlive').then((mathlive) => {
        // MathLive is now available globally
        mathlive.MathfieldElement.soundsDirectory = null;

        setMathliveLoaded(true);
        console.log(`MathLive version ${mathlive.version.mathlive} loaded and configured!`);
      }).catch(console.error);
    }
  }, []);


  if (!isMathliveLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 h-screen overflow-hidden">
        <h1 className="text-3xl">Loading...</h1>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex text-center items-center justify-center bg-gray-100 h-screen overflow-hidden">
        <h1 className="text-xl">
          Change to &quot;Desktop site&quot; mode<br/>
          for the best viewing experience.
        </h1>
      </div>
    );
  }


  return (
    <div className={`flex bg-gray-100 h-dvh overflow-y-hidden ${enableCompactView ? 'flex-col' : 'md:flex-row'}`}>
      {/* Equations Panel */}
      <div
        className={`flex flex-col p-4 border-gray-300 border-b overflow-y-auto ${
          enableCompactView
            ? 'h-2/3'
            : 'md:flex-[3_1_70%] md:h-auto md:border-b-0 md:border-r'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Equations</h2>
          <button
            onClick={() => {
              setEquations((prev) => [
                ...prev,
                { id: nanoid(), latex: '' }
              ]);
            }}
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
              setEquations(
                (prev) => prev.map(
                  (line) => (line.id === eq.id ? { ...line, latex } : line)
                )
              );
            }}
            onCopyExcel={async (mfExpression: BoxedExpression) => {
              const ce = MathfieldElement.computeEngine;
              if (!ce) {
                alert('Failed to load compute engine!');
                return;
              }

              const variableMap = variables.reduce((acc, entry) => {
                if (entry.latexVar) {
                  const mjsonVar = ce.parse(entry.latexVar.trim());
                  acc[mjsonVar.json.toString()] = entry.excelVar.trim();
                }
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
        className={`flex flex-col p-4 bg-gray-50 border-gray-300 border-t overflow-y-auto ${
          enableCompactView
            ? 'h-1/3'
            : 'md:flex-[1_1_30%] min-w-[350px] md:h-auto md:border-t-0 md:border-l'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Variables</h2>
          <button
            onClick={() => {
              setVariables((prev) => [
                ...prev,
                { id: nanoid(), latexVar: '', excelVar: '' },
              ]);
            }}
            className="p-2 border rounded hover:bg-gray-200 font-bold"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        <div className="w-full border border-gray-700">
          <div className="grid grid-cols-[1fr_2fr_auto] bg-gray-200 font-bold">
            <div className="p-2 border-r border-gray-700 text-sm text-left">Variable</div>
            <div className="p-2 text-sm text-left">Excel Reference</div>
          </div>

          {variables.map((v) => (
            <VariableLine
              key={v.id}
              latexVar={v.latexVar}
              excelVar={v.excelVar}
              onVarInput={(val) => {
                setVariables(
                  (prev) => prev.map(
                    (line) => line.id === v.id ? { ...line, latexVar: val } : line
                  )
                );
              }}
              onExcelInput={(val) => {
                setVariables(
                  (prev) => prev.map(
                    (line) => line.id === v.id ? { ...line, excelVar: val } : line
                  )
                );
              }}
              onDelete={() => {
                setEquations((prev) => prev.filter((line) => line.id !== v.id));
              }}
            />
          ))}
        </div>
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
          <div className="bg-white border p-6 rounded-md max-w-3xl w-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Main Menu</h2>
              <button
                onClick={() => setHelpOpen(false)}
                className="border p-2 text-red-700 hover:bg-gray-100"
              >
                <FontAwesomeIcon icon={faX} />
              </button>
            </div>

            {/* Help Section */}
            <div className="border p-6 mb-6 prose max-w-none text-black markdown-content">
              <Markdown>{helpContent}</Markdown>
            </div>

            {/* Import/Export buttons */}
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

                  const formattedTimestamp = format(new Date(), 'yyyy_MM_dd_hh_mm_a');
                  saveAs(blob, `mathquiver-ws-${formattedTimestamp}.json`);

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
