var FALLBACK = [
  { sku: "mach-one-3-pack", name: "3-Pack", weight: "2 lb 7 oz", sticks: 3, climb: "~12 ft", desc: "Lightest setup. Perfect for run-and-gun hunts." },
  { sku: "mach-one-4-pack", name: "4-Pack", weight: "3 lb 4 oz", sticks: 4, climb: "~16 ft", desc: "The sweet spot. Enough height for most setups." },
  { sku: "mach-one-5-pack", name: "5-Pack", weight: "4 lb 1 oz", sticks: 5, climb: "~20 ft", desc: "Maximum reach. For hunters who want every option." },
]

var el = typeof document !== 'undefined' && document.getElementById('pack-data')
export var PACK_DETAILS = el ? JSON.parse(el.textContent) : FALLBACK
