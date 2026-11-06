import {
  createBoard, addCard, editCard, deleteCard, moveCard, addColumn, renameColumn, deleteColumn,
  locateCard, countCards,
} from './board.js';
import { createHistory, push, undo, redo, canUndo, canRedo } from './history.js';
import { loadBoard, saveBoard } from './storage.js';
import { dropIndex, keyboardTarget } from './dnd.js';

const root = document.getElementById('board');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const live = document.getElementById('live');
const stats = document.getElementById('stats');

function seed() {
  let b = createBoard();
  const [todo, doing, done] = b.columns.map((c) => c.id);
  for (const [col, title] of [
    [todo, 'Write project README'], [todo, 'Review accessibility'], [todo, 'Plan next sprint'],
    [doing, 'Implement drag and drop'], [done, 'Set up repository'],
  ]) b = addCard(b, col, title);
  return b;
}

let history = createHistory(loadBoard(localStorage) ?? seed());
let dragId = null;
let focusCard = null;

const board = () => history.present;

function say(msg) {
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = msg; });
}

function commit(next, msg) {
  const before = history;
  history = push(history, next);
  if (history !== before) {
    saveBoard(localStorage, board());
    if (msg) say(msg);
    render();
  }
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function cardNode(card) {
  const li = el('li', 'card');
  li.draggable = true;
  li.tabIndex = 0;
  li.dataset.id = card.id;
  li.setAttribute('aria-label', `${card.title}. Alt plus arrows moves, Enter edits, Delete removes.`);
  li.append(el('span', 'ct', card.title));
  const del = el('button', 'x', '×');
  del.type = 'button';
  del.tabIndex = -1;
  del.setAttribute('aria-label', `Delete ${card.title}`);
  del.addEventListener('click', () => commit(deleteCard(board(), card.id), 'Card deleted'));
  li.append(del);

  li.addEventListener('dragstart', (e) => {
    dragId = card.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    requestAnimationFrame(() => li.classList.add('dragging'));
  });
  li.addEventListener('dragend', () => { dragId = null; clearMarks(); li.classList.remove('dragging'); });
  li.addEventListener('dblclick', () => edit(card.id));
  li.addEventListener('keydown', (e) => cardKey(e, card));
  return li;
}

function edit(cardId) {
  const card = board().cards[cardId];
  const next = window.prompt('Edit card', card.title);
  if (next !== null) commit(editCard(board(), cardId, { title: next }), 'Card updated');
}

function cardKey(e, card) {
  if (e.target !== e.currentTarget) return;
  const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (e.altKey && dirs[e.key]) {
    e.preventDefault();
    const b = board();
    const loc = locateCard(b, card.id);
    const target = keyboardTarget(loc, b.columns.map((c) => c.cardIds.length), dirs[e.key]);
    if (!target) return;
    focusCard = card.id;
    const col = b.columns[target.columnIndex];
    commit(moveCard(b, card.id, col.id, target.index), `Moved to ${col.title}, position ${target.index + 1} of ${col.cardIds.length + (loc.columnIndex === target.columnIndex ? 0 : 1)}`);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    edit(card.id);
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    const siblings = [...e.currentTarget.parentElement.children];
    const i = siblings.indexOf(e.currentTarget);
    focusCard = (siblings[i + 1] ?? siblings[i - 1])?.dataset.id ?? null;
    commit(deleteCard(board(), card.id), 'Card deleted');
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const sib = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
    sib?.focus();
  }
}

function clearMarks() {
  root.querySelectorAll('.over').forEach((n) => n.classList.remove('over'));
  root.querySelectorAll('.drop-line').forEach((n) => n.remove());
}

function columnNode(col) {
  const section = el('section', 'col');
  section.dataset.id = col.id;
  const head = el('header', 'col-head');
  const title = el('h2', 'col-title', col.title);
  title.tabIndex = 0;
  title.title = 'Double-click or press Enter to rename';
  const rename = () => {
    const name = window.prompt('Rename column', col.title);
    if (name !== null) commit(renameColumn(board(), col.id, name), 'Column renamed');
  };
  title.addEventListener('dblclick', rename);
  title.addEventListener('keydown', (e) => { if (e.key === 'Enter') rename(); });
  const count = el('span', 'count', String(col.cardIds.length));
  const rm = el('button', 'x', '×');
  rm.type = 'button';
  rm.setAttribute('aria-label', `Delete column ${col.title}`);
  rm.addEventListener('click', () => {
    if (col.cardIds.length === 0 || window.confirm(`Delete "${col.title}" and its ${col.cardIds.length} cards? You can undo this.`)) {
      commit(deleteColumn(board(), col.id), 'Column deleted');
    }
  });
  head.append(title, count, rm);

  const list = el('ul', 'cards');
  list.setAttribute('aria-label', col.title);
  for (const id of col.cardIds) list.append(cardNode(board().cards[id]));

  list.addEventListener('dragover', (e) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearMarks();
    section.classList.add('over');
    const others = [...list.children].filter((n) => n.dataset.id !== dragId);
    const idx = dropIndex(e.clientY, others.map((n) => n.getBoundingClientRect()));
    const line = el('li', 'drop-line');
    list.insertBefore(line, others[idx] ?? null);
  });
  list.addEventListener('dragleave', (e) => { if (!section.contains(e.relatedTarget)) clearMarks(); });
  list.addEventListener('drop', (e) => {
    if (!dragId) return;
    e.preventDefault();
    const others = [...list.children].filter((n) => n.dataset.id && n.dataset.id !== dragId);
    const idx = dropIndex(e.clientY, others.map((n) => n.getBoundingClientRect()));
    const id = dragId;
    dragId = null;
    clearMarks();
    focusCard = id;
    commit(moveCard(board(), id, col.id, idx), `Moved to ${col.title}`);
  });

  const form = el('form', 'add');
  const input = el('input');
  input.placeholder = 'Add a card';
  input.setAttribute('aria-label', `New card in ${col.title}`);
  input.maxLength = 120;
  const btn = el('button', '', '+');
  btn.type = 'submit';
  btn.setAttribute('aria-label', `Add card to ${col.title}`);
  form.append(input, btn);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const next = addCard(board(), col.id, input.value);
    if (next !== board()) commit(next, 'Card added');
    else input.focus();
  });

  section.append(head, list, form);
  return section;
}

