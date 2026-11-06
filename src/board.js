/**
 * Immutable board model.
 * Board = { columns: [{ id, title, cardIds: string[] }], cards: { [id]: { id, title, notes } } }
 */

let seq = 0;
export function uid(prefix = 'id') {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function createBoard(titles = ['To do', 'In progress', 'Done'], makeId = () => uid('col')) {
  return { columns: titles.map((title) => ({ id: makeId(), title, cardIds: [] })), cards: {} };
}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export function findColumn(board, columnId) {
  return board.columns.find((c) => c.id === columnId) ?? null;
}

export function locateCard(board, cardId) {
  for (let c = 0; c < board.columns.length; c++) {
    const i = board.columns[c].cardIds.indexOf(cardId);
    if (i !== -1) return { columnIndex: c, columnId: board.columns[c].id, index: i };
  }
  return null;
}

export function addCard(board, columnId, title, id = uid('card'), notes = '') {
  const name = clean(title);
  const col = findColumn(board, columnId);
  if (!name || !col) return board;
  return {
    columns: board.columns.map((c) => (c.id === columnId ? { ...c, cardIds: [...c.cardIds, id] } : c)),
    cards: { ...board.cards, [id]: { id, title: name, notes: String(notes) } },
  };
}

export function editCard(board, cardId, patch) {
  const card = board.cards[cardId];
  if (!card) return board;
  const next = { ...card };
  if ('title' in patch) {
    const title = clean(patch.title);
    if (!title) return board;
    next.title = title;
  }
  if ('notes' in patch) next.notes = String(patch.notes);
  return { ...board, cards: { ...board.cards, [cardId]: next } };
}

export function deleteCard(board, cardId) {
  if (!board.cards[cardId]) return board;
  const { [cardId]: _removed, ...cards } = board.cards;
  return {
    columns: board.columns.map((c) => (c.cardIds.includes(cardId) ? { ...c, cardIds: c.cardIds.filter((x) => x !== cardId) } : c)),
    cards,
  };
}

/**
 * Moves a card to `toIndex` of column `toColumnId`. `toIndex` is the position the card
 * should have in the destination column AFTER it has been removed from its origin.
 */
export function moveCard(board, cardId, toColumnId, toIndex) {
  const from = locateCard(board, cardId);
  const dest = findColumn(board, toColumnId);
  if (!from || !dest) return board;
  const without = board.columns.map((c) => (c.id === from.columnId ? { ...c, cardIds: c.cardIds.filter((x) => x !== cardId) } : c));
  const target = without.find((c) => c.id === toColumnId);
  const index = Math.min(Math.max(toIndex, 0), target.cardIds.length);
  if (from.columnId === toColumnId && index === from.index) return board;
  const ids = [...target.cardIds];
  ids.splice(index, 0, cardId);
  return { ...board, columns: without.map((c) => (c.id === toColumnId ? { ...c, cardIds: ids } : c)) };
}

export function addColumn(board, title, id = uid('col')) {
  const name = clean(title);
  if (!name) return board;
  return { ...board, columns: [...board.columns, { id, title: name, cardIds: [] }] };
}

export function renameColumn(board, columnId, title) {
  const name = clean(title);
  if (!name || !findColumn(board, columnId)) return board;
  return { ...board, columns: board.columns.map((c) => (c.id === columnId ? { ...c, title: name } : c)) };
}

export function deleteColumn(board, columnId) {
  const col = findColumn(board, columnId);
  if (!col) return board;
  const cards = { ...board.cards };
  for (const id of col.cardIds) delete cards[id];
  return { columns: board.columns.filter((c) => c.id !== columnId), cards };
}

export function countCards(board) {
  return Object.keys(board.cards).length;
}
