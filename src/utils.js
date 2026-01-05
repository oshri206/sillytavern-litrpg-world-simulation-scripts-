export function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function createId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function nowIso() {
  return new Date().toISOString();
}

export async function loadJson(path) {
  const url = path instanceof URL ? path : new URL(path, import.meta.url);
  if (typeof window === 'undefined') {
    const { readFile } = await import('node:fs/promises');
    const data = await readFile(url, 'utf-8');
    return JSON.parse(data);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}
