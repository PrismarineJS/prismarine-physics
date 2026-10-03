/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')

// A player's 0.6 step height clears a one-sixteenth-tall block such as a
// carpet. https://www.mcpk.wiki/wiki/Stepping
//
// Under a two-high ceiling that step was refused when the player was already
// flush against the block, and allowed when it was not, which is what these
// cases pin down.

const version = '1.21'
const mcData = require('minecraft-data')(version)
const Block = require('prismarine-block')(version)

const STONE = mcData.blocksByName.stone.defaultState
const CARPET = mcData.blocksByName.moss_carpet.defaultState
const AIR = mcData.blocksByName.air.defaultState

/**
 * Floor everywhere at y=60. West of the player, at x=-1, a carpet on that floor
 * under a ceiling at y=63, which leaves the destination two cells high. The
 * player starts flush against the carpet's east face with nothing overhead,
 * unless `ceilingOverPlayer` closes its own cell in the same way.
 */
function corridor (ceilingOverPlayer) {
  return {
    getBlock: (pos) => {
      let stateId = AIR
      if (pos.y === 60) stateId = STONE
      else if (pos.y === 61 && pos.x === -1) stateId = CARPET
      else if (pos.y === 63 && pos.x === -1) stateId = STONE
      else if (pos.y === 63 && pos.x === 0 && ceilingOverPlayer) stateId = STONE
      const block = Block.fromStateId(stateId, 0)
      block.position = pos
      return block
    }
  }
}

/** Walk west, into the carpet, for `ticks` ticks. Yaw of PI/2 is -x. */
function walkWest (world, ticks) {
  const player = {
    entity: {
      // x=0.3 puts the player's west face on 0.0, flush with the carpet.
      position: new Vec3(0.3, 61, 0.5),
      velocity: new Vec3(0, 0, 0),
      onGround: true,
      isInWater: false,
      isInLava: false,
      isInWeb: false,
      isCollidedHorizontally: false,
      isCollidedVertically: false,
      elytraFlying: false,
      yaw: Math.PI / 2,
      pitch: 0,
      effects: {}
    },
    jumpTicks: 0,
    jumpQueued: false,
    fireworkRocketDuration: 0,
    version,
    inventory: { slots: [] }
  }
  const controls = {
    forward: true,
    back: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    sneak: false
  }
  const physics = Physics(mcData, world)
  const state = new PlayerState(player, controls)
  for (let tick = 0; tick < ticks; tick++) {
    physics.simulatePlayer(state, world).apply(player)
  }
  return player.entity.position
}

describe('Stepping onto a thin block under a low ceiling', () => {
  it('the fixture really is a one-sixteenth block', () => {
    const carpet = Block.fromStateId(CARPET, 0)
    const height = Math.max(...carpet.shapes.map(shape => shape[4]))

    expect(height).toBeLessThan(0.1)
    expect(height).toBeGreaterThan(0)
  })

  it('steps on to the carpet from a standstill flush against it', () => {
    const position = walkWest(corridor(false), 10)

    // Crossed into the carpet's cell, standing on top of it rather than in it.
    expect(position.x).toBeLessThan(0)
    expect(position.y).toBeGreaterThan(61)
  })

  it('does not depend on what stands over the player', () => {
    // The same move, differing only in a block above the player's own head.
    // That block cannot help the player walk forward, so both must travel.
    const open = walkWest(corridor(false), 10)
    const covered = walkWest(corridor(true), 10)

    expect(open.x).toBeLessThan(0)
    expect(covered.x).toBeLessThan(0)
    expect(Math.abs(open.x - covered.x)).toBeLessThan(0.05)
  })
})
