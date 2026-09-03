import { useState } from 'react';
import { Activity, CreditCard, WalletCards, Users, Sparkles, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Bar, BarChart, Cell, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { METRICS, MONTHS, compact, number, percent } from './data.mjs';
import { comparisonExtent, metricComparisons } from './executive-data.mjs';

const metrics = METRICS.map((metric, index) => ({ ...metric, color: ['#2563eb', '#0891b2', '#d08a24', '#7c3aed'][index] }));
const icons = [Activity, CreditCard, WalletCards, Users];
export const yearColor = year => ['#6f93b6', '#bb8a58', '#9679ae', '#6a9d89', '#c58082', '#7895a0', '#92955b', '#a48464'][(year - 2019) % 8];
const axis = { axisLine: false, tickLine: false, tick: { fill: '#6f7e7b', fontSize: 13 } };

export function comparisonLabel(model) {
  if (model.mode === 'months') return `${model.monthly?.['Txn-count']?.from ?? 'first month'} → ${model.monthly?.['Txn-count']?.to ?? 'last month'}`;
  if (model.mode === 'all') return model.comparisons.length ? `${model.comparisons[0].year}–${model.comparisons.at(-1).year}` : 'no earlier years';
  return model.comparisons[0]?.year ?? 'no earlier year';
}

export function ComparisonDelta({ model, metricKey, marketId }) {
  const values = metricComparisons(model, metricKey, marketId);
  const { valid, min, max, missing } = comparisonExtent(values);
  const multi = model.mode === 'all' && valid.length > 1;
  const title = values.length ? values.map(value => `${value.year}: ${percent(value.growth)}`).join(' · ') : 'No earlier year in the dataset';
  return <span className={`ex-delta ${!valid.length ? 'unavailable' : max < 0 ? 'down' : min < 0 ? 'mixed' : ''}`} title={title}>
    {!multi && valid.length > 0 && (min < 0 ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />)}
    {multi ? `${percent(min)} to ${percent(max)}` : percent(min)}
    {missing > 0 && <small className="ex-partial-comparison">({valid.length}/{values.length} available)</small>}
  </span>;
}

function ComparisonTip({ active, payload, label, growth = false, monthly = false }) {
  if (!active || !payload?.length) return null;
  return <div className="ex-tooltip"><strong>{growth ? monthly ? `${label} vs previous month` : `Compared with ${label}` : label}</strong>{payload.filter(item => item.value != null).map(item => <div key={item.dataKey}><i style={{ background: item.color || item.payload.fill }} /><span>{item.name}</span><b>{growth ? percent(item.value) : number(Math.round(item.value))}</b></div>)}</div>;
}

export function ExecutiveReadout({ model, period }) {
  const all = model.mode === 'all';
  const monthly = model.mode === 'months';
  return <section className="ex-readout ex-readout-expanded" aria-label="Executive readout">
    <div className="ex-readout-heading"><span><Sparkles size={20} />THE READOUT</span><p>{monthly ? `${period.range} · first-to-last reported month` : `${period.range} compared with ${all ? 'each earlier year' : comparisonLabel(model)}`} · four perspectives</p></div>
    <div className="ex-readout-points">{metrics.map((metric, index) => {
      const Icon = icons[index];
      const { valid, missing } = comparisonExtent(metricComparisons(model, metric.key));
      const higher = valid.filter(value => value.growth > 0).length;
      const lower = valid.filter(value => value.growth < 0).length;
      const leaders = !all ? model.markets.map(market => ({ ...market, change: metricComparisons(model, metric.key, market.id)[0]?.growth })).filter(market => market.change != null).sort((a, b) => b.change - a.change) : [];
      const leader = leaders[0];
      return <article key={metric.key}><h3><Icon size={18} />{metric.label}</h3><div className="ex-readout-value"><ComparisonDelta model={model} metricKey={metric.key} /></div>
        <p><strong>{compact(model.summary[metric.key], 2)}</strong> {metric.kind === 'flow' ? `during ${period.range}` : `at ${period.last}`}.</p>
        <p>{!valid.length ? monthly ? 'Choose at least two reported months for a within-year comparison.' : 'A complete, nonzero comparison baseline is unavailable.' : monthly ? <>From {model.monthly[metric.key].from} to {model.monthly[metric.key].to}, this monthly measure {valid[0].growth < 0 ? 'decreased' : valid[0].growth > 0 ? 'increased' : 'was unchanged'} by {Math.abs(valid[0].growth).toFixed(1)}%.{leader && leaders.length > 1 ? <> <strong>{leader.name}</strong> has the {leader.change >= 0 ? 'strongest increase' : 'smallest decline'} ({percent(leader.change)}).</> : ''}</> : all ? <>{higher} higher, {lower} lower, {valid.length - higher - lower} unchanged across {valid.length} comparable years. {missing > 0 && `${missing} baseline(s) unavailable.`}</> : <>{Math.abs(valid[0].growth).toFixed(1)}% {valid[0].growth < 0 ? 'below' : valid[0].growth > 0 ? 'above' : 'change from'} {valid[0].year}.{leader && leaders.length > 1 ? <> <strong>{leader.name}</strong> has the {leader.change >= 0 ? 'strongest increase' : 'smallest decline'} ({percent(leader.change)}).</> : ''}</>}</p>
        {all && valid.length > 0 && <small>Percentage range across available years; each year is shown below.</small>}
      </article>;
    })}</div>
  </section>;
}

function MonthlyTable({ rows, year }) {
  return <details className="ex-year-table ex-month-table" open>
    <summary>All four metrics by month <span>Monthly values · {year}</span></summary>
    <p>Transactions are each month’s volume. Cards and accounts are that month’s closing balances. Unreported months are unavailable, never zero.</p>
    <div className="ex-table-scroll"><table>
      <thead><tr><th scope="col">Month</th>{metrics.map(metric => <th scope="col" key={metric.key}>{metric.label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.month} className={row.pending ? 'ex-pending-month' : ''}>
        <th scope="row">{row.label} {year}{!row.complete && <small>{row.pending ? 'Not yet reported' : 'Incomplete data'}</small>}</th>
        {metrics.map(metric => <td key={metric.key}><strong title={number(row[metric.key])}>{compact(row[metric.key], 2)}</strong></td>)}
      </tr>)}</tbody>
    </table></div>
  </details>;
}

export function YearComparison({ model, period }) {
  const [activeKey, setActiveKey] = useState('Txn-count');
  const monthly = model.mode === 'months';
  const metric = metrics.find(item => item.key === activeKey);
  const years = [...model.comparisons.map(reference => ({ year: reference.year, ...reference.summary })), { year: period.year, ...model.summary }].sort((a, b) => b.year - a.year);
  const rows = monthly ? model.series.map(row => ({ ...row, fill: metric.color })) : years.map(row => ({ ...row, label: String(row.year), fill: row.year === period.year ? metric.color : '#d4dfd8' }));
  return <section className="ex-panel ex-year-comparison" id="year-comparison">
    <div className="ex-panel-heading ex-breakdown-heading"><div><span className="ex-chart-eyebrow"><i />{monthly ? 'WITHIN THE YEAR' : 'MATCHED PERIODS, EVERY YEAR'}</span><h2>{monthly ? `${period.year}, month by month.` : model.mode === 'all' ? 'Compare all previous years.' : `Compare ${period.year} with ${comparisonLabel(model)}.`}</h2><p>{monthly ? `${period.selectedShort} ${period.year} · ${model.markets.length} selected markets · ${metric.kind === 'flow' ? 'monthly volumes' : 'month-end balances'}` : `${period.short} in every year · same ${model.markets.length} selected markets · ${metric.kind === 'flow' ? 'period totals' : model.hasReportedMonths ? `${MONTHS[period.end - 1]} snapshots` : 'no reported snapshot'}`}</p></div><span className="ex-chart-badge">{monthly ? 'SELECTED YEAR ONLY' : `${period.year} HIGHLIGHTED`}</span></div>
    <div className="ex-history-tabs">{metrics.map(item => <button key={item.key} aria-pressed={activeKey === item.key} className={activeKey === item.key ? 'active' : ''} onClick={() => setActiveKey(item.key)}><i style={{ background: item.color }} />{item.label}</button>)}</div>
    <div className="ex-history-scroll" tabIndex={0} aria-label={`${monthly ? 'Monthly' : 'Historical'} values chart; scroll horizontally on small screens`}><div className="ex-history-chart" style={{ minWidth: Math.max(300, rows.length * 88 + 85) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 28, right: 20, bottom: 6, left: 10 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e5ebe7" strokeDasharray="3 5" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={60} tickFormatter={value => compact(value)} /><Tooltip content={<ComparisonTip />} cursor={{ fill: '#f5f7f2' }} /><Bar dataKey={metric.key} name={metric.label} maxBarSize={76} radius={[5, 5, 0, 0]} isAnimationActive={false}>{rows.map(row => <Cell key={row.label} fill={row.fill} />)}<LabelList dataKey={metric.key} position="top" formatter={value => compact(value, 2)} fill="#52674f" fontSize={13} offset={9} /></Bar></BarChart></ResponsiveContainer></div></div>
    {rows.length > 3 && <p className="ex-scroll-hint">Swipe or scroll to see every {monthly ? 'month' : 'year'} →</p>}
    {monthly ? <MonthlyTable rows={rows} year={period.year} /> : <details className="ex-year-table"><summary>Show all four metrics by year <span>Values + change from each baseline</span></summary><p>Percentages show {period.year} compared with the year in that row, using {period.short} in every year. Unavailable or zero baselines produce no percentage; missing records within the reported period are never summed.</p><div className="ex-table-scroll"><table><thead><tr><th>Year</th>{metrics.map(item => <th key={item.key}>{item.label}</th>)}</tr></thead><tbody>{years.map(row => <tr key={row.year} className={row.year === period.year ? 'reporting-year' : ''}><th>{row.year}{row.year === period.year ? ' · reporting' : ''}</th>{metrics.map(item => <td key={item.key}><strong title={number(row[item.key])}>{compact(row[item.key], 2)}</strong>{row.year !== period.year && <span>{percent(metricComparisons(model, item.key).find(value => value.year === row.year)?.growth ?? null)}</span>}</td>)}</tr>)}</tbody></table></div></details>}
    <div className="ex-chart-footer">{monthly ? 'This view shows only the selected reporting year. Choose a metric above; the table includes all four. Unreported months remain gaps.' : 'Each year remains separate. Cards and accounts are month-end balances. Unavailable values are shown as gaps.'}</div>
  </section>;
}

export function CombinedComparison({ model, period }) {
  const [indexed, setIndexed] = useState(false);
  const [visible, setVisible] = useState(metrics.map(metric => metric.key));
  const all = model.mode === 'all';
  const monthly = model.mode === 'months';
  const growth = metrics.map(metric => ({ ...metric, growth: metricComparisons(model, metric.key)[0]?.growth ?? null }));
  const yearlyGrowth = [...model.comparisons].sort((a, b) => b.year - a.year).map(reference => ({ label: String(reference.year), ...Object.fromEntries(metrics.map(metric => [metric.key, metricComparisons(model, metric.key).find(value => value.year === reference.year)?.growth ?? null])) }));
  const monthlyGrowth = model.series.map((row, index) => ({ label: row.label, ...Object.fromEntries(metrics.map(metric => [metric.key, index > 0 && row[metric.key] != null && model.series[index - 1]?.[metric.key] > 0 ? (row[metric.key] / model.series[index - 1][metric.key] - 1) * 100 : null])) }));
  const indexedRows = model.series.map(row => ({ label: row.label, ...Object.fromEntries(metrics.map(metric => [metric.key, model.series[0]?.[metric.key] > 0 && row[metric.key] != null ? row[metric.key] / model.series[0][metric.key] * 100 : null])) }));
  const best = !all ? [...growth].filter(metric => metric.growth != null).sort((a, b) => b.growth - a.growth)[0] : null;
  const hasGrowth = (monthly ? monthlyGrowth : yearlyGrowth).some(row => metrics.some(metric => row[metric.key] != null));
  return <section className="ex-panel ex-combined" id="combined"><div className="ex-panel-heading"><div><span className="ex-chart-eyebrow"><i />THE COMBINED VIEW</span><h2>Four indicators. One perspective.</h2><p>{indexed ? `${period.year} monthly movement · ${MONTHS[period.start - 1]} = 100` : monthly ? `${period.year} month-over-month change · selected markets only` : all ? `${period.year} growth versus each earlier year · same markets and months` : `Like-for-like change against ${comparisonLabel(model)} · all selected markets`}</p></div><div className="ex-segments"><button aria-pressed={!indexed} className={!indexed ? 'active' : ''} onClick={() => setIndexed(false)}>{monthly ? 'Monthly change' : 'Comparison growth'}</button><button aria-pressed={indexed} className={indexed ? 'active' : ''} onClick={() => setIndexed(true)}>Indexed trends</button></div></div>
      <div className="ex-combined-body"><div className="ex-combined-chart-area">
        {(indexed || all || monthly) && <div className="ex-index-legend">{metrics.map(metric => <button key={metric.key} aria-pressed={visible.includes(metric.key)} onClick={() => setVisible(visible.includes(metric.key) ? visible.filter(key => key !== metric.key) : [...visible, metric.key])} style={{ opacity: visible.includes(metric.key) ? 1 : .35 }}><i style={{ background: metric.color }} />{metric.short}</button>)}</div>}
        {indexed ? <div className="ex-chart ex-index-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={indexedRows} margin={{ left: 5, right: 15, top: 15, bottom: 5 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e5ebe7" strokeDasharray="3 5" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={45} domain={['auto', 'auto']} tickFormatter={value => Number(value).toFixed(0)} /><ReferenceLine y={100} stroke="#bccfc5" strokeDasharray="4 4" /><Tooltip formatter={value => `${Number(value).toFixed(1)} points`} />{metrics.filter(metric => visible.includes(metric.key)).map(metric => <Line key={metric.key} type="monotone" dataKey={metric.key} name={metric.label} stroke={metric.color} strokeWidth={3} dot={{ r: 3, stroke: '#fff', strokeWidth: 1 }} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div>
          : !hasGrowth ? <div className="ex-chart-empty">No complete, nonzero comparison baseline. Select at least two reported months or switch to indexed trends.</div>
          : (all || monthly) ? <div className="ex-chart ex-growth-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly ? monthlyGrowth : yearlyGrowth} margin={{ top: 20, left: 4, right: 14, bottom: 5 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e5ebe7" strokeDasharray="3 5" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={54} tickFormatter={value => `${value}%`} /><ReferenceLine y={0} stroke="#a8b9b0" /><Tooltip content={<ComparisonTip growth monthly={monthly} />} />{metrics.filter(metric => visible.includes(metric.key)).map(metric => <Bar key={metric.key} dataKey={metric.key} name={metric.label} fill={metric.color} maxBarSize={24} radius={[3, 3, 0, 0]} isAnimationActive={false} />)}</BarChart></ResponsiveContainer></div>
          : <div className="ex-chart ex-growth-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={growth} layout="vertical" margin={{ left: 0, right: 65, top: 20, bottom: 8 }} accessibilityLayer><CartesianGrid horizontal={false} stroke="#e5ebe7" strokeDasharray="3 5" /><XAxis type="number" {...axis} tickFormatter={value => `${value}%`} /><YAxis type="category" dataKey="short" {...axis} width={100} tick={{ fill: '#4d6359', fontSize: 13 }} /><ReferenceLine x={0} stroke="#a8b9b0" /><Tooltip formatter={value => percent(value)} /><Bar dataKey="growth" name={`Change vs ${comparisonLabel(model)}`} maxBarSize={29} radius={[4, 4, 4, 4]} isAnimationActive={false}>{growth.map(row => <Cell key={row.key} fill={row.color} />)}<LabelList dataKey="growth" formatter={value => percent(value)} position="right" fill="#3c5146" fontSize={14} fontWeight={600} offset={10} /></Bar></BarChart></ResponsiveContainer></div>}
      </div><aside className="ex-combined-note"><span><Sparkles size={18} />READING THE SIGNAL</span><h3>{monthly ? 'Movement inside the selected year.' : all ? 'Every year has its own baseline.' : best ? `${best.short} ${best.growth >= 0 ? 'lead growth' : 'show the smallest decline'}.` : 'Start with a shared baseline.'}</h3><p>{monthly ? <>Each group shows change from the immediately preceding selected month. The first month and unreported months remain blank.</> : all ? <>Each group shows {period.year} relative to that year. Percentages are cumulative changes between the two years, not annualized rates or an average of history.</> : best ? <>At <strong>{percent(best.growth)}</strong> versus {comparisonLabel(model)}, this is the strongest relative change among the four indicators.</> : 'Comparison growth needs complete, nonzero baseline data for the same markets and months.'}</p><div><strong>Consistent comparisons</strong><p>{monthly ? 'KPI and scorecard changes compare the first and last reported month. This chart shows each month versus its immediate predecessor.' : 'Transactions use the period total. Cards and accounts use the last reported month within the selection. Indexed trends show the reporting year relative to its first selected month.'}</p></div></aside></div>
    </section>;
}
