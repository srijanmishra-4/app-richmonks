const store = () => (typeof window !== 'undefined' ? window.localStorage : null);

export async function getItem(key) {
  try { return store()?.getItem(key) ?? null; } catch { return null; }
}

export async function setItem(key, value) {
  store()?.setItem(key, value);
}

export async function removeItem(key) {
  try { store()?.removeItem(key); } catch {}
}
