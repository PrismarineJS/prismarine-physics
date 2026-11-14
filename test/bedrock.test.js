/* eslint-env mocha */

const assert = require('assert')
const { Physics } = require('prismarine-physics')
const { Vec3 } = require('vec3')

const cases = [
  { version: '1.17.1', original: 'farmland', replacement: 'dirt' },
  { version: 'bedrock_1.17.40', original: 'farmland', replacement: 'dirt' },
  { version: 'bedrock_1.19.1', original: 'mud', replacement: 'clay' }
]

function createWorld (Block, replacement) {
  return {
    getBlock (position) {
      const name = position.equals(new Vec3(0, 60, 0)) ? replacement : 'air'
      const block = Block.fromStateId(Block.fromProperties(name, {}).stateId, 0)
      block.position = position.clone()
      return block
    }
  }
}

function createEntity (position, overrides = {}) {
  return {
    pos: position,
    vel: new Vec3(0, 0, 0),
    onGround: true,
    isInWater: false,
    isInLava: false,
    isInWeb: false,
    isCollidedHorizontally: false,
    isCollidedVertically: false,
    elytraFlying: false,
    elytraEquipped: false,
    jumpTicks: 0,
    jumpQueued: false,
    fireworkRocketDuration: 0,
    attributes: {},
    yaw: 0,
    pitch: 0,
    control: {
      forward: false,
      back: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      sneak: false
    },
    jumpBoost: 0,
    speed: 0,
    slowness: 0,
    dolphinsGrace: 0,
    slowFalling: 0,
    levitation: 0,
    depthStrider: 0,
    ...overrides
  }
}

for (const { version, original, replacement } of cases) {
  describe(`${original} replaced with ${replacement} on ${version}`, () => {
    it('moves a grounded player onto the new collision surface', () => {
      const mcData = require('minecraft-data')(version)
      const Block = require('prismarine-block')(version)
      const originalBlock = Block.fromStateId(mcData.blocksByName[original].defaultState, 0)
      const originalHeight = Math.max(...originalBlock.shapes.map(shape => shape[4]))
      const world = createWorld(Block, replacement)
      const entity = createEntity(new Vec3(0.5, 60 + originalHeight, 0.5))

      const physics = Physics(mcData, world)
      physics.simulatePlayer(entity, world)
      assert.strictEqual(entity.pos.y, 61)
      physics.simulatePlayer(entity, world)

      assert.strictEqual(entity.pos.y, 61)
      assert.strictEqual(entity.onGround, true)
    })
  })
}

describe('support-growth collision guards', () => {
  const version = 'bedrock_1.17.40'
  const mcData = require('minecraft-data')(version)
  const Block = require('prismarine-block')(version)
  const physics = Physics(mcData, createWorld(Block, 'dirt'))
  const farmlandHeight = Math.max(...Block.fromStateId(mcData.blocksByName.farmland.defaultState, 0).shapes.map(shape => shape[4]))

  it('does not lift an airborne player out of an overlapping block', () => {
    const world = createWorld(Block, 'dirt')
    const entity = createEntity(new Vec3(0.5, 60 + farmlandHeight, 0.5), { onGround: false })
    physics.simulatePlayer(entity, world)
    assert.ok(entity.pos.y < 61)
  })

  it('does not lift through growth taller than the configured step height', () => {
    const world = createWorld(Block, 'dirt')
    const carpetHeight = Math.max(...Block.fromStateId(mcData.blocksByName.carpet.defaultState, 0).shapes.map(shape => shape[4]))
    const entity = createEntity(new Vec3(0.5, 60 + carpetHeight, 0.5))
    physics.simulatePlayer(entity, world)
    assert.ok(entity.pos.y < 61)
  })

  it('does not lift into a full ceiling that crosses an integer Y boundary', () => {
    // Astra repro: carpet-height feet over a bottom-slab support, with a full stone ceiling at Y=62-63. The support lift
    // would raise the head to ~62.3, inside the ceiling; the pre-lift block query does not include that cell, so the lift
    // must be validated against a fresh query of the lifted box. Correct behavior: the lift is rejected (head stays below
    // the ceiling), NOT raised onto the slab top at 60.5.
    const world = {
      getBlock (position) {
        let shapes = []
        if (position.equals(new Vec3(0, 60, 0))) shapes = [[0, 0, 0, 1, 0.5, 1]] // bottom slab support (top 60.5)
        if (position.equals(new Vec3(0, 62, 0))) shapes = [[0, 0, 0, 1, 1, 1]] // full stone ceiling, 62-63
        return { position: position.clone(), shapes, type: 0 }
      }
    }
    const entity = createEntity(new Vec3(0.5, 60.0625, 0.5))
    physics.simulatePlayer(entity, world)
    assert.ok(entity.pos.y < 60.4, `lift into the 62-63 ceiling must be rejected, not raised to the slab top (y=${entity.pos.y})`)
  })

  it('does not move a player already standing on a full block', () => {
    const world = createWorld(Block, 'dirt')
    const entity = createEntity(new Vec3(0.5, 61, 0.5))
    physics.simulatePlayer(entity, world)
    assert.strictEqual(entity.pos.y, 61)
  })

  it('does not lift a player into a low ceiling', () => {
    const world = {
      getBlock (position) {
        let shapes = []
        if (position.equals(new Vec3(0, 60, 0))) shapes = [[0, 0, 0, 1, 1, 1]]
        if (position.equals(new Vec3(0, 62, 0))) shapes = [[0, 0.5, 0, 1, 1, 1]]
        return { position: position.clone(), shapes, type: 0 }
      }
    }
    const entity = createEntity(new Vec3(0.5, 60.5, 0.5))

    physics.simulatePlayer(entity, world)

    assert.ok(entity.pos.y < 61)
  })

  it('keeps horizontal movement while lifting onto the replacement surface', () => {
    const world = createWorld(Block, 'dirt')
    const entity = createEntity(new Vec3(0.5, 60 + farmlandHeight, 0.5), {
      control: {
        forward: true,
        back: false,
        left: false,
        right: false,
        jump: false,
        sprint: false,
        sneak: false
      }
    })
    physics.simulatePlayer(entity, world)
    assert.strictEqual(entity.pos.y, 61)
    assert.notStrictEqual(entity.pos.z, 0.5)
  })
})
