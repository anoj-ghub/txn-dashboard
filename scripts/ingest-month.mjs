import { readFileSync, writeFileSync } from 'node:fs';
import { parseData, periodKey, toCSV } from '../src/data.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: npm run ingest:data -- path/to/export.csv [--replace-history]');
const incoming = parseData(readFileSync(file, 'utf8'));
const replace = process.argv.includes('--replace-history');
const metadata = JSON.parse(readFileSync('public/data/metadata.json', 'utf8'));
if (!replace && metadata.kind === 'synthetic') throw new Error('Do not mix production records with sample data. Supply a full historical export with --replace-history for the first production load.');
let rows = incoming.rows;
if (!replace) {
  const current = parseData(readFileSync('public/data/markets.csv', 'utf8'));
  const key = row => `${row['Market-id']}/${row.Year}/${row.Month}`;
  const merged = new Map(current.rows.map(row => [key(row), row]));
  incoming.rows.forEach(row => merged.set(key(row), row));
  rows = [...merged.values()];
}
const result = parseData(toCSV(rows));
if (result.markets.length !== 14) throw new Error(`Expected 14 markets; found ${result.markets.length}.`);
if (result.missing.length) throw new Error(`Cannot publish: ${result.missing.length} missing market-month records, including ${result.missing.slice(0, 5).join(', ')}.`);
writeFileSync('public/data/markets.csv', toCSV(result.rows) + '\r\n');
writeFileSync('public/data/metadata.json', JSON.stringify({ kind: 'production', title: 'Monthly market reporting', through: periodKey(result.latest.year, result.latest.month), generatedAt: new Date().toISOString(), note: 'Source: monthly mainframe export. Cards and accounts are month-end snapshots.' }, null, 2) + '\n');
console.log(`Prepared ${result.rows.length} production records through ${periodKey(result.latest.year, result.latest.month)}. Review and commit both data files together.`);
