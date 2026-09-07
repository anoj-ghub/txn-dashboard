import { change } from './data.mjs';
import { balancePeriods, metricComparisons } from './executive-data.mjs';

export function splitMarketRows(model, year, key, mode = 'period') {
  if (mode === 'period') return balancePeriods(model, year).map(period => ({ label: period.label, ...Object.fromEntries(period.markets.map(market => [market.id, market[key] ?? null])) }));
  if (mode === 'growth' && model.mode !== 'months') return [...model.comparisons].sort((a, b) => b.year - a.year).map(reference => ({
    label: `${year} vs ${reference.year}`,
    ...Object.fromEntries(model.marketSeries.map(market => [market.id, metricComparisons(model, key, market.id).find(value => value.year === reference.year)?.growth ?? null])),
  }));
  return model.series.map((row, index) => ({ label: row.label, ...Object.fromEntries(model.marketSeries.map(market => {
    const current = market.series[index]?.[key] ?? null;
    const baseline = market.series[mode === 'indexed' ? 0 : index - 1]?.[key] ?? null;
    return [market.id, mode === 'growth' ? change(current, baseline) : mode === 'indexed' ? current != null && baseline > 0 ? current / baseline * 100 : null : current];
  })) }));
}
