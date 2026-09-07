import { number } from './data.mjs';
import { pieLabels, slicePercent } from './pie-labels.mjs';

export function LabeledMarketPie({ slices, color, label }) {
  const rows = pieLabels(slices);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const point = angle => [180 + 82 * Math.cos(angle), 150 + 82 * Math.sin(angle)];
  return <svg className="ex-labeled-pie" viewBox="0 0 360 300" role="img" aria-label={`${label}: market shares of reported balances`}>
    {rows.map(row => {
      const start = point(row.start), end = point(row.end), anchor = point(row.mid);
      const text = `${row.id} ${slicePercent(row.share)}`;
      const title = `${row.name}: ${number(row.value)} · ${slicePercent(row.share)} of reported balances`;
      return <g key={row.id}>
        {rows.length === 1 ? <circle cx={180} cy={150} r={82} fill={color(row.id)} tabIndex={0} aria-label={title}><title>{title}</title></circle> : <path d={`M180,150 L${start} A82,82 0 ${row.end - row.start > Math.PI ? 1 : 0},1 ${end} Z`} fill={color(row.id)} stroke="white" strokeWidth={1} tabIndex={0} aria-label={title}><title>{title}</title></path>}
        <polyline points={`${anchor} ${180 + row.side * 96},${row.y} ${180 + row.side * 106},${row.y}`} fill="none" stroke={color(row.id)} strokeWidth={1} />
        <text x={180 + row.side * 110} y={row.y} textAnchor={row.side > 0 ? 'start' : 'end'} dominantBaseline="middle" fill="#264c70" fontSize={11} fontWeight={650}>{text}<title>{title}</title></text>
      </g>;
    })}
    <circle cx={180} cy={150} r={48} fill="white" />
    <text x={180} y={146} textAnchor="middle" fill="#244c70" fontSize={13} fontWeight={750}>{number(total)}<title>{number(total)}</title></text>
    <text x={180} y={165} textAnchor="middle" fill="#648099" fontSize={10}>TOTAL BALANCE</text>
  </svg>;
}
