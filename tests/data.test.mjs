import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HEADERS, METRICS, parseData, monthlySeries, summarize, selectionData, change, toCSV } from '../src/data.mjs';

const header = HEADERS.join(',');
const record = (id = 'US', year = 2020, month = 1, txn = 100, stock = 50) => [id, id === 'US' ? 'United States' : 'Canada', year, month, txn, stock + 20, stock + 10, stock].join(',');
const parse = (...rows) => parseData([header, ...rows].join('\n'));

test('sums transactions across months but uses last-month snapshots for stock metrics', () => {
  const data = parse(record('US', 2020, 1, 100, 50), record('US', 2020, 2, 120, 60), record('CA', 2020, 1, 200, 80), record('CA', 2020, 2, 250, 90));
  const result = summarize(monthlySeries(data.rows, ['US', 'CA'], 2020, 1, 2));
  assert.deepEqual(result, { 'Txn-count': 670, 'Total Active Plastic': 190, 'Total Active Basic': 170, 'Active Accounts': 150 });
});
test('year-over-year uses the exact same market and month range', () => {
  const data = parse(record('US', 2019, 1, 999), record('US', 2019, 2, 100), record('US', 2020, 1, 9999), record('US', 2020, 2, 120), record('CA', 2020, 2, 777));
  const model = selectionData(data, ['US'], 2020, 2, 2);
  assert.equal(model.summary['Txn-count'], 120);
  assert.equal(model.prior['Txn-count'], 100);
  assert.ok(Math.abs(model.markets[0].growth - 20) < .00001);
});
test('missing records yield gaps, not zero-filled or partial totals', () => {
  const data = parse(record('US', 2020, 1), record('CA', 2020, 1), record('US', 2020, 2));
  const series = monthlySeries(data.rows, ['US', 'CA'], 2020, 1, 2);
  assert.equal(series[1]['Txn-count'], null);
  assert.equal(summarize(series)['Active Accounts'], null);
  assert.equal(summarize(series)['Txn-count'], null);
  const finalComplete = parse(record('US', 2020, 2), record('CA', 2020, 2));
  const result = summarize(monthlySeries(finalComplete.rows, ['US', 'CA'], 2020, 1, 2));
  assert.equal(result['Txn-count'], null);
  assert.equal(result['Active Accounts'], 100);
});
test('zero is valid data; zero/missing baselines have no percentage growth', () => {
  const data = parse(record('US', 2020, 1, 0, 0));
  assert.equal(summarize(monthlySeries(data.rows, ['US'], 2020, 1, 1))['Txn-count'], 0);
  assert.equal(change(100, 0), null);
  assert.equal(change(null, 100), null);
  assert.equal(change(0, 100), -100);
});
test('first year and empty selection have no invented baseline', () => {
  const data = parse(record('US', 2019, 1));
  const model = selectionData(data, ['US'], 2019, 1, 1);
  assert.equal(model.prior['Txn-count'], null);
  assert.equal(model.markets[0].growth, null);
  for (const metric of METRICS) assert.equal(summarize(monthlySeries(data.rows, [], 2019, 1, 1))[metric.key], null);
});
test('supports BOM, CRLF, quoted market names and exact CSV roundtrip', () => {
  const csv = `\uFEFF${header}\r\nUS,"United States, test",2020,1,1234,2345,1234,1000\r\n`;
  const data = parseData(csv);
  assert.equal(data.rows[0]['Market-name'], 'United States, test');
  assert.deepEqual(parseData(toCSV(data.rows)).rows, data.rows);
});
test('rejects duplicates, renamed IDs, invalid numbers, months and schemas', () => {
  assert.throws(() => parse(record(), record()), /duplicate/);
  assert.throws(() => parse(record(), record('US', 2020, 2).replace('United States', 'Other name')), /inconsistent/);
  for (const value of ['-1', '1.2', 'NaN', '', '9007199254740992', '1e6']) assert.throws(() => parse(record('US', 2020, 1, value)), /whole number/);
  assert.throws(() => parse(record('US', 2020, 13)), /invalid year or month/);
  assert.throws(() => parse(record('US', 2099, 1)), /future/);
  assert.throws(() => parseData('Market-id,Year\nUS,2020'), /eight columns/);
});
test('spreadsheet export neutralizes market-name formula injection', () => {
  const data = parse(record().replace('United States', '=1+1'));
  assert.match(toCSV(data.rows), /'=1\+1/);
});
test('published fixture covers all 14 markets monthly from 2019 to its metadata period', () => {
  const data = parseData(readFileSync('public/data/markets.csv', 'utf8'));
  const metadata = JSON.parse(readFileSync('public/data/metadata.json', 'utf8'));
  assert.equal(data.markets.length, 14);
  assert.equal(data.missing.length, 0);
  assert.equal(data.rows.length, ((data.latest.year - 2019) * 12 + data.latest.month) * 14);
  assert.equal(metadata.through, `${data.latest.year}-${String(data.latest.month).padStart(2, '0')}`);
});