function render() {
  const b = board();
  root.replaceChildren(...b.columns.map(columnNode));
  const addCol = el('form', 'col add-col');
  const input = el('input');
  input.placeholder = 'New column';
  input.setAttribute('aria-label', 'New column title');
  const btn = el('button', '', 'Add column');
  btn.type = 'submit';
  addCol.append(input, btn);
  addCol.addEventListener('submit', (e) => {
    e.preventDefault();
    commit(addColumn(b, input.value), 'Column added');
  });
  root.append(addCol);
  undoBtn.disabled = !canUndo(history);
  redoBtn.disabled = !canRedo(history);
  stats.textContent = `${b.columns.length} columns · ${countCards(b)} cards`;
  if (focusCard) {
    root.querySelector(`.card[data-id="${CSS.escape(focusCard)}"]`)?.focus();
    focusCard = null;
  }
}

function doUndo() { if (canUndo(history)) { history = undo(history); saveBoard(localStorage, board()); say('Undone'); render(); } }
function doRedo() { if (canRedo(history)) { history = redo(history); saveBoard(localStorage, board()); say('Redone'); render(); } }

undoBtn.addEventListener('click', doUndo);
redoBtn.addEventListener('click', doRedo);
document.getElementById('reset').addEventListener('click', () => {
  if (window.confirm('Reset the board to the sample data? You can undo this.')) commit(seed(), 'Board reset');
});
document.addEventListener('keydown', (e) => {
  if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? doRedo : doUndo)(); }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
});

render();
