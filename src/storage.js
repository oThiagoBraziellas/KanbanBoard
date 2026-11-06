export const STORAGE_KEY = 'kanban.board.v1';

/** Rebuilds a board from untrusted data, dropping orphans and duplicates. Returns null if unusable. */
export function sanitizeBoard(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.columns) || typeof data.cards !== 'object' || data.cards === null) return null;
  const seen = new Set();
  const columns = [];
  const cards = {};
  for (const col of data.columns) {
    if (!col || typeof col.id !== 'string' || typeof col.title !== 'string' || !Array.isArray(col.cardIds)) continue;
    const cardIds = [];
    for (const id of col.cardIds) {
      const card = data.cards[id];
      if (typeof id !== 'string' || seen.has(id) || !card || typeof card.title !== 'string') continue;
      seen.add(id);
      cardIds.push(id);
      cards[id] = { id, title: card.title, notes: typeof card.notes === 'string' ? card.notes : '' };
    }
    columns.push({ id: col.id, title: col.title, cardIds });
  }
  return columns.length ? { columns, cards } : null;
}

export function loadBoard(storage, key = STORAGE_KEY) {
  try {
    const raw = storage.getItem(key);
    return raw ? sanitizeBoard(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveBoard(storage, board, key = STORAGE_KEY) {
  try {
    storage.setItem(key, JSON.stringify(board));
    return true;
  } catch {
    return false;
  }
}
