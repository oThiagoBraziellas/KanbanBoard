import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeBoard, loadBoard, saveBoard, STORAGE_KEY } from '../src/storage.js';
import { dropIndex, keyboardTarget } from '../src/dnd.js';

const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; } };
};

test('sanitizeBoard keeps valid data and drops orphans and duplicates', () => {
  const data = {
    columns: [
      { id: 'c1', title: 'A', cardIds: ['x', 'ghost', 'x'] },
      { id: 'c2', title: 'B', cardIds: ['y'] },
      { id: 5 },
    ],
    cards: { x: { id: 'x', title: 'X' }, y: { id: 'y', title: 'Y', notes: 'n' }, z: { id: 'z', title: 'unused' } },
  };
  const clean = sanitizeBoard(data);
  assert.deepEqual(clean.columns.map((c) => c.cardIds), [['x'], ['y']]);
  assert.deepEqual(Object.keys(clean.cards).sort(), ['x', 'y']);
  assert.equal(clean.cards.x.notes, '');
});

test('sanitizeBoard rejects garbage', () => {
  for (const bad of [null, 1, {}, { columns: [], cards: {} }, { columns: 'x', cards: {} }, { columns: [{}], cards: null }]) {
    assert.equal(sanitizeBoard(bad), null);
  }
});

test('save/load round trip and resilience', () => {
  const s = mem();
  const board = { columns: [{ id: 'c', title: 'T', cardIds: ['a'] }], cards: { a: { id: 'a', title: 'A', notes: '' } } };
  assert.equal(saveBoard(s, board), true);
  assert.deepEqual(loadBoard(s), board);
  assert.equal(loadBoard(mem()), null);
  assert.equal(loadBoard(mem({ [STORAGE_KEY]: '{bad' })), null);
  assert.equal(saveBoard({ setItem() { throw new Error('quota'); } }, board), false);
});

test('dropIndex compares against card midpoints', () => {
  const rects = [{ top: 0, height: 40 }, { top: 50, height: 40 }, { top: 100, height: 40 }];
  assert.equal(dropIndex(5, rects), 0);
  assert.equal(dropIndex(25, rects), 1);
  assert.equal(dropIndex(75, rects), 2);
  assert.equal(dropIndex(500, rects), 3);
  assert.equal(dropIndex(10, []), 0);
});

test('keyboardTarget stays inside the board', () => {
  const sizes = [3, 0, 2];
  assert.deepEqual(keyboardTarget({ columnIndex: 0, index: 1 }, sizes, 'up'), { columnIndex: 0, index: 0 });
  assert.equal(keyboardTarget({ columnIndex: 0, index: 0 }, sizes, 'up'), null);
  assert.deepEqual(keyboardTarget({ columnIndex: 0, index: 1 }, sizes, 'down'), { columnIndex: 0, index: 2 });
  assert.equal(keyboardTarget({ columnIndex: 0, index: 2 }, sizes, 'down'), null);
  assert.deepEqual(keyboardTarget({ columnIndex: 0, index: 2 }, sizes, 'right'), { columnIndex: 1, index: 0 });
  assert.deepEqual(keyboardTarget({ columnIndex: 2, index: 1 }, sizes, 'left'), { columnIndex: 1, index: 0 });
  assert.equal(keyboardTarget({ columnIndex: 0, index: 0 }, sizes, 'left'), null);
  assert.equal(keyboardTarget({ columnIndex: 2, index: 0 }, sizes, 'right'), null);
  assert.equal(keyboardTarget({ columnIndex: 0, index: 0 }, sizes, 'sideways'), null);
});
