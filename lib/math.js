module.exports = {
  clamp: (min, x, max) => Math.max(min, Math.min(x, max)),
  abs_max: (x1, x2) => Math.max(Math.abs(x1), Math.abs(x2))
}
