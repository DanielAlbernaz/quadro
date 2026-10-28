export function reordered<T extends { id: string }>(items: T[], activeId: string, overId: string): T[] {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  if (!item) return items;
  result.splice(to, 0, item);
  return result;
}

export function insertionPosition(items: { posicao: number }[], index: number): number {
  const previous = items[index - 1]?.posicao;
  const next = items[index]?.posicao;
  if (previous === undefined) return next === undefined ? 1024 : next - 1024;
  return next === undefined ? previous + 1024 : (previous + next) / 2;
}