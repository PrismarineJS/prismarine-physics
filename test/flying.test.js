/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')

const version = '1.13.2'
const mcData = require('minecraft-data')(version)
const Block = require('prismarine-block')(version)

const fakeWorld = {
  getBlock: (pos) => {
    const type = (pos.y < 60) ? mcData.blocksByName.stone.id : mcData.blocksByName.air.id
    const b = new Block(type, 0, 0)
    b.position = pos
    return b
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

function run (player, controls, ticks) {
  const physics = Physics(mcData, fakeWorld)
  const state = new PlayerState(player, controls)
  for (let i = 0; i < ticks; i++) physics.simulatePlayer(state, fakeWorld).apply(player)
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
})
