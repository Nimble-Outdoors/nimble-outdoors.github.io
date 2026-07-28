export function getPackDetails() {
  var el = typeof document !== 'undefined' && document.getElementById('pack-data')
  return el ? JSON.parse(el.textContent) : []
}

export function findPack(packs, sticks, size) {
  return packs.find(function (p) { return p.sticks === sticks && p.size === size })
}

export function calculateWeight(stickWeightOz, sticks) {
  var totalOz = stickWeightOz * sticks
  var lb = Math.floor(totalOz / 16)
  var oz = Math.round(totalOz % 16)
  return { lb: lb, oz: oz }
}

export function formatWeight(lb, oz) {
  return lb > 0 ? lb + ' lb ' + oz + ' oz' : oz + ' oz'
}
