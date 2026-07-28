export function getPackDetails() {
  var el = typeof document !== 'undefined' && document.getElementById('pack-data')
  return el ? JSON.parse(el.textContent) : []
}

export function findPack(packs, sticks, size) {
  return packs.find(function (p) { return p.sticks === sticks && p.size === size })
}
