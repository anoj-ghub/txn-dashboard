import Papa from 'papaparse';

export const HEADERS = ['Market-id', 'Market-name', 'Year', 'Month', 'Txn-count', 'Total Active Plastic', 'Total Active Basic', 'Active Accounts'];
export const METRICS = [
  { key: 'Txn-count', label: 'Transactions', short: 'Transactions', color: '#7460d5', kind: 'flow' },
  { key: 'Total Active Plastic', label: 'Total active plastic', short: 'Active plastic', color: '#2c9caa', kind: 'stock' },
  { key: 'Total Active Basic', label: 'Total active basic', short: 'Active basic', color: '#db9c48', kind: 'stock' },
  { key: 'Active Accounts', label: 'Active accounts', short: 'Accounts', color: '#5d83d6', kind: 'stock' },
];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const COLORS = ['#7460d5', '#23999e', '#d79a40', '#5485d7', '#cb6483', '#618c58', '#9e6dc0', '#bd7953', '#367581', '#8a8645', '#5874a1', '#b95455', '#576961', '#9d6690'];
export const compact = (value, digits = 1) => value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: digits }).format(value);
export const number = value => value == null ? '—' : new Intl.NumberFormat('en').format(value);
export const change = (current, previous) => current == null || previous == null || previous === 0 ? null : (current / previous - 1) * 100;
export const percent = value => value == null || !Number.isFinite(value) ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
export const periodKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

export function parseData(text) {
  const parsed = Papa.parse(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: value => value.trim() });
  if (parsed.errors.length) throw new Error(`CSV could not be read: ${parsed.errors[0].message}`);
  const fields = parsed.meta.fields || [];
  if (HEADERS.some(h => !fields.includes(h)) || fields.length !== HEADERS.length) throw new Error(`Expected these eight columns: ${HEADERS.join(', ')}.`);
  if (!parsed.data.length) throw new Error('The CSV contains no data rows.');
  const seen = new Set();
  const markets = new Map();
  const rows = parsed.data.map((record, index) => {
    const row = {};
    row['Market-id'] = record['Market-id'].trim().toUpperCase();
    row['Market-name'] = record['Market-name'].trim();
    if (!/^[A-Z0-9]{2}$/.test(row['Market-id']) || !row['Market-name'] || row['Market-name'].length > 100) throw new Error(`Row ${index + 2}: use a two-character market ID and a market name (up to 100 characters).`);
    for (const field of HEADERS.slice(2)) {
      const raw = record[field].trim();
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error(`Row ${index + 2}: ${field} must be a non-negative whole number without separators.`);
      row[field] = Number(raw);
    }
    if (row.Year < 2019 || row.Year > 9999 || row.Month < 1 || row.Month > 12) throw new Error(`Row ${index + 2}: invalid year or month (history starts in 2019).`);
    if (periodKey(row.Year, row.Month) > new Date().toISOString().slice(0, 7)) throw new Error(`Row ${index + 2}: future reporting periods are not supported.`);
    const id = row['Market-id'];
    if (markets.has(id) && markets.get(id) !== row['Market-name']) throw new Error(`Row ${index + 2}: market ${id} has inconsistent names.`);
    markets.set(id, row['Market-name']);
    const key = `${id}/${row.Year}/${row.Month}`;
    if (seen.has(key)) throw new Error(`Row ${index + 2}: duplicate market/year/month (${key}).`);
    seen.add(key);
    return row;
  }).sort((a, b) => a.Year - b.Year || a.Month - b.Month || a['Market-id'].localeCompare(b['Market-id']));
  const latest = rows.at(-1);
  const missing = [];
  for (const id of markets.keys()) {
    for (let year = 2019; year <= latest.Year; year++) {
      for (let month = 1; month <= (year === latest.Year ? latest.Month : 12); month++) {
        if (!seen.has(`${id}/${year}/${month}`)) missing.push(`${id} ${periodKey(year, month)}`);
      }
    }
  }
  return { rows, markets: [...markets].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)), latest: { year: latest.Year, month: latest.Month }, missing };
}

export function monthlySeries(rows, ids, year, start = 1, end = 12) {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => {
    const month = start + i;
    const found = rows.filter(row => row.Year === year && row.Month === month && ids.includes(row['Market-id']));
    const complete = ids.length > 0 && found.length === ids.length;
    const values = Object.fromEntries(METRICS.map(metric => [metric.key, complete ? found.reduce((sum, row) => sum + row[metric.key], 0) : null]));
    return { month, label: MONTHS[month - 1], complete, ...values };
  });
}

export function summarize(series) {
  return Object.fromEntries(METRICS.map(metric => [metric.key, !series.length ? null : metric.kind === 'stock' ? series.at(-1)[metric.key] : series.every(item => item.complete) ? series.reduce((sum, item) => sum + item[metric.key], 0) : null]));
}

export function selectionData(dataset, ids, year, start, end) {
  const series = monthlySeries(dataset.rows, ids, year, start, end);
  const previous = monthlySeries(dataset.rows, ids, year - 1, start, end);
  const summary = summarize(series);
  const prior = summarize(previous);
  const markets = dataset.markets.filter(m => ids.includes(m.id)).map(market => {
    const current = summarize(monthlySeries(dataset.rows, [market.id], year, start, end));
    const previous = summarize(monthlySeries(dataset.rows, [market.id], year - 1, start, end));
    return { ...market, ...current, growth: change(current['Txn-count'], previous['Txn-count']), contribution: summary['Txn-count'] ? current['Txn-count'] / summary['Txn-count'] * 100 : null };
  });
  return { series, previous, summary, prior, markets };
}

export function toCSV(rows) {
  return Papa.unparse(rows, { columns: HEADERS, escapeFormulae: true, newline: '\r\n' });
}
