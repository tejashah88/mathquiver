import { cycleCellRef, parseCellRef } from '@/logic/excel-cell-ref';


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
    ['A1', '$A$1'],
    ['$A$1', 'A$1'],
    ['A$1', '$A1'],
    ['$A1', 'A1'],
  ];

  test.each(validCases)('valid: %s => %s', (oldRef, newRef) => {
    const result = cycleCellRef(oldRef);
    expect(result).toEqual(newRef);
  });
});
