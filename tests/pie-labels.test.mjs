import test from 'node:test';
import assert from 'node:assert/strict';
import { pieLabels, slicePercent } from '../src/pie-labels.mjs';

test('tiny market slices keep distinct labels inside the chart bounds', () => {
  const rows = pieLabels(Array.from({length:14}, (_, i) => ({ id:String(i), value:i === 0 ? 9999 : 1 })));
  for (const side of [-1, 1]) {
    const labels = rows.filter(row => row.side === side).sort((a,b) => a.y-b.y);
    labels.forEach((row,i) => { assert.ok(row.y >= 24 && row.y <= 276); if(i) assert.ok(row.y-labels[i-1].y >= 18); });
  }
  assert.ok(Math.abs(rows.reduce((sum,row)=>sum+row.share,0)-100)<1e-8);
  assert.equal(slicePercent(rows[1].share), '<0.1%');
  assert.equal(pieLabels([{id:'US',value:10}])[0].share,100);
});
