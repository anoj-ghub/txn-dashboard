import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, ChevronRight, CircleHelp, CreditCard, Database, Download, FileCheck2, Globe2, Layers3, LayoutDashboard, Link2, Menu, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, Upload, Users, WalletCards, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLORS, METRICS, MONTHS, change, compact, monthlySeries, number, parseData, percent, periodKey, selectionData, toCSV } from './data.mjs';

const ICONS = [Activity, CreditCard, WalletCards, Users];
const axis = { tickLine: false, axisLine: false, tick: { fill: '#9093a6', fontSize: 11 }, minTickGap: 18 };

function download(content, name, type = 'text/csv;charset=utf-8;') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Growth({ value, suffix = '', subdued = false }) {
  return <span className={`growth ${value == null ? 'neutral' : value >= 0 ? 'positive' : 'negative'} ${subdued ? 'subdued' : ''}`}>
    {value != null && (value >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />)}{percent(value)}{suffix && <span className="growth-suffix">{suffix}</span>}
  </span>;
}

function ChartTooltip({ active, payload, label, indexed = false }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map(item => <div key={item.dataKey}><i style={{ background: item.color }} /><span>{item.name}</span><b>{indexed ? `${Number(item.value).toFixed(1)}` : number(item.value)}</b></div>)}</div>;
}

function MarketPicker({ markets, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const box = useRef(null);
  useEffect(() => {
    function close(event) { if (!box.current?.contains(event.target)) setOpen(false); }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const label = selected.length === markets.length ? 'All markets' : selected.length === 1 ? markets.find(m => m.id === selected[0])?.name : `${selected.length} markets selected`;
  return <div className="market-picker" ref={box} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); box.current.querySelector('button').focus(); } }}>
    <button className={`filter-button ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="market-options"><Globe2 size={16} /><span>{label}</span><ChevronDown size={14} /></button>
    {open && <div className="market-popover" id="market-options">
      <label className="search-field"><Search size={15} /><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a market…" aria-label="Find a market" /></label>
      <div className="picker-actions"><button onClick={() => onChange(markets.map(m => m.id))}>Select all</button><span>{selected.length} selected</span></div>
      <div className="market-options">{markets.filter(m => `${m.name} ${m.id}`.toLowerCase().includes(search.toLowerCase())).map(market => <label key={market.id} className="market-option">
        <input type="checkbox" checked={selected.includes(market.id)} onChange={() => onChange(selected.includes(market.id) ? selected.filter(id => id !== market.id) : [...selected, market.id])} />
        <span className="market-code">{market.id}</span><span>{market.name}</span><button title={`Show only ${market.name}`} onClick={event => { event.preventDefault(); onChange([market.id]); setOpen(false); }}>Only</button>
      </label>)}</div>
      <div className="picker-footer">Choose one market to drill down, or several to compare.</div>
      <button className="picker-done" onClick={() => setOpen(false)}>Apply selection <Check size={14} /></button>
    </div>}
  </div>;
}

function Kpi({ metric, index, data, prior, series, period }) {
  const Icon = ICONS[index];
  return <article className="kpi-card" style={{ '--metric': metric.color }}>
    <div className="kpi-label"><span>{metric.label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.7} /></span></div>
    <div className="kpi-main"><strong>{compact(data[metric.key], 2)}</strong><div className="sparkline" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series}><defs><linearGradient id={`spark-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={metric.color} stopOpacity={.2} /><stop offset="100%" stopColor={metric.color} stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey={metric.key} stroke={metric.color} strokeWidth={2} fill={`url(#spark-${index})`} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></div>
    <div className="kpi-bottom"><Growth value={change(data[metric.key], prior[metric.key])} /><span>vs. prior year</span></div>
    <div className="kpi-basis">{metric.kind === 'flow' ? 'Period total' : 'End-of-period snapshot'} <span>· {metric.kind === 'flow' ? period.range : period.end}</span></div>
  </article>;
}

