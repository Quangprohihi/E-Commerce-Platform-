/**
 * Gỡ lặp tiền tố thường gặp trong dữ liệu mẫu (vd. "Kính Kính râm" → "Kính râm").
 * @param {string} [name]
 * @returns {string}
 */
export function formatDisplayProductName(name) {
  if (!name || typeof name !== 'string') return name || '';
  let s = name.trim();
  s = s.replace(/^kính\s+kính\s+/i, 'Kính ');
  s = s.replace(/^kính\s+gọng kính\s+/i, 'Gọng kính ');
  return s;
}
