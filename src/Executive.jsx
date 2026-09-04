import { PlasticChart, BasicChart } from './BalanceCharts.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check, ChevronDown, CreditCard, Download, Globe2, Maximize2, RotateCcw, TrendingUp, Users, WalletCards, X } from 'lucide-react';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { METRICS, MONTHS, compact, monthlySeries, number, parseData, periodKey, toCSV } from './data.mjs';
import { fittedTrend, executiveComparison, normalizeComparison } from './executive-data.mjs';
import { comparisonLabel, ComparisonDelta, ExecutiveReadout, YearComparison, CombinedComparison as CombinedChart, yearColor } from './ExecutiveComparison.jsx';

const METRIC_COLORS = ['#006FCF', '#0891b2', '#d08a24', '#7c3aed'];
const MARKET_COLORS = ['#006FCF', '#0891b2', '#7c3aed', '#3b82f6', '#6366f1', '#06b6d4', '#8b5cf6', '#0ea5e9', '#4f46e5', '#0284c7', '#818cf8', '#22d3ee', '#64748b', '#94a3b8'];
const metrics = METRICS.map((metric, i) => ({ ...metric, color: METRIC_COLORS[i] }));
const icons = [Activity, CreditCard, WalletCards, Users];
const axis = { axisLine: false, tickLine: false, tick: { fill: '#6f7e7b', fontSize: 13 }, minTickGap: 18 };
const grid = <CartesianGrid stroke="#e5ebe7" strokeDasharray="3 5" vertical={false} />;

function ChartTip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return <div className="ex-tooltip"><strong>{label || payload[0].name}</strong>{payload.filter(item => item.value != null).map((item, i) => <div key={i}><i style={{ background: item.color || item.payload.fill }} /><span>{item.name}</span><b>{suffix ? `${Number(item.value).toFixed(1)}${suffix}` : number(Math.round(item.value))}</b></div>)}</div>;
}

function MarketBreakdownTip({ active, payload, label, model, metricKey, colorOf, month, marketRows, heading }) {
  if (!active || !payload?.length) return null;
  const metric = metrics.find(item => item.key === metricKey);
  const activeMonth = month ?? payload[0]?.payload?.month;
  const source = marketRows ?? model.marketSeries.map(market => {
    const point = market.series.find(row => row.month === activeMonth);
    return { id: market.id, name: market.name, value: point?.[metricKey] ?? null };
  });
  const rows = source.map(market => ({ ...market, value: market.value ?? market[metricKey] ?? null })).filter(market => market.value != null).sort((a, b) => b.value - a.value);
  const aggregate = activeMonth != null ? model.series.find(row => row.month === activeMonth)?.[metricKey] : model.summary[metricKey];

  return <div className="ex-tooltip ex-market-tooltip"><strong>{heading || label || payload[0]?.payload?.label || metric.label}</strong><div className="ex-tooltip-total"><span>{metric.label}</span><b>{compact(aggregate, 2)}</b></div><p>Market breakdown</p><div className="ex-market-tooltip-list">{rows.map(row => <span key={row.id}><i style={{ background: colorOf(row.id) }} /><em>{row.id}</em><small title={row.name}>{row.name}</small><b>{compact(row.value, 2)}</b></span>)}</div></div>;
}

