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
