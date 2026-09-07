export function parseLinkedFalloRef(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  const pathMatch = value.match(/\/observatorio\/fallo\/(\d+)/i);
  if (pathMatch) {
    const id = Number(pathMatch[1]);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }

  if (/^\d+$/.test(value)) {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }

  return undefined;
}

export function linkedFalloPath(id: number): string {
  return `/observatorio/fallo/${id}`;
}

export function linkedFalloInputValue(id?: number): string {
  return id && id > 0 ? linkedFalloPath(id) : '';
}
