import test from 'node:test';
import assert from 'node:assert/strict';
import { fittedTrend, marketSlices } from '../src/executive-data.mjs';

test('fitted trend is a least-squares fit over the selected months only', () => {
  const rows = fittedTrend([{ count: 10 }, { count: 20 }, { count: 30 }], 'count');
  assert.deepEqual(rows.map(row => row.fitted), [10, 20, 30]);
  const noisy = fittedTrend([{ count: 12 }, { count: 16 }, { count: 32 }], 'count');
  assert.deepEqual(noisy.map(row => row.fitted), [10, 20, 30]);
  assert.equal(noisy.length, 3);
});
test('no fitted line is invented for a single or incomplete observation window', () => {
  assert.equal(fittedTrend([{ count: 7 }], 'count')[0].fitted, null);
  assert.deepEqual(fittedTrend([{ count: 3 }, { count: null }, { count: 8 }], 'count').map(row => row.fitted), [null, null, null]);
});
test('donut grouping preserves the selected denominator and drilldown IDs', () => {
  const rows = [{ id: 'US', name: 'United States', count: 50 }, { id: 'GB', name: 'United Kingdom', count: 30 }, { id: 'CA', name: 'Canada', count: 15 }, { id: 'IN', name: 'India', count: 5 }];
  const result = marketSlices(rows, 'count', 2);
  assert.equal(result.reduce((sum, row) => sum + row.value, 0), 100);
  assert.equal(result.at(-1).value, 20);
  assert.deepEqual(result.at(-1).ids, ['CA', 'IN']);
  assert.deepEqual(marketSlices([{ count: 0 }], 'count'), []);
  assert.deepEqual(marketSlices([...rows, { count: null }], 'count'), []);
});
