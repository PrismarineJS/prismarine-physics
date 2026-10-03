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

  it('stops against a wall where the float32 player box touches it', () => {
    // floor below y=60, a wall from x=5 on
    const wallWorld = {
      getBlock: (pos) => {
        const type = (pos.y < 60 || pos.x >= 5) ? mcData.blocksByName.stone.id : mcData.blocksByName.air.id
        const b = new Block(type, 0, 0)
        b.position = pos
        return b
      }
    }
    const physics = Physics(mcData, wallWorld)
    const controls = {
      forward: true,
      back: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      sneak: false
    }
    const player = fakePlayer(new Vec3(0.5, 60, 0.5))
    player.entity.onGround = true
    player.entity.yaw = -Math.PI / 2 // facing +x
    const playerState = new PlayerState(player, controls)

    for (let i = 0; i < 60; i++) physics.simulatePlayer(playerState, wallWorld).apply(player)

    // 5 - 0.3f, the same double the vanilla client reports (not 4.7)
    expect(player.entity.position.x).toBe(5 - Math.fround(0.3))
    expect(player.entity.position.x + Math.fround(0.3)).toBe(5)
    expect(player.entity.isCollidedHorizontally).toBe(true)
  })
})
