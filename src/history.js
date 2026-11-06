/** Snapshot-based undo/redo. States are treated as immutable so snapshots share structure. */

export function createHistory(present, limit = 100) {
  return { past: [], present, future: [], limit };
}

export function push(history, next) {
  if (next === history.present) return history;
  const past = [...history.past, history.present];
  if (past.length > history.limit) past.shift();
  return { ...history, past, present: next, future: [] };
}

export function undo(history) {
  if (history.past.length === 0) return history;
  const past = history.past.slice(0, -1);
  return { ...history, past, present: history.past[history.past.length - 1], future: [history.present, ...history.future] };
}

export function redo(history) {
  if (history.future.length === 0) return history;
  const [next, ...future] = history.future;
  return { ...history, past: [...history.past, history.present], present: next, future };
}

export const canUndo = (h) => h.past.length > 0;
export const canRedo = (h) => h.future.length > 0;
