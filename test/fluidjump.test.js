/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')

const jump = { forward: false, back: false, left: false, right: false, jump: true, sprint: false, sneak: false }

// A player standing on a stone floor (top at y=60) in a fluid block at its feet, pressing jump
// for one tick. metadata is the fluid level: 0 a source (8/9 deep), 5 a flow 3/9 deep.
// Returns how far the player rose.
function jumpIn (version, fluid, metadata) {
  const data = require('minecraft-data')(version)
  const Block = require('prismarine-block')(version)
  const world = {
    getBlock: (pos) => {
      let b
      if (pos.y < 60) b = new Block(data.blocksByName.stone.id, 0, 0)
      else if (pos.y === 60) {
        b = new Block(data.blocksByName[fluid].id, 0, 0)
        b.metadata = metadata
      } else b = new Block(data.blocksByName.air.id, 0, 0)
      b.position = pos
      return b
    }
  }
  const physics = Physics(data, world)
  const player = {
    entity: {
      position: new Vec3(0.5, 60, 0.5),
      velocity: new Vec3(0, 0, 0),
      onGround: true,
      isInWater: fluid === 'water',
      isInLava: fluid === 'lava',
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
    version,
    inventory: { slots: [] }
  }
  physics.simulatePlayer(new PlayerState(player, jump), world).apply(player)
  return player.entity.position.y - 60
}

const groundJump = Math.fround(0.42)

describe('Jumping in fluid at the feet', () => {
  // LivingEntity.aiStep: on the ground in fluid no deeper than 0.4 the jump key jumps as off
  // the ground (0.42); deeper, or off the ground, it swims up (0.04 a tick)
  for (const version of ['1.13.2', '1.15.2', '1.16.5', '1.20.4', '1.21.4', '26.1']) {
    it(`jumps as off the ground in water 3/9 deep on ${version}`, () => {
      expect(jumpIn(version, 'water', 5)).toBeCloseTo(groundJump, 6)
    })

    it(`swims up in a water source on ${version}`, () => {
      expect(jumpIn(version, 'water', 0)).toBeLessThan(0.1)
    })
  }

  for (const version of ['1.16.5', '1.20.4', '1.21.4', '26.1']) {
    it(`jumps as off the ground in lava 3/9 deep on ${version}`, () => {
      expect(jumpIn(version, 'lava', 5)).toBeCloseTo(groundJump, 6)
    })
  }

  for (const version of ['1.13.2', '1.15.2']) {
    it(`swims up in lava 3/9 deep on ${version}, which has no shallow lava jump`, () => {
      expect(jumpIn(version, 'lava', 5)).toBeLessThan(0.1)
    })
  }

  it('swims up in shallow water on 1.12.2, before the fluid height was measured', () => {
    expect(jumpIn('1.12.2', 'water', 5)).toBeLessThan(0.1)
  })
})
