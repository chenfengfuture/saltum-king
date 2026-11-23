export function filterLooks(rows, filters) {
  const query = (filters.query || '').trim().toLowerCase()
  return rows.filter((row) => {
    const anchor = row.anchor_sku === filters.sku
    const participants = (row.items || []).filter((item) => item.sku === filters.sku)
    if (filters.sku) {
      if (filters.view === 'hero' && !anchor) return false
      if (filters.view === 'used' && (anchor || !participants.length)) return false
      if (filters.view === 'all' && !anchor && !participants.length) return false
      if (filters.color) {
        const anchorMatch = anchor && row.anchor_color === filters.color
        const participantMatch = participants.some((item) => item.color === filters.color)
        if (filters.view === 'hero' ? !anchorMatch : !(anchorMatch || participantMatch)) return false
      }
    }
    if (filters.line && row.narrative !== filters.line) return false
    if (filters.review && row.review_status !== filters.review) return false
    return !query || [row.id, row.title, row.summary, row.anchor_sku, row.anchor_color,
      ...(row.items || []).flatMap((item) => [item.sku, item.color])].join(' ').toLowerCase().includes(query)
  })
}
