/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')

const mcData = require('minecraft-data')('1.13.2')
const Block = require('prismarine-block')('1.13.2')

const fakeWorld = {
  getBlock: (pos) => {
    const type = (pos.y < 60) ? mcData.blocksByName.stone.id : mcData.blocksByName.air.id
    const b = new Block(type, 0, 0)
    b.position = pos
    return b
  }
}

function fakePlayer (pos) {
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
      yaw: 0,
      pitch: 0,
      effects: {}
    },
    jumpTicks: 0,
    jumpQueued: false,
    fireworkRocketDuration: 0,
    version: '1.13.2',
    inventory: {
      slots: []
    }
  }
}

describe('Basic tests', () => {
  it('Gravity test', () => {
    const physics = Physics(mcData, fakeWorld)
    const controls = {
      forward: false,
      back: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      sneak: false
    }
    const player = fakePlayer(new Vec3(0, 80, 0))
    const playerState = new PlayerState(player, controls)

    while (!player.entity.onGround) {
      physics.simulatePlayer(playerState, fakeWorld).apply(player)
    }

    expect(player.entity.position).toEqual(new Vec3(0, 60, 0))
  })

  const mcData26 = require('minecraft-data')('26.1')
  const Block26 = require('prismarine-block')('26.1')
  // a flat stone floor (top at y=60) with `blockAt` deciding any other block, on 26.1 data
  function world26 (blockAt) {
    return {
      getBlock: (pos) => {
        const type = blockAt(pos) ?? (pos.y < 60 ? mcData26.blocksByName.stone.id : mcData26.blocksByName.air.id)
        const b = new Block26(type, 0, 0)
        b.position = pos
        return b
      }
    }
  }
  function player26 (pos, controls) {
    const player = fakePlayer(pos)
    player.version = '26.1'
    player.entity.onGround = true
    player.entity.velocity.y = -0.0784 // steady value while standing: (0 - gravity) * drag
    player.entity.yaw = -Math.PI / 2 // +x
    return { player, state: new PlayerState(player, controls) }
  }
  const walkControls = { forward: true, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }

  it('is held back by powder snow like the game (0.9 of the input, velocity dropped each tick)', () => {
    const snow = mcData26.blocksByName.powder_snow.id
    const world = world26((pos) => (pos.y === 60 && pos.x >= 3) ? snow : undefined)
    const physics = Physics(mcData26, world)
    const { player, state } = player26(new Vec3(0.5, 60, 0.5), walkControls)
    const steps = []
    for (let i = 0; i < 40; i++) {
      const before = player.entity.position.x
      physics.simulatePlayer(state, world).apply(player)
      steps.push(player.entity.position.x - before)
    }
    // the real client inches through at 0.0879 blocks per tick once inside
    expect(steps[39]).toBeCloseTo(0.0879, 3)
    expect(player.entity.velocity.x).toBe(0)
  })

  it('still walks at full speed on plain ground on 26.1', () => {
    const world = world26(() => undefined)
    const physics = Physics(mcData26, world)
    const { player, state } = player26(new Vec3(0.5, 60, 0.5), walkControls)
    for (let i = 0; i < 40; i++) physics.simulatePlayer(state, world).apply(player)
    expect(player.entity.velocity.x).toBeCloseTo(0.1179, 3)
  })
})
