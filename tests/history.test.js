import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, push, undo, redo, canUndo, canRedo } from '../src/history.js';

test('undo and redo walk through states', () => {
  let h = createHistory('a');
  h = push(h, 'b');
  h = push(h, 'c');
  assert.equal(h.present, 'c');
  h = undo(h);
  assert.equal(h.present, 'b');
  h = undo(h);
  assert.equal(h.present, 'a');
  assert.equal(canUndo(h), false);
  h = redo(h);
  h = redo(h);
  assert.equal(h.present, 'c');
  assert.equal(canRedo(h), false);
});

test('pushing after an undo discards the redo branch', () => {
  let h = push(push(createHistory(1), 2), 3);
  h = undo(h);
  h = push(h, 99);
  assert.equal(canRedo(h), false);
  assert.deepEqual(h.past, [1, 2]);
});

test('pushing an identical reference is a no-op', () => {
  const state = { x: 1 };
  const h = createHistory(state);
  assert.equal(push(h, state), h);
});

test('undo/redo on empty stacks return the same history', () => {
  const h = createHistory(0);
  assert.equal(undo(h), h);
  assert.equal(redo(h), h);
});

test('the past is capped at the limit, dropping the oldest entries', () => {
  let h = createHistory(0, 3);
  for (let i = 1; i <= 6; i++) h = push(h, i);
  assert.deepEqual(h.past, [3, 4, 5]);
  assert.equal(h.present, 6);
});

test('history operations do not mutate previous histories', () => {
  const h1 = push(createHistory('a'), 'b');
  const snapshot = JSON.stringify(h1);
  undo(h1);
  push(h1, 'c');
  assert.equal(JSON.stringify(h1), snapshot);
});
