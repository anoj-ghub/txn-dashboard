import { readFileSync } from 'node:fs';
import { parseData, periodKey, summarize, monthlySeries, compact, change, percent } from '../src/data.mjs';

export function validateFile(file = 'public/data/markets.csv') {
  const dataset = parseData(readFileSync(file, 'utf8'));
  if (dataset.markets.length !== 14) throw new Error(`Expected 14 markets; found ${dataset.markets.length}.`);
  if (dataset.missing.length) throw new Error(`Missing ${dataset.missing.length} market-month records: ${dataset.missing.slice(0, 6).join(', ')}.`);
  return dataset;
}
const dataset = validateFile(process.argv[2]);
const metadata = JSON.parse(readFileSync('public/data/metadata.json', 'utf8'));
if (!['synthetic', 'production'].includes(metadata.kind)) throw new Error('metadata.kind must be synthetic or production.');
if (metadata.through !== periodKey(dataset.latest.year, dataset.latest.month)) throw new Error('metadata.through must match the latest CSV period.');
const ids = dataset.markets.map(m => m.id);
const current = summarize(monthlySeries(dataset.rows, ids, dataset.latest.year, 1, dataset.latest.month));
const prior = summarize(monthlySeries(dataset.rows, ids, dataset.latest.year - 1, 1, dataset.latest.month));
console.log(`Validated ${dataset.rows.length} records across 14 markets through ${metadata.through}.\n${metadata.kind === 'synthetic' ? 'SYNTHETIC DEMO DATA' : 'Production data'}\nYTD transactions: ${compact(current['Txn-count'])} (${percent(change(current['Txn-count'], prior['Txn-count']))} vs same months last year).\nLatest active accounts: ${compact(current['Active Accounts'])}.`);
