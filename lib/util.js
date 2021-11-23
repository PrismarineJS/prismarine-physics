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

exports.addAttributeModifier = function (attributes, modifier) {
  const end = attributes.modifiers.length
  // add modifer at the end
  attributes.modifiers[end] = modifier
  return attributes
}

exports.checkAttributeModifier = function (attributes, uuid) {
  for (const modifier of attributes.modifiers) {
    if (modifier.uuid === uuid) return true
  }
  return false
}

exports.deleteAttributeModifier = function (attributes, uuid) {
  for (const modifier of attributes.modifiers) {
    if (modifier.uuid === uuid) delete attributes.modifiers[modifier]
  }
  return attributes
}
