import { METRICS, change, monthlySeries, selectionData, summarize } from './data.mjs';

export function normalizeComparison(value, year, latestYear) {
  if (value === 'all' || value === 'prior') return value;
  const reference = Number(value);
  return Number.isInteger(reference) && reference >= 2019 && reference <= latestYear && reference !== year ? String(reference) : 'prior';
}

export function executiveComparison(dataset, ids, year, start, end, requested = 'prior') {
  const mode = normalizeComparison(requested, year, dataset.latest.year);
  const years = mode === 'all' ? Array.from({ length: year - 2019 }, (_, i) => 2019 + i) : mode === 'prior' ? year > 2019 ? [year - 1] : [] : [Number(mode)];
  const model = selectionData(dataset, ids, year, start, end);
  const comparisons = years.map(referenceYear => {
    const series = monthlySeries(dataset.rows, ids, referenceYear, start, end);
    const markets = dataset.markets.filter(market => ids.includes(market.id)).map(market => ({ ...market, ...summarize(monthlySeries(dataset.rows, [market.id], referenceYear, start, end)) }));
    return { year: referenceYear, series, summary: summarize(series), markets };
  });
  const unavailable = Object.fromEntries(METRICS.map(metric => [metric.key, null]));
  return {
    ...model, mode, comparisons,
    prior: mode !== 'all' && comparisons[0] ? comparisons[0].summary : unavailable,
    previous: mode !== 'all' && comparisons[0] ? comparisons[0].series : [],
    markets: model.markets.map(market => ({ ...market, growth: mode !== 'all' ? change(market['Txn-count'], comparisons[0]?.markets.find(item => item.id === market.id)?.['Txn-count'] ?? null) : null })),
  };
}

export function metricComparisons(model, key, marketId) {
  const current = marketId ? model.markets.find(market => market.id === marketId)?.[key] : model.summary[key];
  return model.comparisons.map(reference => {
    const baseline = marketId ? reference.markets.find(market => market.id === marketId)?.[key] : reference.summary[key];
    return { year: reference.year, baseline: baseline ?? null, growth: change(current ?? null, baseline ?? null) };
  });
}

export function comparisonExtent(values) {
  const valid = values.filter(value => value.growth != null);
  return { valid, missing: values.length - valid.length, min: valid.length ? Math.min(...valid.map(value => value.growth)) : null, max: valid.length ? Math.max(...valid.map(value => value.growth)) : null };
}

// A descriptive least-squares fit across the selected observed months, never a forecast.
export function fittedTrend(series, key) {
  if (series.length < 2 || series.some(row => row[key] == null)) return series.map(row => ({ ...row, fitted: null }));
  const n = series.length;
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((sum, row) => sum + row[key], 0) / n;
  const numerator = series.reduce((sum, row, i) => sum + (i - meanX) * (row[key] - meanY), 0);
  const denominator = series.reduce((sum, _, i) => sum + (i - meanX) ** 2, 0);
  return series.map((row, i) => ({ ...row, fitted: meanY + numerator / denominator * (i - meanX) }));
}

export function marketSlices(markets, key, limit = 5) {
  if (markets.some(market => market[key] == null)) return [];
  const sorted = [...markets].filter(market => market[key] > 0).sort((a, b) => b[key] - a[key]);
  const slices = sorted.slice(0, limit).map(market => ({ id: market.id, name: market.name, value: market[key], ids: [market.id] }));
  if (sorted.length > limit) {
    const others = sorted.slice(limit);
    slices.push({ id: 'others', name: `Other ${others.length} markets`, value: others.reduce((sum, row) => sum + row[key], 0), ids: others.map(row => row.id) });
  }
  return slices;
}
