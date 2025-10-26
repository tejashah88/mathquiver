import { columnLetterToNum, cycleCellRef, parseCellRef } from '@/logic/excel-cell-ref';


describe('Column Letter to Number Conversion', () => {
  const validCases: [string, number][] = [
    ['A', 1],
    ['S', 19],
    ['Z', 26],
    ['b', 2],
    ['q', 17],
    ['AA', 27],
    ['CT', 98],
    ['ZA', 677],
    ['ZZ', 702],
  ];

  const invalidCases = [
    '12',
    'A2',
    '!@#',
  ];

  test.each(validCases)('valid: %s => %s', (input, expected) => {
    const result = columnLetterToNum(input);
    expect(result).toEqual(expected);
  });

  test.each(invalidCases)('invalid: %s', (input) => {
    expect(() => columnLetterToNum(input)).toThrow();
  });
});


describe('Excel Cell Reference Parsing', () => {
  const validCases = [
    'A1',
    '$A$1',
    'XFD1048576',
    'AZ100',
    '$C10',
    'C$10',
    'AAA999999',
  ];

  const invalidCases = [
    'AAAA999999',
    'B0',
    '1A',
    'A1048577',
  ];

  test.each(validCases)('valid: %s', (cellRef) => {
    const result = parseCellRef(cellRef);
    expect(result).toBeTruthy();
  });

  test.each(invalidCases)('invalid: %s', (cellRef) => {
    expect(() => parseCellRef(cellRef)).toThrow();
  });
});


describe('Excel Cell Reference Cycling', () => {
  const validCases = [
    // Simple cases
    ['A1', '$A$1'],
    ['$A$1', 'A$1'],
    ['A$1', '$A1'],
    ['$A1', 'A1'],

    // Complex cases
    ['ZZ54', '$ZZ$54'],
    ['$ZZ$54', 'ZZ$54'],
    ['ZZ$54', '$ZZ54'],
    ['$ZZ54', 'ZZ54'],
  ];

  test.each(validCases)('valid: %s => %s', (oldRef, newRef) => {
    const result = cycleCellRef(oldRef);
    expect(result).toEqual(newRef);
  });
});
