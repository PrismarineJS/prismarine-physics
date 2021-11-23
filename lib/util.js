exports.clamp = function clamp (min, x, max) {
  return Math.max(min, Math.min(x, max))
}
exports.getAttributeValue = function (prop) {
  let X = prop.value
  for (const mod of prop.modifiers) {
    if (mod.operation !== 0) continue
    X += mod.amount
  }
  let Y = X
  for (const mod of prop.modifiers) {
    if (mod.operation !== 1) continue
    Y += X * mod.amount
  }
  for (const mod of prop.modifiers) {
    if (mod.operation !== 2) continue
    Y += Y * mod.amount
  }
  return Y
}

exports.createAttributeValue = function (base) {
  const attributes = {
    value: base,
    modifiers: []
  }
  return attributes
}
