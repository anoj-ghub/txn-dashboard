import { useState } from 'react';
import { ArrowUpRight, BarChart3, ChevronDown, CreditCard, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MONTHS, compact, number } from './data.mjs';
import { balancePeriods } from './executive-data.mjs';

const periodColors = ['#006FCF', '#0891b2', '#7c3aed', '#b45309', '#be185d', '#0f766e', '#c2410c', '#475569', '#4338ca', '#9f1239', '#0369a1', '#6d28d9'];
const colorFor = (snapshot, monthly) => periodColors[(monthly ? snapshot.month - 1 : (2026 - snapshot.year + 120)) % periodColors.length];
const axis = { axisLine: false, tickLine: false, tick: { fill: '#607b99', fontSize: 13 } };

function SnapshotTooltip({ active, payload, snapshots, metricKey, colorOf }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const snapshot = item.payload.snapshot ?? snapshots.find(row => row.id === item.dataKey);
  if (!snapshot) return null;
  const marketId = item.payload.id;
  const rows = [...snapshot.markets].filter(market => market[metricKey] != null).sort((a, b) => b[metricKey] - a[metricKey]);
  return <div className="ex-tooltip ex-market-tooltip ex-balance-tooltip">
    <strong>{MONTHS[snapshot.month - 1]} {snapshot.year}{snapshot.partial ? ' · partial month' : ''}</strong>
    <div className="ex-tooltip-total"><span>All selected markets</span><b>{compact(snapshot.summary[metricKey], 2)}</b></div>
    <p>{metricKey === 'Total Active Plastic' ? 'Active plastic' : 'Active basic'} · market breakdown</p>
    <div className="ex-market-tooltip-list">{rows.map(row => <span className={row.id === marketId ? 'is-hovered-market' : ''} key={row.id}><i style={{ background: colorOf(row.id) }} /><em>{row.id}</em><small title={row.name}>{row.name}</small><b>{compact(row[metricKey], 2)}</b></span>)}</div>
  </div>;
}

function EmptyChart({ children }) {
  return <div className="ex-chart-empty ex-balance-empty"><BarChart3 size={30} /><p>{children}</p></div>;
}

function PeriodLegend({ snapshots, monthly, metricKey }) {
  return <div className="ex-period-legend">{snapshots.map(snapshot => <span key={snapshot.id} className={snapshot.summary[metricKey] == null ? 'is-unreported' : ''}><i style={{ background: colorFor(snapshot, monthly) }} /><strong>{snapshot.label}</strong><span title={number(snapshot.summary[metricKey])}>{compact(snapshot.summary[metricKey], 2)}</span></span>)}</div>;
}

