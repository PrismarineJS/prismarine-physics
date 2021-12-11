/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')

const mcData = require('minecraft-data')('1.13.2')
const Block = require('prismarine-block')('1.13.2')

const fakeWorld = {
  getBlock: (pos) => {
    // Making a wall around 0, 0 in order to align the fake player, we are testing if the player is being pushed or not
    const type = (pos.y < 60 || pos.x === 1 || pos.x === -1 || pos.z === 1 || pos.z === -1) ? mcData.blocksByName.stone.id : mcData.blocksByName.air.id
    const b = new Block(type, 0, 0)
    b.position = pos
    return b
  }
}

function fakePlayer (pos, id) {
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
      yaw: 0,
      effects: {},
      id: id,
      width: 0.6,
      height: 1.8
    },
    jumpTicks: 0,
    jumpQueued: false,
    entities: [],
    version: '1.13.2',
    inventory: {
      slots: []
    }
  }
}

describe('Collision tests', () => {
  it('Collision tests', () => {
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
    const player = fakePlayer(new Vec3(0.6, 60.3, 0.6), 0)
    const dummy = fakePlayer(new Vec3(0.55, 60.3, 0.55), 1)

    player.entities.push(dummy.entity)

    for (let i = 0; i < 20; i++) {
      const playerState = new PlayerState(player, controls)
      physics.simulatePlayer(playerState, fakeWorld).apply(player)
    }

    expect(player.entity.position).toEqual(new Vec3(0.7, 60, 0.7))
  })
})
