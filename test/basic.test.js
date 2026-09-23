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

  // Values measured on the real 26.1.2 client walking from rest on each floor
  const mcData26 = require('minecraft-data')('26.1')
  const Block26 = require('prismarine-block')('26.1')
  function walkOn (floorName, ticks) {
    const floorId = mcData26.blocksByName[floorName].id
    const world = {
      getBlock: (pos) => {
        const type = pos.y === 59 ? floorId : (pos.y < 59 ? mcData26.blocksByName.stone.id : mcData26.blocksByName.air.id)
        const b = new Block26(type, 0, 0)
        b.position = pos
        return b
      }
    }
    const physics = Physics(mcData26, world)
    const controls = { forward: true, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
    const player = fakePlayer(new Vec3(0.5, 60, 0.5))
    player.version = '26.1'
    player.entity.onGround = true
    player.entity.velocity.y = -0.0784 // steady value while standing: (0 - gravity) * drag
    player.entity.yaw = -Math.PI / 2 // +x
    const state = new PlayerState(player, controls)
    const steps = []
    for (let i = 0; i < ticks; i++) {
      const before = player.entity.position.x
      physics.simulatePlayer(state, world).apply(player)
      steps.push(player.entity.position.x - before)
    }
    return { player, steps }
  }

  it('walks at full speed on stone', () => {
    const { steps } = walkOn('stone', 40)
    expect(steps[39]).toBeCloseTo(0.2158, 3)
  })

  it('is slowed to the block speed factor on soul sand', () => {
    const { player, steps } = walkOn('soul_sand', 40)
    expect(player.entity.position.y).toBeCloseTo(59.875, 6) // sunk into the block
    expect(steps[39]).toBeCloseTo(0.1254, 3)
  })

  it('is slowed to the block speed factor on honey', () => {
    const { player, steps } = walkOn('honey_block', 40)
    expect(player.entity.position.y).toBeCloseTo(59.9375, 6)
    expect(steps[39]).toBeCloseTo(0.1254, 3)
  })

  it('is slowed by SlimeBlock.stepOn on slime', () => {
    const { steps } = walkOn('slime_block', 40)
    // the game alternates a micro-bounce tick and a landing tick on slime; both are slower than stone
    expect(Math.max(steps[38], steps[39])).toBeLessThan(0.1)
    expect(Math.min(steps[38], steps[39])).toBeGreaterThan(0.05)
  })

  it('reads the bounced velocity for SlimeBlock.stepOn on a 1.15.2 landing', () => {
    // Older-version landing case (1.15.2). SlimeBlock.stepOn runs inside Entity.move on the just-bounced velocity
    // (+0.0784), before travel applies gravity/drag. A grounded player landing with velocity (0.1, -0.0784, 0):
    // step scale 0.4 + 0.0784*0.2 = 0.41568, then slime horizontal drag 0.8*0.91 -> next vx 0.030261504.
    // (Applying the step after travel would read the post-gravity -0.001568 and give 0.02914283008.)
    const data = require('minecraft-data')('1.15.2')
    const VBlock = require('prismarine-block')('1.15.2')
    const slime = data.blocksByName.slime_block.id
    const world = {
      getBlock: (pos) => {
        const b = new VBlock(Math.floor(pos.y) <= 60 ? slime : data.blocksByName.air.id, 0, 0)
        b.position = pos
        return b
      }
    }
    const physics = Physics(data, world)
    const player = fakePlayer(new Vec3(0.5, 61, 0.5))
    player.version = '1.15.2'
    player.entity.onGround = true
    player.entity.velocity = new Vec3(0.1, -0.0784, 0)
    const state = new PlayerState(player, { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false })
    physics.simulatePlayer(state, world).apply(player)
    expect(player.entity.velocity.x).toBeCloseTo(0.030261504, 9)
  })

  it('reads the post-travel velocity for SlimeBlock.stepOn on a 26.1 landing', () => {
    // 1.21.2+ landing case. The step-on moved to after travel (applyEffectsFromBlocks), so it reads the post-gravity
    // vel.y (-0.001568) and the drag-reduced horizontal velocity: 0.1 -> slime drag 0.8*0.91 = 0.0728, then step scale
    // 0.4 + 0.001568*0.2 -> next vx 0.02914283008 (vs the pre-travel 0.030261504 above).
    const data = require('minecraft-data')('26.1')
    const VBlock = require('prismarine-block')('26.1')
    const slime = data.blocksByName.slime_block.id
    const world = {
      getBlock: (pos) => {
        const b = new VBlock(Math.floor(pos.y) <= 60 ? slime : data.blocksByName.air.id, 0, 0)
        b.position = pos
        return b
      }
    }
    const physics = Physics(data, world)
    const player = fakePlayer(new Vec3(0.5, 61, 0.5))
    player.version = '26.1'
    player.entity.onGround = true
    player.entity.velocity = new Vec3(0.1, -0.0784, 0)
    const state = new PlayerState(player, { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false })
    physics.simulatePlayer(state, world).apply(player)
    expect(player.entity.velocity.x).toBeCloseTo(0.02914283008, 9)
  })
})
