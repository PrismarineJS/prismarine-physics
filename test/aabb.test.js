/* eslint-env mocha */

const assert = require('assert')
const AABB = require('../lib/aabb')

const axes = [
  { name: 'X', index: 0, method: 'computeOffsetX' },
  { name: 'Y', index: 1, method: 'computeOffsetY' },
  { name: 'Z', index: 2, method: 'computeOffsetZ' }
]

const requestedMotion = 0.25
const subEpsilonOverlap = 5e-8
const realOverlap = 2e-7
const realGap = 0.125

function movingBox (axisIndex, side, separation) {
  const min = [0.25, 0.25, 0.25]
  const max = [0.75, 0.75, 0.75]

  if (side === 'negative') {
    max[axisIndex] = -separation
    min[axisIndex] = max[axisIndex] - 1
  } else {
    min[axisIndex] = 1 + separation
    max[axisIndex] = min[axisIndex] + 1
  }

  return new AABB(...min, ...max)
}

describe('AABB collision offsets', () => {
  const block = new AABB(0, 0, 0, 1, 1, 1)

  for (const axis of axes) {
    describe(axis.name, () => {
      it('clamps exact and sub-epsilon contact from both directions', () => {
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'negative', 0), requestedMotion), 0)
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'positive', 0), -requestedMotion), 0)
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'negative', -subEpsilonOverlap), requestedMotion), 0)
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'positive', -subEpsilonOverlap), -requestedMotion), 0)
      })

      it('preserves real gaps', () => {
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'negative', realGap), requestedMotion), realGap)
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'positive', realGap), -requestedMotion), -realGap)
      })

      it('preserves sub-epsilon gaps and smaller requested motion', () => {
        const negativeSide = movingBox(axis.index, 'negative', subEpsilonOverlap)
        const positiveSide = movingBox(axis.index, 'positive', subEpsilonOverlap)
        const negativeGap = block[`min${axis.name}`] - negativeSide[`max${axis.name}`]
        const positiveGap = block[`max${axis.name}`] - positiveSide[`min${axis.name}`]
        const smallerMotion = subEpsilonOverlap / 2

        assert.strictEqual(block[axis.method](negativeSide, requestedMotion), negativeGap)
        assert.strictEqual(block[axis.method](positiveSide, -requestedMotion), positiveGap)
        assert.strictEqual(block[axis.method](negativeSide, smallerMotion), smallerMotion)
        assert.strictEqual(block[axis.method](positiveSide, -smallerMotion), -smallerMotion)
      })

      it('does not treat overlap beyond the epsilon as contact', () => {
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'negative', -realOverlap), requestedMotion), requestedMotion)
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'positive', -realOverlap), -requestedMotion), -requestedMotion)
      })

      it('does not restrict movement away from contact', () => {
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'negative', 0), -requestedMotion), -requestedMotion)
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'positive', 0), requestedMotion), requestedMotion)
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'negative', -subEpsilonOverlap), -requestedMotion), -requestedMotion)
        assert.strictEqual(block[axis.method](movingBox(axis.index, 'positive', -subEpsilonOverlap), requestedMotion), requestedMotion)
      })

      it('does not collide when the boxes only touch on a perpendicular axis', () => {
        const other = movingBox(axis.index, 'positive', 0)
        const tangentAxis = axes[(axis.index + 1) % axes.length]
        other[`min${tangentAxis.name}`] = 1
        other[`max${tangentAxis.name}`] = 2

        assert.strictEqual(block[axis.method](other, -requestedMotion), -requestedMotion)
      })
    })
  }

  it('clamps contact reconstructed with sub-epsilon floating-point overlap', () => {
    const obstacle = new AABB(3, 0, 0, 4, 1, 1)
    const halfWidth = 0.3005
    const reconstructedMinX = (obstacle.maxX + halfWidth) - halfWidth
    const other = new AABB(
      reconstructedMinX,
      0.25,
      0.25,
      reconstructedMinX + 1,
      0.75,
      0.75
    )

    assert.ok(reconstructedMinX < obstacle.maxX)
    assert.ok(obstacle.maxX - reconstructedMinX < subEpsilonOverlap)
    assert.strictEqual(obstacle.computeOffsetX(other, -requestedMotion), 0)
  })
})
