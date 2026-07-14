export function getPackDetails() {
  var el = typeof document !== 'undefined' && document.getElementById('pack-data')
  return el ? JSON.parse(el.textContent) : []
}
