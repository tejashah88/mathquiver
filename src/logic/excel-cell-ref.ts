const MAX_ROW = 1_048_576;
const MAX_COL = 16_384;  // NOTE: corresponds to "XFD"

/**
* Regular expression pattern to parse Excel cell references
*
* Pattern breakdown:
* - `^` - Start of string (ensures we match from the beginning)
*
* - `\$?` - OPTIONAL dollar sign for absolute column reference
*   - `\$` - Literal dollar sign (escaped because $ is a regex special character)
*   - `?` - Makes it optional (0 or 1 occurrence)
*   - Example: "$A" has absolute column, "A" has relative column
*
* - `([A-Z]{1,3})` - REQUIRED Capture group 1: Column letters
*   - `[A-Z]` - Character class: any uppercase letter from A to Z
*   - `{1,3}` - Quantifier: exactly 1 to 3 characters
*   - Captures the column letter(s): "A", "Z", "AA", "XFD", etc.
*   - Excel columns range from A (1) to XFD (16,384)
*
* - `\$?` - OPTIONAL dollar sign for absolute row reference
*   - Same as column dollar sign, but appears before the row number
*   - Example: "A$1" has absolute row, "A1" has relative row
*
* - `([1-9][0-9]{0,6})` - REQUIRED Capture group 2: Row number
*   - `[1-9]` - First digit must be 1-9 (no leading zeros, no zero row)
*   - `[0-9]{0,6}` - Followed by 0 to 6 additional digits (0-9)
*   - Allows rows from 1 to 9,999,999 (Excel max is 1,048,576)
*   - Examples: "1", "42", "1048576"
*
* - `$` - End of string (ensures we match to the end)
*
* Valid Excel cell reference formats:
* - Relative: "A1", "B2", "XFD1048576"
* - Absolute column: "$A1", "$B2"
* - Absolute row: "A$1", "B$2"
* - Fully absolute: "$A$1", "$B$2"
* - Mixed references: "A$5", "$C10"
*
* Examples of what matches:
* - "A1" -> column: "A", row: "1" (both relative)
* - "$A1" -> column: "A" (absolute), row: "1" (relative)
* - "A$1" -> column: "A" (relative), row: "1" (absolute)
* - "$A$1" -> column: "A" (absolute), row: "1" (absolute)
* - "XFD1048576" -> column: "XFD", row: "1048576" (max cell)
* - "AA100" -> column: "AA", row: "100"
*
* Examples of what does NOT match:
* - "A0" -> INVALID (row must start with 1-9, not 0)
* - "a1" -> INVALID (column must be uppercase)
* - "1A" -> INVALID (wrong order: column must come before row)
* - "AAAA1" -> INVALID (column can be at most 3 letters)
* - "A" -> INVALID (missing row number)
* - "1" -> INVALID (missing column letter)
* - "$1" -> INVALID (missing column letter)
*/
const CELL_REGEX = /^(\$?)([A-Z]{1,3})(\$?)([1-9][0-9]{0,6})$/;


// Cell anchor cycling based on Excel [columnLock, rowLock]
const CELL_ANCHOR_STATES = [
  [false, false],
  [true, true],
  [false, true],
  [true, false],
];


// Math Expression (1-indexed):
// f(x) = letters[1] * 26 ^ (n-1) + letters[2] * 26 ^ (n-2) + ... + letters[n - 1] * 26 ^ (1) + letters[n] * 26 ^ (0)
export function columnLetterToNum(letters: string) {
  let colNum = 0;

  for (let i = 1; i <= letters.length; i++) {
    // NOTE: parseInt for base 36 is 0-9 + A-Z (case-insensitive); Assume that A starts at 1
    const alphaToNum = parseInt(letters[i - 1], 36) - 9;

    if (alphaToNum < 0 || isNaN(alphaToNum))
      throw new Error(`Invalid column letter '${letters[i - 1]}'`);

    colNum += alphaToNum * Math.pow(26, letters.length - i);
  }

  return colNum;
}


export function parseCellRef(cellRef: string) {
  const match = cellRef.match(CELL_REGEX);
  if (!match)
    throw new Error(`Invalid cell address syntax: '${cellRef}'`);

  // Extract cell parts
  const [, colLock, colLetters, rowLock, rowDigits] = match;

  // Convert string parts to numerical representations
  const colNum = columnLetterToNum(colLetters);
  const rowNum = parseInt(rowDigits, 10);

  if (colNum < 1 || colNum > MAX_COL)
    throw new Error(`Column out of bounds: '${colLetters}' -> ${colNum}`);

  if (rowNum < 1 || rowNum > MAX_ROW)
    throw new Error(`Row out of bounds: ${rowNum}`);

  return {
    row: rowNum,
    col: colNum,
    isRowAbsolute: !!rowLock,
    isColAbsolute: !!colLock,
  };
}


// Author: ChatGPT: 10/08/2025
export function cycleCellRef(cellRef: string) {
  const match = cellRef.match(CELL_REGEX);
  // If an invalid cell reference exists, return the original value
  if (!match) return cellRef;

  const [, currColLock, currCol, currRowLock, currRow] = match;

  // Get current cell anchor state
  const currStateIdx = CELL_ANCHOR_STATES.findIndex(([colLock, rowLock]) => {
    return (currColLock === '$') === colLock && (currRowLock === '$') === rowLock;
  });

  // Cycle to next cell anchor state
  const nextState = CELL_ANCHOR_STATES[(currStateIdx + 1) % CELL_ANCHOR_STATES.length];
  const [nextColLock, nextRowLock] = nextState;

  return `${nextColLock ? '$' : ''}${currCol}${nextRowLock ? '$' : ''}${currRow}`;
}