function PieLabel({ cx, cy, midAngle, outerRadius, percent, payload }) {
  if (percent < 0.04) return null;
  const radians = Math.PI / 180;
  const radius = outerRadius * 0.7;
  return <text x={cx + radius * Math.cos(-midAngle * radians)} y={cy + radius * Math.sin(-midAngle * radians)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={750}>{payload.name}</text>;
}

export function PlasticChart({ model, period, colorOf }) {
  const monthly = model.mode === 'months';
  const snapshots = balancePeriods(model, period.year);
  const key = 'Total Active Plastic';
  const slices = snapshots.filter(snapshot => snapshot.summary[key] > 0).map(snapshot => ({ name: snapshot.label, value: snapshot.summary[key], snapshot }));
  return <section className="ex-panel ex-plastic ex-balance-panel">
    <div className="ex-panel-heading"><div><span className="ex-chart-eyebrow"><i style={{ background: '#0891b2' }} />02 / PLASTIC</span><h2>{monthly ? 'Active plastic across months.' : 'Active plastic across years.'}</h2><p>{monthly ? `${period.year} · one slice per reported month` : `${model.hasReportedMonths ? MONTHS[period.end - 1] : 'Unavailable'} snapshots · one slice per year`}</p></div><span className="ex-chart-badge">PIE COMPARISON</span></div>
    <div className="ex-balance-plot ex-period-pie">{slices.length ? <ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer margin={{ top: 22, bottom: 22, left: 22, right: 22 }}><Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="91%" innerRadius={0} startAngle={90} endAngle={-270} paddingAngle={1.5} stroke="#fff" strokeWidth={2} labelLine={false} label={<PieLabel />} isAnimationActive={false}>{slices.map(slice => <Cell key={slice.snapshot.id} fill={colorFor(slice.snapshot, monthly)} />)}</Pie><Tooltip content={<SnapshotTooltip snapshots={snapshots} metricKey={key} colorOf={colorOf} />} /></PieChart></ResponsiveContainer> : <EmptyChart>No positive reported plastic balances in this selection.</EmptyChart>}</div>
    <PeriodLegend snapshots={snapshots} monthly={monthly} metricKey={key} />
    <div className="ex-chart-footer"><CreditCard size={17} /><span>Slice size compares snapshot balances across {monthly ? 'months' : 'years'}. These are separate observations, not an additive portfolio total. Hover any slice for its market breakdown.{snapshots.some(row => row.partial) && ' * Partial month.'}</span></div>
  </section>;
}

export function BasicChart({ model, period, colorOf, onSelect }) {
  const [allMarkets, setAllMarkets] = useState(false);
  const monthly = model.mode === 'months';
  const snapshots = balancePeriods(model, period.year);
  const key = 'Total Active Basic';
  const ranked = [...model.markets].sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity));
  const markets = ranked.slice(0, allMarkets ? ranked.length : 6);
  const rows = monthly ? snapshots.map(snapshot => ({ label: snapshot.label, value: snapshot.summary[key], snapshot })) : markets.map(market => ({ id: market.id, label: market.id, ...Object.fromEntries(snapshots.map(snapshot => [snapshot.id, snapshot.markets.find(row => row.id === market.id)?.[key] ?? null])) }));
  const available = snapshots.some(snapshot => snapshot.markets.some(market => market[key] != null));
  const minWidth = monthly ? 0 : Math.max(0, markets.length * Math.max(72, snapshots.length * 11 + 20) + 70);
  return <section className="ex-panel ex-basic ex-balance-panel">
    <div className="ex-panel-heading"><div><span className="ex-chart-eyebrow"><i style={{ background: '#b45309' }} />03 / BASIC</span><h2>{monthly ? 'Active basic across months.' : 'Compare years in one view.'}</h2><p>{monthly ? `${period.year} · monthly balances across selected markets` : `${model.hasReportedMonths ? MONTHS[period.end - 1] : 'Unavailable'} snapshots · markets grouped by year`}</p></div>{!monthly && <button className="ex-subtle-button" onClick={() => setAllMarkets(!allMarkets)}>{allMarkets ? 'Top 6 markets' : 'All markets'}<ChevronDown size={14} /></button>}</div>
    {available ? <div className="ex-balance-scroll" tabIndex={0} aria-label="Active basic comparison chart; scroll horizontally to see all market groups"><div className="ex-balance-plot" style={{ minWidth }}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ left: 3, right: 16, top: 30, bottom: 16 }} barCategoryGap="18%" barGap={2} accessibilityLayer><CartesianGrid vertical={false} stroke="#e4edf6" strokeDasharray="3 5" /><XAxis dataKey="label" {...axis} interval={monthly ? 'preserveStartEnd' : 0} dy={6} /><YAxis {...axis} width={64} domain={[0, 'auto']} tickFormatter={value => compact(value)} /><Tooltip shared={false} cursor={false} content={<SnapshotTooltip snapshots={snapshots} metricKey={key} colorOf={colorOf} />} />{monthly ? <Bar dataKey="value" name="Active basic" maxBarSize={42} radius={[5, 5, 0, 0]} isAnimationActive={false}>{snapshots.map(snapshot => <Cell key={snapshot.id} fill={colorFor(snapshot, true)} />)}</Bar> : snapshots.map(snapshot => <Bar key={snapshot.id} dataKey={snapshot.id} name={snapshot.label} fill={colorFor(snapshot, false)} maxBarSize={40} radius={[3, 3, 0, 0]} isAnimationActive={false} />)}</BarChart></ResponsiveContainer></div></div> : <EmptyChart>No reported basic balances in this selection.</EmptyChart>}
    <PeriodLegend snapshots={snapshots} monthly={monthly} metricKey={key} />
    {!monthly && <div className="ex-ranking-key ex-grouped-market-key">{markets.map(market => <button key={market.id} onClick={() => onSelect([market.id])}><b>{market.id}</b>{market.name}<ArrowUpRight size={12} /></button>)}</div>}
    <div className="ex-chart-footer"><WalletCards size={17} /><span>{monthly ? 'Each bar shows one month’s balance. Colors match the pie; unreported months stay blank.' : 'Each market group contains one bar per year. Colors match the pie. Scroll across for more groups; hover a bar for that year’s market breakdown.'}{snapshots.some(row => row.partial) && ' * Partial month.'}</span></div>
  </section>;
}
