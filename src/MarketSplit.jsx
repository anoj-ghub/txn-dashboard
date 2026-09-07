import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { METRICS, compact, percent } from './data.mjs';
import { splitMarketRows } from './market-split.mjs';

const colors = ['#006FCF', '#0891b2', '#7c3aed', '#b45309', '#be185d', '#0f766e', '#c2410c', '#475569', '#4338ca', '#9f1239', '#0369a1', '#6d28d9', '#64748b', '#22a06b'];

export function MarketSplit({ model, period, metricKey, mode = 'period', pie = false, line = false, colorOf, children }) {
  const [separate, setSeparate] = useState(false);
  const [selectedKey, setSelectedKey] = useState('Txn-count');
  const key = metricKey ?? selectedKey;
  const markets = model.marketSeries;
  const color = id => colorOf ? colorOf(id) : colors[markets.findIndex(market => market.id === id) % colors.length];
  const rows = splitMarketRows(model, period.year, key, mode);
  const format = mode === 'growth' ? percent : mode === 'indexed' ? value => `${Number(value).toFixed(1)} pts` : value => compact(value, 2);
  const Chart = line || mode === 'indexed' ? LineChart : BarChart;
  const Series = line || mode === 'indexed' ? Line : Bar;
  return <div className="ex-market-split">
    <div className="ex-market-split-controls"><label><input type="checkbox" checked={separate} onChange={event => setSeparate(event.target.checked)} />Separate markets</label>{separate && <span>{markets.length} markets · {pie ? 'one pie per period' : line || mode === 'indexed' ? 'one line per market' : 'one bar per market in each period'}</span>}</div>
    {!separate ? children : <>
      <>{!metricKey && <div className="ex-history-tabs">{METRICS.map(metric => <button key={metric.key} aria-pressed={key === metric.key} className={key === metric.key ? "active" : ""} onClick={() => setSelectedKey(metric.key)}>{metric.label}</button>)}</div>}</>
      <div className="ex-series-legend ex-split-legend">{markets.map(market => <span key={market.id} title={market.name}><i style={{ background: color(market.id) }} />{market.id} · {market.name}</span>)}</div>
      {pie ? <div className="ex-split-pies">{rows.map(row => {
        const slices = markets.map(market => ({ name: `${market.id} · ${market.name}`, id: market.id, value: row[market.id] })).filter(slice => slice.value > 0);
        return <article key={row.label}><h3>{row.label}</h3>{slices.length ? <ResponsiveContainer width="100%" height={230}><PieChart><Pie data={slices} dataKey="value" nameKey="name" outerRadius={95} isAnimationActive={false}>{slices.map(slice => <Cell key={slice.id} fill={color(slice.id)} />)}</Pie><Tooltip formatter={format} /></PieChart></ResponsiveContainer> : <div className="ex-chart-empty">No positive reported balances.</div>}</article>;
      })}</div> : <div className="ex-history-scroll" tabIndex={0} aria-label="Market comparison chart; scroll to see every period"><div style={{ height: 340, minWidth: Math.max(320, rows.length * (line || mode === 'indexed' ? 80 : Math.max(100, markets.length * 20 + 30)) + 80) }}><ResponsiveContainer width="100%" height="100%"><Chart data={rows} margin={{ top: 20, right: 24, bottom: 12, left: 12 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e5ebe7" strokeDasharray="3 5" /><XAxis dataKey="label" interval={0} tick={{ fontSize: 12 }} /><YAxis width={65} tickFormatter={mode === 'growth' ? value => `${compact(value)}%` : value => compact(value)} /><Tooltip formatter={format} />{markets.map(market => <Series key={market.id} dataKey={market.id} name={`${market.id} · ${market.name}`} fill={color(market.id)} stroke={color(market.id)} maxBarSize={24} strokeWidth={line || mode === 'indexed' ? 2 : 0} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />)}</Chart></ResponsiveContainer></div></div>}
      <p className="ex-scroll-hint">{METRICS.find(metric => metric.key === key)?.label} · {mode === 'monthly' || mode === 'indexed' || model.mode === 'months' ? period.year : 'Matched periods'} · Missing values remain gaps.{!pie && ' Scroll horizontally to see every group.'}</p>
    </>}
  </div>;
}