function CombinedChart({ series, period }) {
  const [indexed, setIndexed] = useState(true);
  const [visible, setVisible] = useState(METRICS.map(m => m.key));
  const plotted = series.map(row => ({ ...row, ...Object.fromEntries(METRICS.map(metric => [metric.key, indexed ? series[0]?.[metric.key] > 0 && row[metric.key] != null ? row[metric.key] / series[0][metric.key] * 100 : null : row[metric.key]])) }));
  return <section className="panel combined-panel">
    <div className="panel-heading"><div><h2>Performance at a glance <span className="tag">COMBINED VIEW</span></h2><p>{indexed ? `Relative movement · ${MONTHS[series[0]?.month - 1]} = 100` : 'Monthly values · all four indicators'} · {period.year}</p></div><div className="segmented small" aria-label="Combined chart units"><button className={indexed ? 'selected' : ''} onClick={() => setIndexed(true)} aria-pressed={indexed}>Indexed</button><button className={!indexed ? 'selected' : ''} onClick={() => setIndexed(false)} aria-pressed={!indexed}>Actuals</button></div></div>
    <div className="legend-pills">{METRICS.map(metric => <button key={metric.key} className={!visible.includes(metric.key) ? 'muted' : ''} aria-pressed={visible.includes(metric.key)} onClick={() => setVisible(visible.includes(metric.key) ? visible.filter(key => key !== metric.key) : [...visible, metric.key])}><i style={{ background: metric.color }} />{metric.short}</button>)}</div>
    <div className="combined-chart" role="img" aria-label="Combined monthly performance chart. Metric values are also available in the data table and CSV export.">
      <ResponsiveContainer width="100%" height="100%"><LineChart data={plotted} margin={{ top: 10, right: 12, bottom: 0, left: 0 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0f5" /><XAxis dataKey="label" {...axis} dy={8} /><YAxis {...axis} width={46} domain={indexed ? ['auto', 'auto'] : [0, 'auto']} tickFormatter={value => indexed ? Math.round(value) : compact(value)} />
        <Tooltip content={<ChartTooltip indexed={indexed} />} />{indexed && <ReferenceLine y={100} stroke="#d9d8e4" strokeDasharray="4 4" />}
        {METRICS.filter(m => visible.includes(m.key)).map(metric => <Line key={metric.key} dataKey={metric.key} name={metric.label} stroke={metric.color} strokeWidth={2.6} type="monotone" dot={series.length === 1 ? { r: 4 } : false} activeDot={{ r: 5, stroke: 'white', strokeWidth: 2 }} isAnimationActive={false} />)}
      </LineChart></ResponsiveContainer>
    </div>
    <div className="chart-caption"><span className="tiny-dot" />{indexed ? 'A shared baseline makes growth rates comparable across different scales.' : 'Transactions are monthly totals; cards and accounts are monthly snapshots.'}</div>
  </section>;
}

function Insights({ model, period }) {
  const sorted = [...model.markets].filter(m => m.growth != null).sort((a, b) => b.growth - a.growth);
  const leader = sorted[0];
  const weakest = sorted.at(-1);
  const growth = change(model.summary['Txn-count'], model.prior['Txn-count']);
  const accounts = change(model.summary['Active Accounts'], model.prior['Active Accounts']);
  const last = model.series.at(-1);
  const priorLast = model.previous.at(-1);
  const frequency = last?.['Active Accounts'] ? last['Txn-count'] / last['Active Accounts'] : null;
  const oldFrequency = priorLast?.['Active Accounts'] ? priorLast['Txn-count'] / priorLast['Active Accounts'] : null;
  const frequencyChange = change(frequency, oldFrequency);
  const insights = [
    { title: growth == null ? 'Build a comparison baseline' : growth >= 0 ? 'Transaction momentum' : 'Transaction activity softened', text: growth == null ? 'The prior-year period is unavailable. Select 2020 or later with complete history to see year-over-year insights.' : `Transactions ${growth >= 0 ? 'grew' : 'declined'} ${Math.abs(growth).toFixed(1)}% versus the same months last year${accounts == null ? '.' : `; end-period accounts ${accounts >= 0 ? 'grew' : 'declined'} ${Math.abs(accounts).toFixed(1)}%.`}`, Icon: TrendingUp, tone: 'purple' },
    { title: leader ? leader.growth >= 0 ? `${leader.name} leads growth` : `${leader.name} is most resilient` : 'Market growth baseline', text: leader ? `${percent(leader.growth)} in period transactions${weakest && weakest.id !== leader.id ? `, compared with ${percent(weakest.growth)} in ${weakest.name}.` : ' versus the same period last year.'}` : 'Matched prior-year data is needed to rank market growth.', Icon: Globe2, tone: 'teal' },
    { title: frequency == null ? 'Engagement unavailable' : `${frequency.toFixed(2)} transactions per account`, text: frequency == null ? 'Complete monthly transactions and nonzero active accounts are needed.' : `In ${period.end}${frequencyChange == null ? '.' : `, ${Math.abs(frequencyChange).toFixed(1)}% ${frequencyChange >= 0 ? 'above' : 'below'} the same month last year.`} This is a portfolio ratio, not unique-customer behavior.`, Icon: Activity, tone: 'amber' },
  ];
  return <aside className="panel insights-panel"><div className="insight-heading"><span className="insight-spark"><Sparkles size={17} /></span><h2>Executive signals</h2><span className="live-dot" /></div><p className="insight-subtitle">The story behind your selection</p>
    {insights.map(({ title, text, Icon, tone }, i) => <div className="insight" key={i}><span className={`insight-icon ${tone}`}><Icon size={16} /></span><div><h3>{title}</h3><p>{text}</p></div></div>)}
    <div className="insight-note"><ShieldCheck size={13} /> Calculated from the selected data</div>
  </aside>;
}

function MetricChart({ metric, index, model, dataset, ids, period, compare, showPrior }) {
  const [distribution, setDistribution] = useState(false);
  const series = model.series.map((row, i) => ({ ...row, prior: model.previous[i]?.[metric.key] }));
  const marketSeries = useMemo(() => {
    const lookup = ids.map(id => ({ id, rows: monthlySeries(dataset.rows, [id], period.year, period.start, period.finish) }));
    return model.series.map((row, i) => ({ label: row.label, ...Object.fromEntries(lookup.map(m => [m.id, m.rows[i]?.[metric.key]])) }));
  }, [dataset, ids, period.year, period.start, period.finish, model.series, metric.key]);
  const shares = [...model.markets].sort((a, b) => (b[metric.key] ?? -1) - (a[metric.key] ?? -1)).map(m => ({ label: m.id, value: m[metric.key], name: m.name }));
  const Icon = ICONS[index];
  const Chart = index === 0 ? BarChart : index === 1 || index === 3 ? AreaChart : LineChart;
  return <section className="panel metric-panel">
    <div className="panel-heading"><div><h2><span className="heading-icon" style={{ color: metric.color }}><Icon size={16} /></span>{metric.label}</h2><p>{distribution ? metric.kind === 'flow' ? 'Period total by market' : `Snapshot by market · ${period.end}` : compare ? 'Monthly trends across selected markets' : 'Monthly trend with matched prior-year context'}</p></div><button className={`icon-button ${distribution ? 'chosen' : ''}`} title={distribution ? 'Show monthly trends' : 'Show market distribution'} aria-label={distribution ? `Show ${metric.label} monthly trends` : `Show ${metric.label} market distribution`} onClick={() => setDistribution(!distribution)}>{distribution ? <TrendingUp size={17} /> : <ChartNoAxesCombined size={17} />}</button></div>
    <div className="metric-chart" role="img" aria-label={`${metric.label} ${distribution ? 'market distribution' : 'monthly trend'}`}>
      <ResponsiveContainer width="100%" height="100%">
        {distribution ? <BarChart data={shares} margin={{ top: 12, left: 0, right: 8, bottom: 0 }} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#edf0f5" /><XAxis dataKey="label" {...axis} /><YAxis tickFormatter={value => compact(value)} {...axis} width={45} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="value" name={metric.label} fill={metric.color} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} /></BarChart>
          : compare ? <LineChart data={marketSeries} margin={{ top: 12, left: 0, right: 8, bottom: 0 }} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#edf0f5" /><XAxis dataKey="label" {...axis} /><YAxis tickFormatter={value => compact(value)} {...axis} width={45} /><Tooltip content={<ChartTooltip />} />{ids.map((id, i) => <Line key={id} type="monotone" dataKey={id} name={dataset.markets.find(m => m.id === id)?.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={series.length === 1 ? { r: 3 } : false} isAnimationActive={false} />)}<Legend formatter={(value, entry) => entry.dataKey} iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} /></LineChart>
          : <Chart data={series} margin={{ top: 12, left: 0, right: 8, bottom: 0 }} accessibilityLayer><defs><linearGradient id={`area-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={metric.color} stopOpacity={.19} /><stop offset="100%" stopColor={metric.color} stopOpacity={.015} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#edf0f5" /><XAxis dataKey="label" {...axis} /><YAxis tickFormatter={value => compact(value)} {...axis} width={45} /><Tooltip content={<ChartTooltip />} />
            {index === 0 ? <>{showPrior && <Bar dataKey="prior" name={`${period.year - 1} transactions`} fill="#e2ddf3" radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} />}<Bar dataKey={metric.key} name={`${period.year} transactions`} fill={metric.color} radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={false} /></> : index === 1 || index === 3 ? <>{showPrior && <Area type="monotone" dataKey="prior" name={`${period.year - 1} ${metric.short.toLowerCase()}`} stroke={metric.color} strokeDasharray="4 4" fill="transparent" strokeOpacity={.4} isAnimationActive={false} />}<Area type="monotone" dataKey={metric.key} name={`${period.year} ${metric.short.toLowerCase()}`} stroke={metric.color} fill={`url(#area-${index})`} strokeWidth={2.5} dot={series.length === 1 ? { r: 3 } : false} isAnimationActive={false} /></> : <>{showPrior && <Line type="monotone" dataKey="prior" name={`${period.year - 1} ${metric.short.toLowerCase()}`} stroke={metric.color} strokeOpacity={.4} strokeDasharray="4 4" dot={false} isAnimationActive={false} />}<Line type="monotone" dataKey={metric.key} name={`${period.year} ${metric.short.toLowerCase()}`} stroke={metric.color} strokeWidth={2.5} dot={series.length === 1 ? { r: 3 } : false} isAnimationActive={false} /></>}
          </Chart>}
      </ResponsiveContainer>
    </div>
    {!compare && !distribution && <div className="metric-chart-legend"><span><i style={{ background: metric.color }} />{period.year}</span>{showPrior && <span><i className="prior-dot" />{period.year - 1}</span>}<span className="legend-note">{metric.kind === 'flow' ? 'Monthly totals' : 'Month-end snapshots'}</span></div>}
  </section>;
}

function PerformanceTable({ markets, period, onDrill }) {
  const [sort, setSort] = useState({ key: 'Txn-count', dir: -1 });
  const [search, setSearch] = useState('');
  const sorted = [...markets].filter(m => `${m.id} ${m.name}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a[sort.key] == null ? 1 : b[sort.key] == null ? -1 : sort.dir * (typeof a[sort.key] === 'string' ? a[sort.key].localeCompare(b[sort.key]) : a[sort.key] - b[sort.key]));
  function sortBy(key) { setSort({ key, dir: sort.key === key ? -sort.dir : key === 'name' ? 1 : -1 }); }
  const columns = [{ key: 'name', label: 'Market' }, ...METRICS.map(m => ({ key: m.key, label: m.short })), { key: 'growth', label: 'Txn YoY' }, { key: 'contribution', label: 'Txn share' }];
  return <section className="panel performance-panel"><div className="panel-heading"><div><h2>Market performance <span className="count-tag">{markets.length}</span></h2><p>Transactions: {period.range} total · cards & accounts: {period.end} snapshot</p></div><label className="table-search"><Search size={15} /><input placeholder="Search markets" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search market performance" /></label></div><div className="table-scroll"><table><thead><tr>{columns.map(column => <th key={column.key} aria-sort={sort.key === column.key ? sort.dir === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => sortBy(column.key)}>{column.label}<ChevronDown size={12} className={sort.key === column.key && sort.dir === 1 ? 'rotate' : ''} /></button></th>)}</tr></thead><tbody>{sorted.map((market, i) => <tr key={market.id}><td><button className="market-drill" onClick={() => onDrill(market.id)}><span className="table-rank">{String(i + 1).padStart(2, '0')}</span><span className="market-code">{market.id}</span><span>{market.name}</span><ChevronRight size={13} /></button></td>{METRICS.map(metric => <td key={metric.key} title={number(market[metric.key])}>{compact(market[metric.key], 2)}</td>)}<td><Growth value={market.growth} /></td><td><div className="share-cell"><span>{market.contribution == null ? '—' : `${market.contribution.toFixed(1)}%`}</span><div><i style={{ width: `${market.contribution || 0}%` }} /></div></div></td></tr>)}</tbody></table>{!sorted.length && <p className="empty-table">No markets match your search.</p>}</div><div className="table-footer"><span>Click a market to explore its performance</span><span>YoY uses the same months in {period.year - 1}</span></div></section>;
}

function DataHub({ dataset, meta, local, onImport, onDownload, onReset }) {
  return <div className="data-hub"><section className="panel data-source-panel"><div className="panel-heading"><div><h2>Your data, ready for decisions</h2><p>One monthly CSV powers every view of the dashboard.</p></div><Database size={22} /></div><div className="data-stats"><div><strong>{number(dataset.rows.length)}</strong><span>validated records</span></div><div><strong>{dataset.markets.length}</strong><span>markets</span></div><div><strong>{MONTHS[dataset.latest.month - 1]} {dataset.latest.year}</strong><span>latest reporting period</span></div></div><div className="source-line"><FileCheck2 size={18} /><div><strong>{local ? 'Local CSV preview' : meta?.title || 'Published dataset'}</strong><p>{local ? 'Loaded in this browser session only. Reload to restore the published data.' : meta?.note || 'Published monthly dataset.'}</p></div><span className={`badge ${dataset.missing.length ? 'warning' : 'success'}`}>{dataset.missing.length ? `${dataset.missing.length} missing periods` : 'Complete history'}</span></div><div className="data-actions"><button className="button primary" onClick={onImport}><Upload size={15} />Preview a CSV</button><button className="button" onClick={onDownload}><Download size={15} />Download full CSV</button>{local && <button className="button" onClick={onReset}><RefreshCw size={15} />Restore published data</button>}</div></section>
    <div className="method-grid"><section className="panel"><h2>How the numbers work</h2><p className="section-description">Clear definitions keep every comparison consistent.</p>{METRICS.map(metric => <div className="definition" key={metric.key}><i style={{ background: metric.color }} /><div><h3>{metric.label}</h3><p>{metric.kind === 'flow' ? 'The sum of monthly transactions within the selected period.' : 'The value in the last selected month. Monthly snapshots are never added across time.'}</p><code>{metric.key}</code></div></div>)}<div className="method-note">“Plastic” and “basic” use the source system’s definitions. Confirm those definitions with your data owner before interpreting either as unique people or physical cards.</div></section>
    <section className="panel"><h2>Built for a monthly rhythm</h2><p className="section-description">A static site with an automated publishing process.</p><ol className="workflow-steps"><li><span>01</span><div><h3>Prepare the monthly file</h3><p>Export and convert the mainframe data in a separate process. Preserve all history from January 2019.</p></div></li><li><span>02</span><div><h3>Update the repository</h3><p>Replace <code>public/data/markets.csv</code> and update the reporting period in <code>metadata.json</code>.</p></div></li><li><span>03</span><div><h3>Validate & publish</h3><p>GitHub Actions checks the data and publishes the static dashboard to GitHub Pages.</p></div></li><li><span>04</span><div><h3>Keep leadership informed</h3><p>Optional email notifications can share the latest period, key changes, and page link after a successful deployment.</p></div></li></ol></section></div>
    <section className="panel methodology"><h2>Comparison & data quality notes</h2><div><p><strong>Year-over-year.</strong> Compares exactly the same months, selected markets, and aggregation method in the previous year. The first year of history has no prior-year comparison.</p><p><strong>Indexed charts.</strong> Each metric starts at 100 in the first selected month. A value of 110 means 10% growth since that baseline. A zero or missing baseline is shown as unavailable.</p><p><strong>Missing data.</strong> Missing observations are not treated as zeros. An incomplete market selection produces gaps and unavailable aggregates; publication requires complete history for all 14 markets.</p><p><strong>Visibility.</strong> Files deployed to a public GitHub Pages site are publicly downloadable. Use only data approved for that audience. Local CSV previews are processed in your browser and are not uploaded.</p></div></section>
  </div>;
}

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [meta, setMeta] = useState(null);
  const [local, setLocal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');
  const [ids, setIds] = useState([]);
  const [year, setYear] = useState(2026);
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(9);
  const [showPrior, setShowPrior] = useState(true);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef(null);

  function initialize(data, fromUrl = false) {
    setDataset(data);
    const params = fromUrl ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const savedIds = params.get('markets')?.split(',').filter(id => data.markets.some(m => m.id === id));
    setIds(savedIds?.length ? savedIds : data.markets.map(m => m.id));
    const savedYear = Number(params.get('year'));
    const selectedYear = Number.isInteger(savedYear) && savedYear >= 2019 && savedYear <= data.latest.year ? savedYear : data.latest.year;
    const maxMonth = selectedYear === data.latest.year ? data.latest.month : 12;
    const selectedStart = Math.min(maxMonth, Math.max(1, Number(params.get('from')) || 1));
    const selectedEnd = Math.min(maxMonth, Math.max(selectedStart, Number(params.get('to')) || maxMonth));
    setYear(selectedYear); setStart(Math.floor(selectedStart)); setEnd(Math.floor(selectedEnd));
    setView(['overview', 'compare', 'data'].includes(params.get('view')) ? params.get('view') : 'overview');
  }

  async function loadPublished() {
    setLoading(true); setError('');
    try {
      const [csv, metadata] = await Promise.all([fetch(`${import.meta.env.BASE_URL}data/markets.csv`, { cache: 'no-cache' }), fetch(`${import.meta.env.BASE_URL}data/metadata.json`, { cache: 'no-cache' })]);
      if (!csv.ok || !metadata.ok) throw new Error('The published data could not be loaded. Retry, or preview a local CSV.');
      const parsed = parseData(await csv.text());
      const info = await metadata.json();
      if (!['synthetic', 'production'].includes(info.kind) || info.through !== periodKey(parsed.latest.year, parsed.latest.month)) throw new Error('The CSV and its metadata do not match. Publish both files together.');
      initialize(parsed, true); setMeta(info); setLocal(false);
    } catch (issue) { setError(issue.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadPublished(); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!dataset || !ids.length || local) return;
    const params = new URLSearchParams({ view, year: String(year), from: String(start), to: String(end), markets: ids.join(',') });
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }, [dataset, view, ids, year, start, end, local]);

  const model = useMemo(() => dataset ? selectionData(dataset, ids, year, start, end) : null, [dataset, ids, year, start, end]);
  const period = { year, start, finish: end, range: `${MONTHS[start - 1]}${start === end ? '' : `–${MONTHS[end - 1]}`} ${year}`, end: `${MONTHS[end - 1]} ${year}` };
  const maxMonth = dataset && year === dataset.latest.year ? dataset.latest.month : 12;
  const scope = dataset ? ids.length === dataset.markets.length ? 'All markets' : ids.length === 1 ? dataset.markets.find(m => m.id === ids[0])?.name : `${ids.length} markets` : 'All markets';

  function navigate(next) {
    setView(next); setMobileMenu(false);
    if (next === 'compare' && dataset && ids.length === dataset.markets.length) setIds(['US', 'GB', 'IN', 'SG'].filter(id => dataset.markets.some(m => m.id === id)).length >= 2 ? ['US', 'GB', 'IN', 'SG'].filter(id => dataset.markets.some(m => m.id === id)) : dataset.markets.slice(0, 4).map(m => m.id));
  }
  function setSelectedYear(value) {
    const next = Number(value); const max = next === dataset.latest.year ? dataset.latest.month : 12;
    setYear(next); setStart(Math.min(start, max)); setEnd(Math.min(end, max));
  }
  async function importFile(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setImporting(true); setError('');
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('Please select a CSV smaller than 15 MB.');
      const parsed = parseData(await file.text()); initialize(parsed); setMeta(null); setLocal(true); setToast(`Loaded ${number(parsed.rows.length)} records locally.`);
    } catch (issue) { setError(issue.message); }
    finally { setImporting(false); event.target.value = ''; }
  }
  function exportSelected() {
    const rows = dataset.rows.filter(row => ids.includes(row['Market-id']) && row.Year === year && row.Month >= start && row.Month <= end);
    download(toCSV(rows), `atlas-${year}-${String(start).padStart(2, '0')}-to-${String(end).padStart(2, '0')}.csv`);
    setToast('Selected data exported.');
  }
  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setToast('Link copied with your current filters.'); }
    catch { setToast('Copy the page address to share this view.'); }
  }

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to dashboard</a>
    <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={importFile} className="sr-only" aria-label="Import monthly CSV" />
    {mobileMenu && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <a className="brand" href="#main-content" onClick={() => navigate('overview')}><span className="brand-mark">A<span /></span><div><strong>atlas<span>.</span></strong><small>MARKET INTELLIGENCE</small></div></a>
      <div className="workspace-label"><span className="workspace-icon"><Globe2 size={16} /></span><div><strong>Global portfolio</strong><small>Leadership workspace</small></div><ChevronDown size={14} /></div>
      <span className="nav-label">WORKSPACE</span>
      <nav aria-label="Main navigation"><button className={view === 'overview' ? 'active' : ''} onClick={() => navigate('overview')}><LayoutDashboard size={18} />Overview{view === 'overview' && <span className="nav-dot" />}</button><button className={view === 'compare' ? 'active' : ''} onClick={() => navigate('compare')}><ChartNoAxesCombined size={18} />Compare markets{view === 'compare' && <span className="nav-dot" />}</button><button className={view === 'data' ? 'active' : ''} onClick={() => navigate('data')}><Database size={18} />Data & methodology{view === 'data' && <span className="nav-dot" />}</button></nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="sidebar-note-icon"><Layers3 size={20} /></span><strong>Perspective that matters.</strong><p>Every market. Every metric.<br />One clear picture.</p><button onClick={() => navigate('data')}>Explore the data <ArrowRight size={14} /></button></div><button className="help-link" onClick={() => navigate('data')}><CircleHelp size={17} />Guide & definitions<ArrowUpRight size={14} /></button><div className="sidebar-source"><span className="source-dot" /><div><strong>{local ? 'Local preview' : 'Monthly reporting'}</strong><small>{dataset ? `Data through ${MONTHS[dataset.latest.month - 1]} ${dataset.latest.year}` : 'Connecting to dataset'}</small></div></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={13} /><strong>{view === 'overview' ? 'Portfolio overview' : view === 'compare' ? 'Market comparison' : 'Data & methodology'}</strong></div><div className="topbar-right"><span className={`badge ${local ? 'local' : meta?.kind === 'synthetic' ? 'demo' : 'success'}`}><span />{local ? 'Local CSV preview' : meta?.kind === 'synthetic' ? 'SYNTHETIC DEMO' : dataset ? 'Published data' : 'Loading data'}</span><div className="topbar-divider" /><span className="avatar" title="Executive workspace">EX</span></div></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">THE BIG PICTURE, IN FOCUS</div><h1>{view === 'overview' ? ids.length === 1 ? 'Market overview' : 'Portfolio overview' : view === 'compare' ? 'Market comparison' : 'Data & methodology'}<span>.</span></h1><p>{view === 'data' ? 'A transparent foundation for confident decisions.' : view === 'compare' ? 'Spot the leaders. Understand the differences. Find your next opportunity.' : 'A clear perspective on activity, scale, and growth across your markets.'}</p></div><div className="heading-actions">{view !== 'data' && <><button className="button icon-only" onClick={share} aria-label="Copy link to this view" title={local ? 'Local previews cannot be shared' : 'Copy link to this view'} disabled={local || !dataset || !ids.length}><Link2 size={16} /></button><button className="button" onClick={() => window.print()} disabled={!dataset || !ids.length}><ArrowDownToLine size={16} />Export report</button></>}</div></div>
        {error && <div className="error-banner" role="alert"><div><strong>Unable to load this data</strong><p>{error}</p></div><button className="button" onClick={loadPublished}>Retry published data</button><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={18} /></button></div>}
        {loading ? <div className="loading-state" role="status"><span className="loader" /><h2>Bringing your markets into focus</h2><p>Loading and validating the monthly dataset…</p></div> : !dataset ? <div className="panel empty-state"><Database size={30} /><h2>Start with your monthly data</h2><p>Load the published dataset or preview a CSV in your browser.</p><button className="button primary" onClick={() => fileInput.current.click()}><Upload size={16} />Preview a CSV</button></div> : <>
          {view === 'data' ? <DataHub dataset={dataset} meta={meta} local={local} onImport={() => fileInput.current.click()} onDownload={() => download(toCSV(dataset.rows), 'atlas-full-history.csv')} onReset={loadPublished} /> : <>
            <section className="filter-bar" aria-label="Dashboard filters"><div className="filter-left"><span className="filter-title"><SlidersHorizontal size={15} />Explore</span><MarketPicker markets={dataset.markets} selected={ids} onChange={setIds} /><div className="filter-divider" /><label className="select-wrap"><CalendarDays size={15} /><span className="sr-only">Reporting year</span><select value={year} onChange={event => setSelectedYear(event.target.value)}>{Array.from({ length: dataset.latest.year - 2018 }, (_, i) => dataset.latest.year - i).map(item => <option value={item} key={item}>{item}</option>)}</select><ChevronDown size={13} /></label><div className="month-range"><label><span className="sr-only">From month</span><select value={start} onChange={event => { const next = Number(event.target.value); setStart(next); setEnd(Math.max(next, end)); }}>{MONTHS.slice(0, maxMonth).map((month, i) => <option key={month} value={i + 1}>{month}</option>)}</select></label><span>—</span><label><span className="sr-only">Through month</span><select value={end} onChange={event => setEnd(Number(event.target.value))}>{MONTHS.slice(start - 1, maxMonth).map((month, i) => <option key={month} value={i + start}>{month}</option>)}</select></label></div></div><button className="reset-button" onClick={() => { setIds(dataset.markets.map(m => m.id)); setYear(dataset.latest.year); setStart(1); setEnd(dataset.latest.month); }}>Reset filters <RefreshCw size={12} /></button></section>
            <div className="selection-context"><span><span className="context-dot" />{scope}<span className="context-divider">/</span>{period.range}</span><span>{local ? 'Browser-only preview' : meta?.kind === 'synthetic' ? 'Illustrative data · not actual business results' : `Latest release: ${MONTHS[dataset.latest.month - 1]} ${dataset.latest.year}`}</span></div>
            {dataset.missing.length > 0 && <div className="notice warning"><FileCheck2 size={17} /><span>{dataset.missing.length} market-month records are missing. Gaps are shown as unavailable; totals never substitute zeros.</span></div>}
            {!ids.length ? <div className="panel empty-state"><Globe2 size={32} /><h2>Choose your perspective</h2><p>Select at least one market to see performance and insights.</p><button className="button primary" onClick={() => setIds(dataset.markets.map(m => m.id))}>Show all markets</button></div> : <>
              <div className="kpi-grid">{METRICS.map((metric, index) => <Kpi key={metric.key} metric={metric} index={index} data={model.summary} prior={model.prior} series={model.series} period={period} />)}</div>
              <div className="overview-grid"><CombinedChart series={model.series} period={period} /><Insights model={model} period={period} /></div>
              <div className="section-heading"><div><h2>{view === 'compare' ? 'A closer look across markets' : 'Behind the headline numbers'}</h2><p>{view === 'compare' ? `${ids.length} selected markets · consistent colors across all four charts` : 'Explore each indicator, with the detail to understand what’s changing.'}</p></div>{view === 'overview' ? <label className="toggle-label"><input type="checkbox" checked={showPrior} onChange={event => setShowPrior(event.target.checked)} /><span className="toggle" />Show prior year</label> : <span className="badge neutral">{period.range}</span>}</div>
              {view === 'compare' && <div className="selected-market-pills">{ids.map((id, i) => <button key={id} onClick={() => setIds(ids.filter(item => item !== id))} title={`Remove ${dataset.markets.find(m => m.id === id)?.name}`}><i style={{ background: COLORS[i % COLORS.length] }} />{dataset.markets.find(m => m.id === id)?.name}<X size={12} /></button>)}</div>}
              <div className="metric-grid">{METRICS.map((metric, index) => <MetricChart key={`${metric.key}-${view}`} metric={metric} index={index} model={model} dataset={dataset} ids={ids} period={period} compare={view === 'compare'} showPrior={showPrior} />)}</div>
              <PerformanceTable markets={model.markets} period={period} onDrill={id => { setIds([id]); setView('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              <div className="bottom-actions"><span><ShieldCheck size={14} />Consistent periods. Transparent calculations.</span><button className="text-button" onClick={exportSelected}><Download size={14} />Export selected data<ArrowRight size={13} /></button></div>
            </>}
          </>}
        </>}
        <footer className="page-footer"><span><strong>atlas.</strong> A clearer view of your portfolio.</span><button onClick={() => navigate('data')}>Data definitions <ArrowUpRight size={12} /></button></footer>
      </main>
    </div>
    {(toast || importing) && <div className="toast" role="status"><Check size={16} />{importing ? 'Validating your CSV…' : toast}</div>}
  </div>;
}
