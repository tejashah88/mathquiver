const MAX_ROW = 1_048_576;
const MAX_COL = 16_384;  // corresponds to “XFD”
const CELL_REGEX = /^\$?([A-Z]{1,3})\$?([1-9][0-9]{0,6})$/;


// Author: ChatGPT as of 10/08/2025
function colLettersToNumber(letters: string) {
    let num = 0;
    for (const ch of letters) {
        // Expect ch in A–Z
        const v = ch.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

        if (v < 1 || v > 26) throw new Error(`Invalid column letter '${ch}'`);
        num = num * 26 + v;
    }

    return num;
}


// Author: ChatGPT as of 10/08/2025
function parseCellRef(cellRef: string) {
    const m = cellRef.match(CELL_REGEX);
    if (!m) {
        throw new Error(`Invalid cell address syntax: '${cellRef}'`);
    }

    const colLetters = m[1];
    const rowDigits = m[2];

    const colAbs = cellRef.startsWith('$');
    // detect if there is a '$' just before the row part
    // compute index of row part in the original string
    const rowStart = cellRef.indexOf(rowDigits);
    const rowAbs = (rowStart > 0 && cellRef[rowStart - 1] === '$');

    const colNum = colLettersToNumber(colLetters);
    const rowNum = parseInt(rowDigits, 10);

    if (colNum < 1 || colNum > MAX_COL) {
        throw new Error(`Column out of bounds: '${colLetters}' → ${colNum}`);
    }
    if (rowNum < 1 || rowNum > MAX_ROW) {
        throw new Error(`Row out of bounds: ${rowNum}`);
    }

    return {
        row: rowNum,
        col: colNum,
        isRowAbsolute: rowAbs,
        isColAbsolute: colAbs
    };
}

function checkCellRef(cellRef: string): boolean {
    try {
        parseCellRef(cellRef);
        return true;
    } catch {
        return false;
    }
}


// Author: ChatGPT: 10/08/2025
function cycleCellRef(cellRef: string) {
    const match = cellRef.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
    if (!match) return cellRef;

    const [, currColLock, col, currRowLock, row] = match;
    const anchorStates = [
        [false, false],
        [true, true],
        [false, true],
        [true, false],
    ];

    const currentStateIdx = anchorStates.findIndex(([colLock, rowLock]) => {
        return (currColLock == '$') == colLock && (currRowLock == '$') == rowLock;
    });

    const nextState = anchorStates[(currentStateIdx + 1) % anchorStates.length];
    const [nextColLock, nextRowLock] = nextState;

    return `${nextColLock ? '$' : ''}${col}${nextRowLock ? '$' : ''}${row}`;
}

export { parseCellRef, checkCellRef, cycleCellRef };
