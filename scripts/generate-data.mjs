import { mkdirSync, writeFileSync } from 'node:fs';
import { HEADERS, periodKey } from '../src/data.mjs';

const argument = process.argv.find(arg => arg.startsWith('--through='))?.split('=')[1];
const through = argument || new Date().toISOString().slice(0, 7);
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(through) || through < '2019-01' || through > new Date().toISOString().slice(0, 7)) throw new Error('Use --through=YYYY-MM between 2019-01 and the current month.');
const [lastYear, lastMonth] = through.split('-').map(Number);
const markets = [
  ['US', 'United States', 6.8, .075], ['GB', 'United Kingdom', 3.9, .062],
  ['CA', 'Canada', 2.6, .074], ['DE', 'Germany', 3.1, .052],
  ['FR', 'France', 2.7, .057], ['AU', 'Australia', 2.3, .079],
  ['JP', 'Japan', 4.5, .043], ['SG', 'Singapore', 1.2, .103],
  ['IN', 'India', 3.2, .159], ['BR', 'Brazil', 2.1, .126],
  ['MX', 'Mexico', 1.5, .102], ['AE', 'United Arab Emirates', 1.1, .129],
  ['IT', 'Italy', 1.9, .046], ['ES', 'Spain', 1.7, .066],
];
const rows = [HEADERS.join(',')];
for (let year = 2019; year <= lastYear; year++) {
  for (let month = 1; month <= (year === lastYear ? lastMonth : 12); month++) {
    markets.forEach(([id, name, base, growth], i) => {
      const t = (year - 2019) + (month - 1) / 12;
      const cyclical = 1 + .055 * Math.sin((month - 3) * Math.PI / 6) + (month === 12 ? .14 : 0);
      const disruption = year === 2020 && month >= 3 ? .72 + .025 * (month - 3) : year === 2021 ? .96 : 1;
      const noise = 1 + .018 * Math.sin(year * 7.13 + month * 4.79 + i * 2.8);
      const recent = year >= 2025 && id === 'JP' ? .90 : 1;
      const txn = Math.round(base * 1e6 * (1 + growth) ** t * cyclical * disruption * noise * recent);
      const accounts = Math.round(base * 260000 * (1 + growth * .66) ** t * (1 + .006 * Math.sin(month + i)));
      const basic = Math.round(accounts * (1.09 + (i % 3) * .055));
      const plastic = Math.round(basic * (1.22 + (i % 4) * .045));
      rows.push([id, name, year, month, txn, plastic, basic, accounts].join(','));
    });
  }
}
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/markets.csv', rows.join('\n') + '\n');
writeFileSync('public/data/metadata.json', JSON.stringify({ kind: 'synthetic', title: 'Illustrative sample data', through: periodKey(lastYear, lastMonth), generatedAt: new Date().toISOString(), partialCurrentMonth: periodKey(lastYear, lastMonth) === new Date().toISOString().slice(0, 7), note: 'Synthetic monthly observations. A latest current-month observation is illustrative and reported as partial.' }, null, 2) + '\n');
console.log(`Generated ${rows.length - 1} rows: 14 markets, Jan 2019–${through}.`);
