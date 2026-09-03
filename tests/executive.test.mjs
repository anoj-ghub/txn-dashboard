import test from 'node:test';
import assert from 'node:assert/strict';
import { fittedTrend, marketSlices, executiveComparison, metricComparisons, comparisonExtent, normalizeComparison } from '../src/executive-data.mjs';

const fixture = () => ({
  latest: { year: 2026, month: 2 },
  markets: [{ id: 'US', name: 'United States' }, { id: 'CA', name: 'Canada' }],
  rows: Array.from({ length: 8 }, (_, index) => 2019 + index).flatMap(year => [1, 2].flatMap(month => ['US', 'CA'].map(id => ({
    'Market-id': id, 'Market-name': id === 'US' ? 'United States' : 'Canada', Year: year, Month: month,
    'Txn-count': (year - 2018) * 100 + month * 10 + (id === 'CA' ? 1000 : 0),
    'Total Active Plastic': (year - 2018) * 30 + month,
    'Total Active Basic': (year - 2018) * 20 + month,
    'Active Accounts': (year - 2018) * 10 + month,
  })))),
});

test('chosen baseline year uses matched months and markets for all four metrics', () => {
  const model = executiveComparison(fixture(), ['US'], 2026, 2, 2, '2021');
  assert.deepEqual(model.comparisons.map(reference => reference.year), [2021]);
  assert.equal(model.summary['Txn-count'], 820);
  assert.equal(model.prior['Txn-count'], 320);
  assert.equal(model.prior['Total Active Plastic'], 92);
  assert.equal(model.prior['Total Active Basic'], 62);
  assert.equal(model.prior['Active Accounts'], 32);
  assert.equal(model.markets[0].growth, (820 / 320 - 1) * 100);
});

test('all previous years stay separate and exclude the reporting year and later years', () => {
  const model = executiveComparison(fixture(), ['US', 'CA'], 2022, 1, 2, 'all');
  assert.deepEqual(model.comparisons.map(reference => reference.year), [2019, 2020, 2021]);
  assert.equal(model.comparisons[0].summary['Txn-count'], 2460);
  assert.equal(model.comparisons[0].summary['Active Accounts'], 24);
  assert.equal(model.prior['Txn-count'], null);
  const changes = metricComparisons(model, 'Active Accounts');
  assert.equal(changes.length, 3);
  assert.equal(changes[0].growth, (84 / 24 - 1) * 100);
  assert.equal(changes[2].growth, (84 / 64 - 1) * 100);
});

test('metric-specific comparisons never reuse transaction growth for card/account readouts', () => {
  const model = executiveComparison(fixture(), ['US'], 2026, 1, 2, '2021');
  assert.notEqual(metricComparisons(model, 'Txn-count')[0].growth, metricComparisons(model, 'Active Accounts')[0].growth);
  assert.equal(metricComparisons(model, 'Total Active Basic', 'US')[0].growth, (162 / 62 - 1) * 100);
});

test('incomplete later-year baselines do not truncate the selected reporting period', () => {
  const data = fixture();
  data.rows = data.rows.filter(row => !(row.Year === 2026 && row.Month === 2));
  const model = executiveComparison(data, ['US'], 2021, 1, 2, '2026');
  assert.equal(model.summary['Txn-count'], 630);
  assert.equal(model.comparisons[0].summary['Txn-count'], null);
  assert.equal(model.comparisons[0].summary['Active Accounts'], null);
  assert.equal(metricComparisons(model, 'Txn-count')[0].growth, null);
});

test('December selection retains monthly gaps but matches partial-year totals to the reported cutoff', () => {
  const data = fixture();
  const model = executiveComparison(data, ['US'], 2026, 1, 12, 'all');
  const reported = executiveComparison(data, ['US'], 2026, 1, 2, 'all');
  assert.equal(model.reportedEnd, 2);
  assert.equal(model.hasReportedMonths, true);
  assert.deepEqual(model.summary, reported.summary);
  assert.deepEqual(model.comparisons.map(row => row.summary), reported.comparisons.map(row => row.summary));
  assert.equal(model.series.length, 12);
  assert.equal(model.reportedSeries.length, 2);
  assert.equal(model.series[0]['Txn-count'], 810);
  assert.equal(model.series[1]['Txn-count'], 820);
  assert.equal(model.summary['Txn-count'], 1630);
  assert.equal(model.summary['Active Accounts'], 82);
  assert.ok(model.series.slice(2).every(row => row.pending && row['Txn-count'] === null && row['Active Accounts'] === null));
});

test('selecting only unreported months does not reuse earlier balances or produce comparisons', () => {
  const model = executiveComparison(fixture(), ['US'], 2026, 10, 12, '2021');
  assert.equal(model.hasReportedMonths, false);
  assert.equal(model.series.length, 3);
  assert.equal(model.reportedSeries.length, 0);
  assert.ok(Object.values(model.summary).every(value => value === null));
  assert.ok(Object.values(model.prior).every(value => value === null));
  assert.equal(metricComparisons(model, 'Txn-count')[0].growth, null);
});

test('partial-year reporting still suppresses missing records within the reported period', () => {
  const data = fixture();
  data.rows = data.rows.filter(row => !(row.Year === 2026 && row.Month === 1 && row['Market-id'] === 'US'));
  const model = executiveComparison(data, ['US', 'CA'], 2026, 1, 12, '2021');
  assert.equal(model.summary['Txn-count'], null);
  assert.equal(model.summary['Active Accounts'], 164);
  assert.equal(model.series[0].pending, false);
  assert.equal(model.series[0].complete, false);
  assert.equal(model.series[2].pending, true);
});

test('zero and missing baselines are omitted from ranges, with unavailable counts retained', () => {
  const result = comparisonExtent([{ year: 2019, growth: -10 }, { year: 2020, growth: null }, { year: 2021, growth: 30 }]);
  assert.equal(result.min, -10); assert.equal(result.max, 30); assert.equal(result.missing, 1);
  const data = fixture();
  data.rows.filter(row => row.Year === 2021).forEach(row => { row['Active Accounts'] = 0; });
  assert.equal(metricComparisons(executiveComparison(data, ['US'], 2026, 1, 2, '2021'), 'Active Accounts')[0].growth, null);
});

test('comparison state validates shared links and handles the first year', () => {
  assert.equal(normalizeComparison('2026', 2026, 2026), 'prior');
  assert.equal(normalizeComparison('nonsense', 2026, 2026), 'prior');
  assert.equal(normalizeComparison('2030', 2026, 2026), 'prior');
  assert.equal(normalizeComparison('2026', 2021, 2026), '2026');
  assert.equal(executiveComparison(fixture(), ['US'], 2019, 1, 2, 'all').comparisons.length, 0);
  assert.equal(executiveComparison(fixture(), ['US'], 2026, 1, 2, 'prior').comparisons[0].year, 2025);
});

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