function MarketFilter({ markets, selected, onChange }) {
  const ref = useRef(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const dismiss = event => { if (!ref.current?.contains(event.target) && ref.current) ref.current.open = false; };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  return <div className="ex-country-field"><span className="ex-country-label" id="ex-country-label">Country</span><details className="ex-market-filter" ref={ref} onKeyDown={event => { if (event.key === 'Escape') { ref.current.open = false; ref.current.querySelector('summary').focus(); } }}>
    <summary aria-labelledby="ex-country-label ex-country-selection"><Globe2 size={18} /><span id="ex-country-selection">{selected.length === markets.length ? `All ${markets.length} markets` : selected.length === 1 ? markets.find(market => market.id === selected[0])?.name : `${selected.length} markets selected`}</span><ChevronDown size={15} /></summary>
    <div className="ex-market-menu"><input aria-label="Search markets" placeholder="Find your market…" value={query} onChange={event => setQuery(event.target.value)} /><div className="ex-market-tools"><button onClick={() => onChange(markets.map(market => market.id))}>Select all</button><button onClick={() => onChange([])}>Clear</button><span>{selected.length} selected</span></div>
      <div className="ex-market-options">{markets.filter(market => `${market.name} ${market.id}`.toLowerCase().includes(query.toLowerCase())).map(market => <div key={market.id}><label><input type="checkbox" checked={selected.includes(market.id)} onChange={() => onChange(selected.includes(market.id) ? selected.filter(id => id !== market.id) : [...selected, market.id])} /><span>{market.id}</span>{market.name}</label><button aria-label={`Show only ${market.name}`} onClick={() => { onChange([market.id]); ref.current.open = false; }}>Only</button></div>)}</div>
      <button className="ex-apply" onClick={() => { ref.current.open = false; ref.current.querySelector('summary').focus(); }}>Apply selection <Check size={17} /></button>
    </div>
  </details></div>;
}

function MetricCards({ model, period }) {
  return <div className="ex-kpis">{metrics.map((metric, i) => {
    const Icon = icons[i];
    return <article className={`ex-kpi ex-kpi-${i}`} key={metric.key} style={{ '--metric-color': metric.color }}><div className="ex-kpi-top"><span>{metric.label}</span><Icon size={23} strokeWidth={1.7} /></div><strong className="ex-kpi-number" title={number(model.summary[metric.key])}>{compact(model.summary[metric.key], 2)}</strong><div className="ex-kpi-change"><ComparisonDelta model={model} metricKey={metric.key} /><span>{model.mode === 'months' ? 'first-to-last · ' : model.mode === 'all' ? 'range vs. ' : 'vs. '}{comparisonLabel(model)}</span></div><div className="ex-kpi-foot">{metric.kind === 'flow' ? 'PERIOD VOLUME' : 'MONTH-END BALANCE'}<span>{metric.kind === 'flow' ? period.short : model.hasReportedMonths ? `${MONTHS[period.end - 1]}` : 'Not reported'}</span></div></article>;
  })}</div>;
}

function TransactionChart({ model, period, marketRows, selected, colorOf, compare }) {
  const [trend, setTrend] = useState(true);
  const [prior, setPrior] = useState(true);
  const trendRows = fittedTrend(model.reportedSeries, 'Txn-count');
  const fitted = model.series.map((row, i) => ({ ...row, fitted: trendRows[i]?.fitted ?? null, previous: model.previous[i]?.['Txn-count'], ...Object.fromEntries(model.comparisons.map(reference => [`year${reference.year}`, reference.series[i]?.['Txn-count']])) }));
  const stacked = marketRows.map((row, i) => ({ ...row, ...Object.fromEntries(model.comparisons.map(reference => [`year${reference.year}`, reference.series[i]?.['Txn-count']])) }));
  const max = model.series.filter(row => row['Txn-count'] != null).sort((a, b) => b['Txn-count'] - a['Txn-count'])[0];
  return <section className="ex-panel ex-transactions" id="activity">
    <div className="ex-panel-heading"><div><span className="ex-chart-eyebrow"><i style={{ background: metrics[0].color }} />01 / ACTIVITY</span><h2>Transaction momentum</h2><p>{compare ? 'Monthly volume, stacked by selected market' : 'Monthly volume with a clear view of direction'}</p></div><span className="ex-chart-badge">{compare ? 'STACKED BARS' : 'BARS + TREND'}</span></div>
    <div className="ex-chart-controls"><span className="ex-current-legend"><i />{period.year}</span>{model.mode !== 'months' && <label><input type="checkbox" checked={prior} onChange={event => setPrior(event.target.checked)} />Show comparison years</label>}{!compare && <label><input type="checkbox" checked={trend} onChange={event => setTrend(event.target.checked)} /><span className="ex-dash" />Fitted trend</label>}{compare && <div className="ex-series-legend">{selected.map(market => <span key={market.id}><i style={{ background: colorOf(market.id) }} />{market.id}</span>)}</div>}</div>
    {prior && model.mode !== 'months' && <div className="ex-year-legend">{model.comparisons.map(reference => <span key={reference.year}><i style={{ background: yearColor(reference.year) }} />{reference.year}</span>)}</div>}
    <div className="ex-chart ex-volume-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={compare ? stacked : fitted} margin={{ left: 2, right: 15, top: 16, bottom: 4 }} accessibilityLayer>
      {grid}<XAxis dataKey="label" {...axis} dy={8} /><YAxis {...axis} tickFormatter={value => compact(value)} width={62} domain={[0, 'auto']} /><Tooltip content={compare ? <ChartTip /> : <MarketBreakdownTip model={model} metricKey="Txn-count" colorOf={colorOf} />} cursor={{ fill: '#193d3006' }} />
      {compare ? selected.map(market => <Bar key={market.id} dataKey={market.id} name={market.name} stackId="markets" fill={colorOf(market.id)} maxBarSize={42} isAnimationActive={false} />) : <>
        {prior && model.mode !== 'all' && model.comparisons.length > 0 && <Bar dataKey="previous" name={`${comparisonLabel(model)} transactions`} fill={yearColor(model.comparisons[0].year)} fillOpacity={.5} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />}
        <Bar dataKey="Txn-count" name={`${period.year} transactions`} fill="#006FCF" radius={[5, 5, 0, 0]} maxBarSize={38} isAnimationActive={false} />
        {trend && <Line type="linear" dataKey="fitted" name="Fitted trend (not a forecast)" stroke="#c18b3e" strokeWidth={3} strokeDasharray="6 5" dot={false} isAnimationActive={false} />}
      </>}
      {prior && (compare || model.mode === 'all') && model.comparisons.map(reference => <Line key={reference.year} dataKey={`year${reference.year}`} name={`${reference.year} transactions`} stroke={yearColor(reference.year)} strokeWidth={2} dot={period.start === period.end ? { r: 4 } : false} isAnimationActive={false} />)}
    </ComposedChart></ResponsiveContainer></div>
    <div className="ex-chart-footer"><TrendingUp size={17} /><span>{max ? <><strong>{max.label}</strong> recorded the highest observed volume: <strong>{compact(max['Txn-count'], 2)}</strong>.</> : 'No complete monthly totals are available.'}</span><span className="ex-footer-note">{compare ? 'Each bar = monthly total' : 'Trend fitted to observed months only'}</span></div>
  </section>;
}

function AccountsChart({ model, period, colorOf }) {
  const [prior, setPrior] = useState(true);
  const rows = model.series.map((row, i) => ({ ...row, ...Object.fromEntries(model.comparisons.map(reference => ['year' + reference.year, reference.series[i]?.['Active Accounts']])) }));
  const start = rows[0]?.['Active Accounts'];
  const last = model.summary['Active Accounts'];
  const delta = start != null && last != null ? last - start : null;
  return <section className="ex-panel ex-accounts"><div className="ex-panel-heading"><div><span className="ex-chart-eyebrow"><i style={{ background: metrics[3].color }} />04 / ACCOUNTS</span><h2>The account growth story</h2><p>Monthly active account snapshots</p></div>{model.mode !== 'months' && <label className="ex-check"><input type="checkbox" checked={prior} onChange={event => setPrior(event.target.checked)} />Comparison years</label>}</div>
    <div className="ex-account-headline"><strong>{compact(last, 2)}</strong><span>at {period.last}</span><ComparisonDelta model={model} metricKey="Active Accounts" /></div>
    {prior && model.mode !== 'months' && <div className="ex-year-legend">{model.comparisons.map(reference => <span key={reference.year}><i style={{ background: yearColor(reference.year) }} />{reference.year}</span>)}</div>}
    <div className="ex-chart ex-accounts-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{ left: 0, right: 20, top: 10, bottom: 5 }} accessibilityLayer><defs><linearGradient id="ex-accounts-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={.32} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={.015} /></linearGradient></defs>{grid}<XAxis dataKey="label" {...axis} dy={8} /><YAxis {...axis} width={60} tickFormatter={value => compact(value)} domain={[0, 'auto']} /><Tooltip content={<MarketBreakdownTip model={model} metricKey="Active Accounts" colorOf={colorOf} />} />{prior && model.comparisons.map(reference => <Line key={reference.year} type="monotone" dataKey={`year${reference.year}`} name={`${reference.year} accounts`} stroke={yearColor(reference.year)} strokeWidth={2} strokeDasharray="5 5" dot={period.start === period.end ? { r: 3 } : false} isAnimationActive={false} />)}<Area type="monotone" dataKey="Active Accounts" name={`${period.year} accounts`} stroke="#7c3aed" fill="url(#ex-accounts-gradient)" strokeWidth={3} dot={{ r: 3, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>
    <div className="ex-chart-footer"><Users size={17} /><span>{rows.length === 1 ? 'One month selected. Expand the period to see the trend.' : delta == null ? 'Account movement is unavailable for this selection.' : <><strong>{delta >= 0 ? '+' : '−'}{compact(Math.abs(delta), 2)}</strong> accounts from {MONTHS[period.start - 1]} to {MONTHS[period.end - 1]}.</>}</span><span className="ex-footer-note">Balances are never summed over time</span></div>
  </section>;
}

function Scorecard({ model, period, onSelect }) {
  const [sort, setSort] = useState('Txn-count');
  const [query, setQuery] = useState('');
  const rows = [...model.markets].filter(market => market.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity));
  const maxima = Object.fromEntries(metrics.map(metric => [metric.key, Math.max(0, ...model.markets.map(market => market[metric.key] || 0))]));
  return <section className="ex-panel ex-scorecard" id="scorecard"><div className="ex-panel-heading"><div><span className="ex-chart-eyebrow"><i />THE MARKET SCORECARD</span><h2>See how every market stacks up.</h2><p>Transactions: {period.range} · balances: {period.last}</p></div><div className="ex-score-controls"><input aria-label="Search scorecard" placeholder="Search a market…" value={query} onChange={event => setQuery(event.target.value)} /><label><span>Rank by</span><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Rank markets by metric">{metrics.map(metric => <option key={metric.key} value={metric.key}>{metric.short}</option>)}</select></label></div></div>
    <div className="ex-table-scroll"><table><thead><tr><th>Market</th>{metrics.map(metric => <th key={metric.key}>{metric.short}</th>)}<th>{model.mode === 'months' ? `Txn change · ${comparisonLabel(model)}` : `Txn vs. ${model.mode === 'all' ? 'earlier years' : comparisonLabel(model)}`}</th></tr></thead><tbody>{rows.map((market, i) => <tr key={market.id}><td><button onClick={() => onSelect([market.id])}><span className="ex-rank">{String(i + 1).padStart(2, '0')}</span><span className="ex-market-code">{market.id}</span><strong>{market.name}</strong><ArrowUpRight size={15} /></button></td>{metrics.map(metric => <td key={metric.key} title={number(market[metric.key])}><div className="ex-table-value"><span>{compact(market[metric.key], 2)}</span><i style={{ width: `${maxima[metric.key] ? market[metric.key] / maxima[metric.key] * 100 : 0}%`, background: metric.color }} /></div></td>)}<td><ComparisonDelta model={model} metricKey="Txn-count" marketId={market.id} /></td></tr>)}</tbody></table>{!rows.length && <div className="ex-chart-empty">No markets match this search.</div>}</div><div className="ex-chart-footer"><Maximize2 size={16} /><span>Click any market for a focused view. In-cell bars compare scale within each metric.</span></div></section>;
}

export default function Executive() {
  const [dataset, setDataset] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ year: 2026, start: 1, end: 12, ids: [], compare: false, comparison: 'prior' });
  const [toast, setToast] = useState('');
  const [reload, setReload] = useState(0);
  const help = useRef(null);

  useEffect(() => {
    let active = true;
    setError('');
    (async () => {
      try {
        const [csv, meta] = await Promise.all([fetch('./data/markets.csv', { cache: 'no-cache' }), fetch('./data/metadata.json', { cache: 'no-cache' })]);
        if (!csv.ok || !meta.ok) throw new Error('The monthly dataset could not be loaded. Please retry.');
        const data = parseData(await csv.text());
        const info = await meta.json();
        if (!['synthetic', 'production'].includes(info.kind) || info.through !== periodKey(data.latest.year, data.latest.month)) throw new Error('The data and release metadata do not match. Publish both files together.');

        const params = new URLSearchParams(window.location.search);
        const inputYear = Number(params.get('year'));
        const year = Number.isInteger(inputYear) && inputYear >= 2019 && inputYear <= data.latest.year ? inputYear : data.latest.year;
        const max = 12;
        const clamp = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Math.max(1, Math.min(max, Math.floor(Number(value)))) : fallback;
        const start = clamp(params.get('from'), 1);
        const end = Math.max(start, clamp(params.get('to'), max));
        const ids = [...new Set((params.get('markets') || '').split(',').filter(id => data.markets.some(market => market.id === id)))];
        if (active) { setDataset(data); setMetadata(info); setFilters({ year, start, end, ids: ids.length ? ids : data.markets.map(market => market.id), compare: params.get('compare') === 'true', comparison: normalizeComparison(params.get('comparison') || (params.get('breakdown') === 'month' ? 'months' : null), year, data.latest.year) }); }
      } catch (issue) { if (active) setError(issue.message); }
    })();
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (!dataset) return;
    const params = new URLSearchParams({ year: String(filters.year), from: String(filters.start), to: String(filters.end), markets: filters.ids.join(','), compare: String(filters.compare), comparison: filters.comparison });
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }, [dataset, filters]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); } }, [toast]);

  const { ids, year, start, end, compare, comparison } = filters;
  const model = useMemo(() => dataset ? executiveComparison(dataset, ids, year, start, end, comparison) : null, [dataset, ids, year, start, end, comparison]);
  const marketRows = useMemo(() => {
    if (!dataset || !model) return [];
    const individual = ids.map(id => ({ id, rows: monthlySeries(dataset.rows, [id], year, start, end) }));
    return model.series.map((row, i) => ({ label: row.label, ...Object.fromEntries(individual.map(market => [market.id, row.complete ? market.rows[i]['Txn-count'] : null])) }));
  }, [dataset, model, ids, year, start, end]);
  const marketColorOrder = useMemo(() => dataset ? dataset.rows
    .filter(row => row.Year === dataset.latest.year && row.Month === dataset.latest.month)
    .sort((a, b) => b['Txn-count'] - a['Txn-count'])
    .map(row => row['Market-id']) : [], [dataset]);
  const selectedPeriod = { year, start, end, short: `${MONTHS[start - 1]}${start === end ? '' : `–${MONTHS[end - 1]}`}`, range: `${MONTHS[start - 1]}${start === end ? '' : `–${MONTHS[end - 1]}`} ${year}` };
  const reportedEnd = model?.hasReportedMonths ? model.reportedEnd : end;
  const reportedShort = model?.hasReportedMonths ? `${MONTHS[start - 1]}${start === reportedEnd ? '' : `–${MONTHS[reportedEnd - 1]}`}` : 'No reported months';
  const period = { ...selectedPeriod, end: reportedEnd, selectedEnd: end, short: reportedShort, range: `${reportedShort} ${year}`, last: model?.hasReportedMonths ? `${MONTHS[reportedEnd - 1]} ${year}` : 'no reported month', selectedShort: selectedPeriod.short };
  const partialYear = dataset && year === dataset.latest.year && dataset.latest.month < 12;
  const colorOf = id => MARKET_COLORS[Math.max(0, marketColorOrder.indexOf(id)) % MARKET_COLORS.length];
  const selected = dataset?.markets.filter(market => ids.includes(market.id)) || [];
  const maxMonth = 12;
  const scope = ids.length === dataset?.markets.length ? 'Global portfolio' : ids.length === 1 ? selected[0]?.name : `${ids.length} selected markets`;
  function choose(ids) { setFilters(current => ({ ...current, ids })); }
  function reset() { setFilters({ year: dataset.latest.year, start: 1, end: 12, ids: dataset.markets.map(market => market.id), compare: false, comparison: 'prior' }); }
  function compareMarkets() {
    setFilters(current => ({ ...current, compare: !current.compare, ids: !current.compare && current.ids.length === dataset.markets.length ? [...model.markets].sort((a, b) => (b['Txn-count'] || 0) - (a['Txn-count'] || 0)).slice(0, 4).map(market => market.id) : current.ids }));
  }
  function exportCSV() {
    const rows = dataset.rows.filter(row => ids.includes(row['Market-id']) && [year, ...model.comparisons.map(reference => reference.year)].includes(row.Year) && row.Month >= start && row.Month <= model.reportedEnd);
    const url = URL.createObjectURL(new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `atlas-executive-${year}-${start}-${model.reportedEnd}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setToast(model.mode === 'months' ? 'Your selected-year monthly data has been exported.' : 'Your reporting and comparison-year data has been exported.');
  }

  return <div className="executive-app"><a className="ex-skip" href="#ex-main">Skip to dashboard</a>
    <header className="ex-top"><div className="ex-top-inner"><a href="./index.html" className="ex-brand"><span className="ex-brand-symbol"><BarChart3 size={27} /></span><strong>atlas<span>.</span></strong><span className="ex-brand-divider" /><span className="ex-edition">EXECUTIVE<br /><b>MARKET INTELLIGENCE</b></span></a></div></header>
    <main id="ex-main" className="ex-main"><div className="ex-heading"><div><div className="ex-eyebrow"><span />THE EXECUTIVE BRIEF</div><h1>Portfolio performance<span>.</span></h1><p>The scale. The momentum. The markets behind it.</p></div><div className="ex-heading-right"><button className="ex-about-button" onClick={() => help.current.showModal()}>About these numbers</button>{dataset && <span className="ex-asof">Data through <strong>{MONTHS[dataset.latest.month - 1]} {dataset.latest.year}</strong></span>}</div></div>
      {error ? <div className="ex-error" role="alert"><h2>We couldn’t load this release.</h2><p>{error}</p><button onClick={() => setReload(value => value + 1)}>Try again</button></div> : !dataset ? <div className="ex-loading" role="status"><span />Preparing your executive brief…</div> : <>
        <section className="ex-filters" aria-label="Executive dashboard filters"><div className="ex-filter-main"><MarketFilter markets={dataset.markets} selected={ids} onChange={choose} /><label className="ex-year"><CalendarDays size={18} /><select aria-label="Reporting year" value={year} onChange={event => { const next = Number(event.target.value); const max = 12; setFilters(current => ({ ...current, year: next, comparison: normalizeComparison(current.comparison, next, dataset.latest.year), start: Math.min(current.start, max), end: Math.min(current.end, max) })); }}>{Array.from({ length: dataset.latest.year - 2018 }, (_, i) => dataset.latest.year - i).map(year => <option key={year}>{year}</option>)}</select></label><div className="ex-months"><select aria-label="From month" value={start} onChange={event => { const next = Number(event.target.value); setFilters(current => ({ ...current, start: next, end: Math.max(next, current.end) })); }}>{MONTHS.slice(0, maxMonth).map((month, i) => <option value={i + 1} key={month}>{month}</option>)}</select><span>to</span><select aria-label="Through month" value={end} onChange={event => setFilters(current => ({ ...current, end: Number(event.target.value) }))}>{MONTHS.slice(start - 1, maxMonth).map((month, i) => <option value={i + start} key={month}>{month}</option>)}</select></div><button className={`ex-compare-button ${compare ? 'active' : ''}`} aria-pressed={compare} onClick={compareMarkets}><BarChart3 size={17} />Compare markets</button><button className="ex-reset" onClick={reset} aria-label="Reset all filters" title="Reset filters"><RotateCcw size={17} /></button></div><div className="ex-filter-actions"><button onClick={exportCSV} disabled={!ids.length}><Download size={17} /><span>Export CSV</span></button></div></section>
        <section className="ex-comparison-controls" aria-label="Comparison controls"><label><span>Compare {year} with</span><select aria-label="Comparison mode" value={comparison} onChange={event => setFilters(current => ({ ...current, comparison: event.target.value }))}><option value="months">Months within {year}</option><option value="prior">Previous year{year > 2019 ? ` (${year - 1})` : ' (unavailable)'}</option><option value="all">All previous years ({year - 2019})</option><optgroup label="Choose a specific year">{Array.from({ length: dataset.latest.year - 2018 }, (_, i) => dataset.latest.year - i).filter(reference => reference !== year).map(reference => <option key={reference} value={reference}>{reference}</option>)}</optgroup></select></label><p>{model.mode === 'months' ? `Compares reported months inside ${year}. KPI and scorecard changes use the first and last month.` : `Matches ${period.short} across the same markets. Missing months stay unavailable.`}</p><a href="#year-comparison">Explore comparison <ArrowRight size={14} /></a></section>
        <div className="ex-context"><div><Globe2 size={15} /><strong>{scope}</strong><span>/</span>{selectedPeriod.range}</div><div><span className="ex-coverage-dot" />{dataset.missing.length ? `${dataset.missing.length} missing market-month records` : partialYear ? 'Partial year · reported months available' : 'Complete monthly coverage'}</div></div>
        {partialYear && <div className="ex-partial-year" role="status"><CalendarDays size={21} /><div><strong>Partial-year reporting · {year}</strong><p>Data is available through {MONTHS[dataset.latest.month - 1]} {year}. {model.hasReportedMonths ? <>For your {selectedPeriod.short} selection, calculations use <b>{period.short}</b>; card and account balances are at <b>{period.last}</b>.</> : <>Your {selectedPeriod.short} selection has no reported months yet.</>} Later months are marked “Not yet reported”.</p></div></div>}
        {dataset.missing.length > 0 && <div className="ex-data-warning">Incomplete observations are shown as unavailable. Selected-market totals are not filled with zeros.</div>}
        {!ids.length ? <div className="ex-no-markets"><Globe2 size={35} /><h2>Choose a market to begin.</h2><p>Select one market for detail or several for comparison.</p><button onClick={reset}>Show the full portfolio <ArrowRight size={17} /></button></div> : <>
          <MetricCards model={model} period={period} />
          <ExecutiveReadout model={model} period={period} />
          <YearComparison model={model} period={period} />
          {compare && <div className="ex-selection-chips">{selected.map(market => <button key={market.id} onClick={() => choose(ids.filter(id => id !== market.id))} aria-label={`Remove ${market.name}`}><i style={{ background: colorOf(market.id) }} />{market.name}<X size={14} /></button>)}</div>}
          <div className="ex-section-intro"><div><span>PERFORMANCE EXPLORER</span><h2>A different lens on every metric.</h2></div><a href="#combined">See the combined view <ArrowRight size={16} /></a></div>
          <div className="ex-chart-grid"><TransactionChart model={model} period={period} marketRows={marketRows} selected={selected} colorOf={colorOf} compare={compare} /><PlasticChart model={model} period={period} colorOf={colorOf} onSelect={choose} /><BasicChart model={model} period={period} colorOf={colorOf} onSelect={choose} /><AccountsChart model={model} period={period} colorOf={colorOf} /></div>
          <CombinedChart model={model} period={period} /><Scorecard model={model} period={period} onSelect={choose} />
          <div className="ex-final-actions"><span><Check size={16} />One dataset. Consistent definitions. Clear comparisons.</span></div>
        </>}
      </>}
      <footer className="ex-page-footer"><span className="ex-footer-brand">atlas<span>.</span></span><span>Market intelligence, with perspective.</span></footer>
    </main>
    <dialog className="ex-help" ref={help}><div><span className="ex-chart-eyebrow">THE METHODOLOGY</span><button aria-label="Close metric definitions" onClick={() => help.current.close()}><X size={23} /></button></div><h2>Good decisions start with clear definitions.</h2><dl><dt>Transactions are period totals.</dt><dd>We sum transactions for the selected markets and months. Bar charts show individual monthly totals.</dd><dt>Cards and accounts are snapshots.</dt><dd>KPI cards and year-comparison balances use the last reported month within the selection. If the selection contains no reported months, balances are unavailable. Monthly snapshots are never summed across time.</dd><dt>Comparison choices.</dt><dd>Choose months within the selected year, any available comparison year, or every previous year separately. Within-year KPI and scorecard changes compare the first and last reported month; the combined chart shows month-over-month change. Year baselines use the same markets and months. When the reporting year is partial, year summaries stop at its latest reported month for every comparison year. Missing or zero baselines show no percentage.</dd><dt>Trendlines describe history.</dt><dd>The dashed transaction trend is a linear least-squares fit across the selected months. It is not a forecast. It requires at least two complete months.</dd><dt>Pie slices compare period snapshots.</dt><dd>Each plastic slice represents the selected markets’ balance in one year or month. Slice areas compare those snapshots; they are not distinct populations and must not be summed into a portfolio total across time. Hover any slice to see its market breakdown.</dd></dl><p className="ex-help-note">{metadata?.kind === 'synthetic' ? 'This release contains synthetic full-month demonstration data.' : 'Source: published monthly market dataset.'} Confirm source definitions of “plastic,” “basic,” and “active” with the data owner.</p></dialog>
    {toast && <div className="ex-toast" role="status"><Check size={18} />{toast}</div>}
  </div>;
}
