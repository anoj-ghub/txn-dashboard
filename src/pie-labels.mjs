export const slicePercent = value => value > 0 && value < .1 ? '<0.1%' : `${value.toFixed(1)}%`;

// Reserve a separate vertical slot for every label, including tiny slices.
export function pieLabels(slices) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let angle = -Math.PI / 2;
  const rows = slices.map(slice => {
    const sweep = slice.value / total * Math.PI * 2;
    const mid = angle + sweep / 2;
    const row = { ...slice, start: angle, end: angle + sweep, mid, share: slice.value / total * 100, side: Math.cos(mid) >= 0 ? 1 : -1, y: 150 + Math.sin(mid) * 110 };
    angle += sweep;
    return row;
  });
  for (const side of [-1, 1]) {
    const sorted = rows.filter(row => row.side === side).sort((a, b) => a.y - b.y);
    sorted.forEach((row, i) => { row.y = Math.max(row.y, i ? sorted[i - 1].y + 18 : 24); });
    for (let i = sorted.length - 1; i >= 0; i--) sorted[i].y = Math.min(sorted[i].y, i === sorted.length - 1 ? 276 : sorted[i + 1].y - 18);
  }
  return rows;
}
