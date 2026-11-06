import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBoard, addCard, editCard, deleteCard, moveCard, addColumn, renameColumn, deleteColumn,
  locateCard, countCards,
} from '../src/board.js';

function fixture() {
  let n = 0;
  let b = createBoard(['A', 'B', 'C'], () => `col${++n}`);
  b = addCard(b, 'col1', 'one', 'k1');
  b = addCard(b, 'col1', 'two', 'k2');
  b = addCard(b, 'col1', 'three', 'k3');
  b = addCard(b, 'col2', 'four', 'k4');
  return b;
}
const ids = (b, col) => b.columns.find((c) => c.id === col).cardIds;

test('createBoard builds empty columns', () => {
  const b = createBoard(['X', 'Y']);
  assert.equal(b.columns.length, 2);
  assert.deepEqual(b.cards, {});
});

test('addCard validates title and column and does not mutate', () => {
  const b = fixture();
  assert.equal(addCard(b, 'col1', '   '), b);
  assert.equal(addCard(b, 'nope', 'x'), b);
  const before = JSON.stringify(b);
  const next = addCard(b, 'col3', ' hello  world ', 'k9');
  assert.equal(next.cards.k9.title, 'hello world');
  assert.deepEqual(ids(next, 'col3'), ['k9']);
  assert.equal(JSON.stringify(b), before);
});

test('editCard updates title and notes, rejects empty titles', () => {
  const b = fixture();
  assert.equal(editCard(b, 'k1', { title: ' ' }), b);
  assert.equal(editCard(b, 'zz', { title: 'x' }), b);
  const next = editCard(b, 'k1', { title: 'ONE', notes: 'n' });
  assert.deepEqual(next.cards.k1, { id: 'k1', title: 'ONE', notes: 'n' });
});

test('deleteCard removes it from column and map', () => {
  const next = deleteCard(fixture(), 'k2');
  assert.deepEqual(ids(next, 'col1'), ['k1', 'k3']);
  assert.equal('k2' in next.cards, false);
  const b = fixture();
  assert.equal(deleteCard(b, 'missing'), b);
});

test('moveCard reorders inside a column (index is post-removal)', () => {
  const b = fixture();
  assert.deepEqual(ids(moveCard(b, 'k1', 'col1', 2), 'col1'), ['k2', 'k3', 'k1']);
  assert.deepEqual(ids(moveCard(b, 'k3', 'col1', 0), 'col1'), ['k3', 'k1', 'k2']);
  assert.deepEqual(ids(moveCard(b, 'k2', 'col1', 1), 'col1'), ['k1', 'k2', 'k3']);
});

test('moveCard returns the same board for a no-op move', () => {
  const b = fixture();
  assert.equal(moveCard(b, 'k2', 'col1', 1), b);
});

test('moveCard across columns places at the requested index', () => {
  const next = moveCard(fixture(), 'k2', 'col2', 0);
  assert.deepEqual(ids(next, 'col1'), ['k1', 'k3']);
  assert.deepEqual(ids(next, 'col2'), ['k2', 'k4']);
  assert.deepEqual(locateCard(next, 'k2'), { columnIndex: 1, columnId: 'col2', index: 0 });
});

test('moveCard clamps out-of-range indexes and ignores unknown targets', () => {
  const b = fixture();
  assert.deepEqual(ids(moveCard(b, 'k1', 'col3', 99), 'col3'), ['k1']);
  assert.deepEqual(ids(moveCard(b, 'k1', 'col2', -5), 'col2'), ['k1', 'k4']);
  assert.equal(moveCard(b, 'k1', 'nope', 0), b);
  assert.equal(moveCard(b, 'nope', 'col2', 0), b);
});

test('moveCard never loses or duplicates cards', () => {
  let b = fixture();
  const targets = ['col1', 'col2', 'col3'];
  for (let i = 0; i < 50; i++) b = moveCard(b, `k${(i % 4) + 1}`, targets[i % 3], i % 5);
  const all = b.columns.flatMap((c) => c.cardIds).sort();
  assert.deepEqual(all, ['k1', 'k2', 'k3', 'k4']);
  assert.equal(countCards(b), 4);
});

test('column operations', () => {
  const b = fixture();
  assert.equal(addColumn(b, ' ').columns.length, 3);
  assert.equal(addColumn(b, 'D', 'col4').columns[3].id, 'col4');
  assert.equal(renameColumn(b, 'col1', ' Backlog ').columns[0].title, 'Backlog');
  assert.equal(renameColumn(b, 'col1', ''), b);
  const del = deleteColumn(b, 'col1');
  assert.equal(del.columns.length, 2);
  assert.deepEqual(Object.keys(del.cards), ['k4']);
  assert.equal(deleteColumn(b, 'nope'), b);
});
