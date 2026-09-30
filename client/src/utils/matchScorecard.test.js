import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMatchScorecardRows } from './matchScorecard.js';

test('builds one scorecard row per completed deal and totals signed awards by player', () => {
  const players = [
    { id: 'bidder', name: 'Bidder' },
    { id: 'partner', name: 'Partner' },
    { id: 'defender', name: 'Defender' }
  ];
  const history = [
    { dealNumber: 1, changes: { bidder: 80, partner: 80, defender: 0 } },
    { dealNumber: 2, changes: { bidder: -90, partner: 0, defender: 0 } }
  ];

  const rows = buildMatchScorecardRows(history, players);

  assert.deepEqual(rows.map(row => row.dealNumber), [1, 2, 'Total']);
  assert.deepEqual(rows[0].changes, { bidder: 80, partner: 80, defender: 0 });
  assert.deepEqual(rows[1].changes, { bidder: -90, partner: 0, defender: 0 });
  assert.deepEqual(rows[2], {
    dealNumber: 'Total',
    changes: { bidder: -10, partner: 80, defender: 0 },
    isTotal: true
  });
});
