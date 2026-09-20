/* eslint-env mocha */
// Bedrock movement: prismarine-physics must construct and simulate a Bedrock player. Bedrock's data lacks the Java
// attribute/effect tables and Java feature flags, so the engine is edition-aware; these tests pin that it runs and that
// the shared collision resolver behaves correctly on Bedrock blocks (which do carry collision shapes): a player walks,
// jumps, is stopped by a wall, and auto-steps a slab (<= stepHeight). Movement-speed constants are Java-derived for now
// (tuning Bedrock cruise speed is a follow-up), so these assert behaviour/direction, not exact block/s values.
const assert = require('assert')
const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')

const version = 'bedrock_1.26.45'
const registry = require('prismarine-registry')(version)
const Block = require('prismarine-block')(registry)
const stone = new Block(registry.blocksByName.stone.id, 0, 0)
const air = new Block(registry.blocksByName.air.id, 0, 0)
const slab = registry.blocksByName.oak_slab ? new Block(registry.blocksByName.oak_slab.id, 0, 0) : null

function worldFrom (isSolidSlab) {
  return {
    getBlock (pos) {
      let b = air
      if (pos.y < 65) b = stone
      else if (isSolidSlab && isSolidSlab(pos)) b = isSolidSlab(pos) === 'slab' ? slab : stone
      b = b.position ? b : b
      b.position = new Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z))
      return b
    }
  }
}

function fakePlayer () {
  return {
    version,
    registry,
    entity: {
      position: new Vec3(0.5, 65, 0.5),
      velocity: new Vec3(0, 0, 0),
      onGround: true,
      isInWater: false,
      isInLava: false,
      isInWeb: false,
      isCollidedHorizontally: false,
      isCollidedVertically: false,
      elytraFlying: false,
      yaw: 0,
      pitch: 0,
      effects: {},
      attributes: {}
    },
    jumpTicks: 0,
    jumpQueued: false,
    fireworkRocketDuration: 0,
    inventory: { slots: new Array(46).fill(null) },
    game: { gameMode: 'survival' }
  }
}

function simulate (world, control, ticks, setup) {
  const bot = fakePlayer()
  if (setup) setup(bot)
  const physics = Physics(registry, world)
  const state = new PlayerState(bot, control)
  let maxY = bot.entity.position.y
  for (let i = 0; i < ticks; i++) {
    physics.simulatePlayer(state, world).apply(bot)
    maxY = Math.max(maxY, bot.entity.position.y)
  }
  return { bot, maxY }
}

const noControl = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
const flat = worldFrom(null)

describe('bedrock physics', function () {
  it('constructs the engine and PlayerState on bedrock data', function () {
    assert.doesNotThrow(() => Physics(registry, flat))
    assert.doesNotThrow(() => new PlayerState(fakePlayer(), { ...noControl }))
  })

  it('walks forward on flat ground and stays grounded', function () {
    const { bot } = simulate(flat, { ...noControl, forward: true }, 20)
    const moved = Math.hypot(bot.entity.position.x - 0.5, bot.entity.position.z - 0.5)
    assert.ok(moved > 2, `should walk forward (moved ${moved.toFixed(2)} blocks)`)
    assert.strictEqual(bot.entity.onGround, true, 'should stay on the ground')
    assert.ok(Math.abs(bot.entity.position.y - 65) < 1e-6, 'y unchanged on flat ground')
  })

  it('reaches vanilla Bedrock terminal walk/sprint speed', function () {
    // Bedrock constants are tuned so the engine's terminal cruise matches a real 1.26.51 client: walk 2.75 b/s,
    // sprint 5.87 b/s. Measure terminal speed (average of the last 20 of 100 ticks, past the acceleration ramp).
    const terminal = (sprint) => {
      const bot = fakePlayer()
      const physics = Physics(registry, flat)
      const control = { ...noControl, forward: true, sprint }
      let last = bot.entity.position.clone(); let sum = 0
      for (let t = 0; t < 100; t++) {
        physics.simulatePlayer(new PlayerState(bot, control), flat).apply(bot)
        if (t >= 80) sum += bot.entity.position.distanceTo(last) * 20
        last = bot.entity.position.clone()
      }
      return sum / 20
    }
    const walk = terminal(false)
    const sprint = terminal(true)
    assert.ok(Math.abs(walk - 2.75) < 0.06, `walk terminal ~2.75 b/s (got ${walk.toFixed(3)})`)
    assert.ok(Math.abs(sprint - 5.87) < 0.12, `sprint terminal ~5.87 b/s (got ${sprint.toFixed(3)})`)
    assert.ok(sprint / walk > 2.0 && sprint / walk < 2.2, `Bedrock sprint is ~2.13x walk (got ${(sprint / walk).toFixed(2)}x)`)
  })

  it('jumps to roughly vanilla height', function () {
    const { maxY } = simulate(flat, { ...noControl, jump: true }, 14, b => { b.jumpQueued = true })
    const dY = maxY - 65
    assert.ok(dY > 1.1 && dY < 1.4, `jump apex ~1.25 blocks (got ${dY.toFixed(3)})`)
  })

  it('is stopped by a two-block wall (no phasing)', function () {
    // wall occupies the forward (-z) side, floor(z) <= -1, y in [65,67)
    const wall = worldFrom(pos => (pos.y >= 65 && pos.y < 67 && Math.floor(pos.z) <= -1) ? 'stone' : false)
    const { bot } = simulate(wall, { ...noControl, forward: true }, 40)
    assert.ok(bot.entity.position.z > -0.5, `should stop at the wall, not pass it (z=${bot.entity.position.z.toFixed(2)})`)
    assert.ok(Math.abs(bot.entity.position.y - 65) < 1e-6, 'should not climb a full-height wall without jumping')
  })

  it('auto-steps up a slab (<= stepHeight)', function () {
    if (!slab) return this.skip()
    const stepped = worldFrom(pos => (pos.y >= 65 && pos.y < 66 && Math.floor(pos.z) <= -1) ? 'slab' : false)
    const { bot } = simulate(stepped, { ...noControl, forward: true }, 40)
    assert.ok(bot.entity.position.y > 65.4, `should step up onto the slab (y=${bot.entity.position.y.toFixed(2)})`)
    assert.ok(bot.entity.position.z < 0, 'should travel over the slab')
  })
})
