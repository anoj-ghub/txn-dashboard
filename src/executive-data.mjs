import { METRICS, change, monthlySeries, selectionData, summarize } from './data.mjs';

export function normalizeComparison(value, year, latestYear) {
  if (value === 'all' || value === 'prior' || value === 'months') return value;
  const reference = Number(value);
  return Number.isInteger(reference) && reference >= 2019 && reference <= latestYear && reference !== year ? String(reference) : 'prior';
}

export function executiveComparison(dataset, ids, year, start, end, requested = 'prior') {
  const mode = normalizeComparison(requested, year, dataset.latest.year);
  const years = mode === 'months' ? [] : mode === 'all' ? Array.from({ length: year - 2019 }, (_, i) => 2019 + i) : mode === 'prior' ? year > 2019 ? [year - 1] : [] : [Number(mode)];
  const reportedEnd = year === dataset.latest.year ? Math.min(end, dataset.latest.month) : end;
  const model = selectionData(dataset, ids, year, start, reportedEnd);
  const latestMonthPartial = Boolean(dataset.latestPartial) && year === dataset.latest.year && start <= dataset.latest.month && end >= dataset.latest.month;
  const series = monthlySeries(dataset.rows, ids, year, start, end).map(row => ({ ...row, label: row.month === dataset.latest.month && latestMonthPartial ? `${row.label}*` : row.label, pending: year === dataset.latest.year && row.month > dataset.latest.month, partial: row.month === dataset.latest.month && latestMonthPartial }));
  const marketSeries = dataset.markets.filter(market => ids.includes(market.id)).map(market => ({ ...market, series: monthlySeries(dataset.rows, [market.id], year, start, end) }));
  const comparisons = years.map(referenceYear => {
    const series = monthlySeries(dataset.rows, ids, referenceYear, start, end).map(row => row.month > reportedEnd ? { ...row, complete: false, ...Object.fromEntries(METRICS.map(metric => [metric.key, null])) } : row);
    const markets = dataset.markets.filter(market => ids.includes(market.id)).map(market => ({ ...market, ...summarize(monthlySeries(dataset.rows, [market.id], referenceYear, start, reportedEnd)) }));
    return { year: referenceYear, series, summary: summarize(series.filter(row => row.month <= reportedEnd)), markets, partial: Boolean(dataset.latestPartial) && referenceYear === dataset.latest.year && reportedEnd === dataset.latest.month };
  });
  const unavailable = Object.fromEntries(METRICS.map(metric => [metric.key, null]));
  const monthly = monthlyChanges(model.series);
  return {
    ...model, series, reportedSeries: model.series, marketSeries, latestMonthPartial, reportedEnd, hasReportedMonths: reportedEnd >= start, mode, comparisons,
    prior: mode !== 'all' && comparisons[0] ? comparisons[0].summary : unavailable,
    previous: mode !== 'all' && comparisons[0] ? comparisons[0].series : [],
    monthly,
    markets: model.markets.map(market => {
      const marketMonthly = monthlyChanges(monthlySeries(dataset.rows, [market.id], year, start, reportedEnd));
      return { ...market, monthly: marketMonthly, growth: mode === 'months' ? marketMonthly['Txn-count'].growth : mode !== 'all' ? change(market['Txn-count'], comparisons[0]?.markets.find(item => item.id === market.id)?.['Txn-count'] ?? null) : null };
    }),
  };
}

export function monthlyChanges(series) {
  const available = series.filter(row => row.complete);
  return Object.fromEntries(METRICS.map(metric => {
    const first = available.find(row => row[metric.key] != null);
    const last = available.findLast(row => row[metric.key] != null);
    const comparable = first && last && first.month !== last.month;
    return [metric.key, { from: first?.label ?? null, to: last?.label ?? null, baseline: first?.[metric.key] ?? null, current: last?.[metric.key] ?? null, growth: comparable ? change(last[metric.key], first[metric.key]) : null }];
  }));
}

export function metricComparisons(model, key, marketId) {
  if (model.mode === 'months') {
    const value = marketId ? model.markets.find(market => market.id === marketId)?.monthly?.[key] : model.monthly?.[key];
    return value ? [{ year: `${value.from ?? 'First month'} → ${value.to ?? 'last month'}`, baseline: value.baseline, current: value.current, growth: value.growth }] : [];
  }
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
