/** Products the shopper asked to be notified about when back in stock (persisted). */
const KEY = 'quickkart:notify';

export function createNotifyList({ storage = globalThis.localStorage } = {}) {
  let ids;
  try {
    ids = new Set((JSON.parse(storage?.getItem(KEY) ?? '[]')).filter(Number.isInteger));
  } catch {
    ids = new Set();
  }
  const save = () => {
    try { storage?.setItem(KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
  };
  return {
    has: (id) => ids.has(id),
    toggle(id) {
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      save();
      return ids.has(id);
    },
  };
}
