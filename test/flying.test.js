/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')

const version = '1.13.2'
const mcData = require('minecraft-data')(version)
const Block = require('prismarine-block')(version)

// Stone below y 60, then `fill` (source blocks when a fluid) up to y 100, then air.
function world (fill = 'air') {
  return {
    getBlock: (pos) => {
      const name = pos.y < 60 ? 'stone' : pos.y < 100 ? fill : 'air'
      const b = new Block(mcData.blocksByName[name].id, 0, 0)
      b.position = pos
      return b
    }
  }
}

function fakePlayer (pos, { flying = false, flyingSpeed = 0.05 } = {}) {
  return {
    entity: {
      position: pos,
      velocity: new Vec3(0, 0, 0),
      onGround: false,
      isInWater: false,
      isInLava: false,
      isInWeb: false,
      isCollidedHorizontally: false,
      isCollidedVertically: false,
      elytraFlying: false,
      flying,
      flyingSpeed,
      yaw: Math.PI * 3 / 2, // east (+x)
      pitch: 0,
      effects: {}
    },
    jumpTicks: 0,
    jumpQueued: false,
    fireworkRocketDuration: 0,
    version,
    inventory: { slots: [] }
  }
}

const idle = () => ({ forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false })

function run (player, controls, ticks, w = world()) {
  const physics = Physics(mcData, w)
  const state = new PlayerState(player, controls)
  for (let i = 0; i < ticks; i++) physics.simulatePlayer(state, w).apply(player)
  return player.entity
}

describe('creative flight', () => {
  it('holds its altitude instead of falling', () => {
    const entity = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true }), idle(), 40)
    expect(entity.position.y).toEqual(80)
    expect(entity.velocity.y).toEqual(0)
  })

  it('still falls when the server has not granted flight', () => {
    const entity = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: false }), idle(), 40)
    expect(entity.position.y).toBeLessThan(80)
  })

  it('damps the velocity it entered the tick with rather than adding gravity', () => {
    const player = fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true })
    player.entity.velocity.y = 1
    // Player.travel keeps y * 0.6 per tick, so the climb decays instead of turning into a fall.
    const entity = run(player, idle(), 1)
    expect(entity.velocity.y).toBeCloseTo(0.6, 10)
    expect(entity.position.y).toBeCloseTo(81, 10)
  })

  it('accelerates at the abilities speed, not the 0.02 of a falling player', () => {
    const controls = { ...idle(), forward: true }
    const flying = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true }), controls, 1)
    const falling = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: false }), controls, 1)
    expect(flying.velocity.x).toBeGreaterThan(falling.velocity.x)
    // 0.05 against the airborne 0.02
    expect(flying.velocity.x / falling.velocity.x).toBeCloseTo(2.5, 6)
  })

  it('doubles that speed while sprinting', () => {
    const walk = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true }), { ...idle(), forward: true }, 1)
    const sprint = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true }), { ...idle(), forward: true, sprint: true }, 1)
    expect(sprint.velocity.x / walk.velocity.x).toBeCloseTo(2, 6)
  })

  it('climbs at three times the flying speed while jump is held', () => {
    const entity = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true }), { ...idle(), jump: true }, 1)
    expect(entity.position.y).toBeCloseTo(80.15, 6)
    expect(entity.velocity.y).toBeCloseTo(0.09, 6)
  })

  it('descends at three times the flying speed while sneak is held', () => {
    const entity = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true }), { ...idle(), sneak: true }, 1)
    expect(entity.position.y).toBeCloseTo(79.85, 6)
    expect(entity.velocity.y).toBeCloseTo(-0.09, 6)
  })

  it('settles at the vanilla 0.375 blocks a tick when climbing', () => {
    // v = (v + 0.15) * 0.6 settles at v = 0.225, so each move is 0.225 + 0.15.
    const player = fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true })
    run(player, { ...idle(), jump: true }, 40)
    const before = player.entity.position.y
    const entity = run(player, { ...idle(), jump: true }, 1)
    expect(entity.position.y - before).toBeCloseTo(0.375, 6)
  })

  for (const fluid of ['water', 'lava']) {
    it(`hovers in ${fluid} instead of taking the fluid movement`, () => {
      const entity = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: true }), idle(), 40, world(fluid))
      expect(entity.position.y).toEqual(80)
      expect(entity.velocity.y).toEqual(0)
    })

    it(`still sinks in ${fluid} when the server has not granted flight`, () => {
      const entity = run(fakePlayer(new Vec3(0.5, 80, 0.5), { flying: false }), idle(), 40, world(fluid))
      expect(entity.position.y).toBeLessThan(80)
    })
  }
})
