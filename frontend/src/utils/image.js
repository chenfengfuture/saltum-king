export function resolveImageUrl(key, base) {
  if (!key || !base || typeof key !== 'string') return ''
  try {
    const origin = new URL(base)
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash) return ''
    if (/^(?:[a-z]+:|[\\/])/i.test(key) || key.split(/[\\/]/).includes('..')) return ''
    const encoded = key.replaceAll('\\', '/').split('/').map(encodeURIComponent).join('/')
    return origin.href.replace(/\/+$/, '') + '/' + encoded
  } catch { return '' }
}
export function assetUrl(key) {
  return resolveImageUrl(key, import.meta.env?.VITE_OSS_BASE_URL || '')
}
