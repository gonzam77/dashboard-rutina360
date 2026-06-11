export function extractArrayPayload(payload) {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.data?.data?.data,
    payload?.items,
    payload?.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}
