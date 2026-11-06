/**
 * Given the pointer's Y and the bounding boxes of the cards currently in a column
 * (excluding the one being dragged), returns the index at which to insert.
 */
export function dropIndex(pointerY, rects) {
  for (let i = 0; i < rects.length; i++) {
    if (pointerY < rects[i].top + rects[i].height / 2) return i;
  }
  return rects.length;
}

/** Keyboard move: returns { columnIndex, index } or null when the move is impossible. */
export function keyboardTarget(location, columnSizes, direction) {
  const { columnIndex, index } = location;
  switch (direction) {
    case 'up':
      return index > 0 ? { columnIndex, index: index - 1 } : null;
    case 'down':
      return index < columnSizes[columnIndex] - 1 ? { columnIndex, index: index + 1 } : null;
    case 'left':
      return columnIndex > 0 ? { columnIndex: columnIndex - 1, index: Math.min(index, columnSizes[columnIndex - 1]) } : null;
    case 'right':
      return columnIndex < columnSizes.length - 1 ? { columnIndex: columnIndex + 1, index: Math.min(index, columnSizes[columnIndex + 1]) } : null;
    default:
      return null;
  }
}
