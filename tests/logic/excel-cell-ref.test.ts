import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCellRef } from '@/logic/excel-cell-ref';

const validCases = [
  'A1',
  '$A$1',
  'XFD1048576',
  'AZ100',
  '$C10',
  'C$10'
];

const invalidCases = [
  'AAA999999',
  'B0',
  '1A',
  'A1048577'
];

test('parseCellRef: valid inputs', () => {
  for (const t of validCases) {
    const result = parseCellRef(t);
    assert.ok(result, `Expected a valid parse for ${t}`);
  }
});

test('parseCellRef: invalid inputs', () => {
  for (const t of invalidCases) {
    assert.throws(() => parseCellRef(t), Error, `Expected parseCellRef(${t}) to throw`);
  }
});
