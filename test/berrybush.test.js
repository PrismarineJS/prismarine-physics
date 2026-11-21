/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')

const walk = { forward: true, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }

// A player walking from inside a sweet berry bush on a flat stone floor (top at y=60), one new
// PlayerState per tick as mineflayer makes them. Returns the x step of each tick.
function walkInBush (version, ticks) {
  const data = require('minecraft-data')(version)
  const Block = require('prismarine-block')(version)
  const bush = data.blocksByName.sweet_berry_bush.id
  const world = {
    getBlock: (pos) => {
      const type = pos.y < 60 ? data.blocksByName.stone.id : (pos.y === 60 ? bush : data.blocksByName.air.id)
      const b = new Block(type, 0, 0)
      b.position = pos
      return b
    }
  }
  const physics = Physics(data, world)
  const player = {
    entity: {
      position: new Vec3(0.5, 60, 0.5),
      velocity: new Vec3(0, -0.0784, 0),
      onGround: true,
      isInWater: false,
      isInLava: false,
      isInWeb: false,
      isCollidedHorizontally: false,
      isCollidedVertically: false,
      elytraFlying: false,
      yaw: -Math.PI / 2, // +x
      pitch: 0,
      effects: {}
    },
    jumpTicks: 0,
    jumpQueued: false,
    fireworkRocketDuration: 0,
    version,
    inventory: { slots: [] }
  }
  const steps = []
  for (let i = 0; i < ticks; i++) {
    const before = player.entity.position.x
    physics.simulatePlayer(new PlayerState(player, walk), world).apply(player)
    steps.push(player.entity.position.x - before)
  }
  return { steps, player }
}

describe('Sweet berry bush', () => {
  for (const version of ['1.14.4', '1.16.5', '1.20.4', '1.21.4', '26.1']) {
    it(`holds a walking player back by 0.8 of each move on ${version}`, () => {
      const { steps, player } = walkInBush(version, 20)
      // SweetBerryBushBlock.entityInside: makeStuckInBlock(0.8, 0.75, 0.8). The first move is not
      // held yet (the bush is seen after it); from then on each move is 0.8 of the input's push
      // and the velocity is dropped, so from the third tick every move is 0.8 of the first.
      for (let i = 2; i < steps.length; i++) {
        expect(steps[i]).toBeCloseTo(steps[0] * 0.8, 6)
      }
      expect(player.entity.velocity.x).toBe(0)
    })
  }
})
