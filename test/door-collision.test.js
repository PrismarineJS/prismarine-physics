/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')

const mcData = require('minecraft-data')('1.13.2')
const Block = require('prismarine-block')('1.13.2')

// Mock world with door blocks
function createWorldWithDoor (doorType = 'oak_door', isOpen = false, doorPos = new Vec3(0, 60, 0)) {
  return {
    getBlock: (pos) => {
      // Return door at specified position
      if (pos.x === doorPos.x && pos.y === doorPos.y && pos.z === doorPos.z) {
        const b = new Block(mcData.blocksByName[doorType].id, 0, 0)
        b.position = pos
        b.isOpen = isOpen
        return b
      }

      // Stone below y=60, air above
      const type = (pos.y < 60) ? mcData.blocksByName.stone.id : mcData.blocksByName.air.id
      const b = new Block(type, 0, 0)
      b.position = pos
      return b
    }
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

describe('Door collision tests', () => {
  describe('Default behavior (backward compatibility)', () => {
    it('should block movement through closed doors', () => {
      const world = createWorldWithDoor('oak_door', false, new Vec3(0, 60, 0))
      const physics = Physics(mcData, world) // Default config

      const controls = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
      const player = fakePlayer(new Vec3(0, 61, 0))
      const playerState = new PlayerState(player, controls)

      // Try to move down onto the door
      playerState.vel.y = -0.1
      physics.simulatePlayer(playerState, world).apply(player)

      // Player should stop at the door (y >= 61)
      expect(player.entity.position.y).toBeGreaterThanOrEqual(61)
    })

    it('should block movement through open doors by default', () => {
      const world = createWorldWithDoor('oak_door', true, new Vec3(0, 60, 0))
      const physics = Physics(mcData, world) // Default config

      const controls = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
      const player = fakePlayer(new Vec3(0, 61, 0))
      const playerState = new PlayerState(player, controls)

      // Try to move down onto the open door
      playerState.vel.y = -0.1
      physics.simulatePlayer(playerState, world).apply(player)

      // Player should stop at the door (y >= 61)
      expect(player.entity.position.y).toBeGreaterThanOrEqual(61)
    })
  })

  describe('With allowOpenDoorPassage enabled', () => {
    it('should allow movement through open doors', () => {
      const world = createWorldWithDoor('oak_door', true, new Vec3(0, 60, 0))
      const physics = Physics(mcData, world, { allowOpenDoorPassage: true })

      const controls = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
      const player = fakePlayer(new Vec3(0, 61, 0))
      const playerState = new PlayerState(player, controls)

      // Try to move down onto the open door
      playerState.vel.y = -0.1
      physics.simulatePlayer(playerState, world).apply(player)

      // Player should pass through the door (y < 61)
      expect(player.entity.position.y).toBeLessThan(61)
    })

    it('should still block movement through closed doors', () => {
      const world = createWorldWithDoor('oak_door', false, new Vec3(0, 60, 0))
      const physics = Physics(mcData, world, { allowOpenDoorPassage: true })

      const controls = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
      const player = fakePlayer(new Vec3(0, 61, 0))
      const playerState = new PlayerState(player, controls)

      // Try to move down onto the closed door
      playerState.vel.y = -0.1
      physics.simulatePlayer(playerState, world).apply(player)

      // Player should stop at the door (y >= 61)
      expect(player.entity.position.y).toBeGreaterThanOrEqual(61)
    })

    it('should work with different door types', () => {
      const doorTypes = ['oak_door', 'spruce_door', 'birch_door', 'jungle_door', 'acacia_door', 'dark_oak_door']

      doorTypes.forEach(doorType => {
        if (mcData.blocksByName[doorType]) {
          const world = createWorldWithDoor(doorType, true, new Vec3(0, 60, 0))
          const physics = Physics(mcData, world, { allowOpenDoorPassage: true })

          const controls = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
          const player = fakePlayer(new Vec3(0, 61, 0))
          const playerState = new PlayerState(player, controls)

          playerState.vel.y = -0.1
          physics.simulatePlayer(playerState, world).apply(player)

          expect(player.entity.position.y).toBeLessThan(61)
        }
      })
    })
  })

  describe('Collision sliding feature', () => {
    it('should have enableCollisionSliding option available', () => {
      const world = createWorldWithDoor()
      const physics = Physics(mcData, world, { enableCollisionSliding: true })

      expect(physics.config.enableCollisionSliding).toBe(true)
    })

    it('should default to false', () => {
      const world = createWorldWithDoor()
      const physics = Physics(mcData, world)

      expect(physics.config.enableCollisionSliding).toBe(false)
    })
  })

  describe('Configuration validation', () => {
    it('should handle boolean conversion correctly', () => {
      const world = createWorldWithDoor()

      // Test various truthy values
      const physics1 = Physics(mcData, world, { allowOpenDoorPassage: true })
      expect(physics1.config.allowOpenDoorPassage).toBe(true)

      const physics2 = Physics(mcData, world, { allowOpenDoorPassage: 1 })
      expect(physics2.config.allowOpenDoorPassage).toBe(true)

      const physics3 = Physics(mcData, world, { allowOpenDoorPassage: 'yes' })
      expect(physics3.config.allowOpenDoorPassage).toBe(true)

      // Test various falsy values
      const physics4 = Physics(mcData, world, { allowOpenDoorPassage: false })
      expect(physics4.config.allowOpenDoorPassage).toBe(false)

      const physics5 = Physics(mcData, world, { allowOpenDoorPassage: 0 })
      expect(physics5.config.allowOpenDoorPassage).toBe(false)

      const physics6 = Physics(mcData, world, { allowOpenDoorPassage: null })
      expect(physics6.config.allowOpenDoorPassage).toBe(false)

      const physics7 = Physics(mcData, world, { allowOpenDoorPassage: undefined })
      expect(physics7.config.allowOpenDoorPassage).toBe(false)
    })

    it('should ignore invalid properties', () => {
      const world = createWorldWithDoor()
      const physics = Physics(mcData, world, {
        allowOpenDoorPassage: true,
        invalidProperty: true,
        randomOption: 'should be ignored'
      })

      expect(physics.config.allowOpenDoorPassage).toBe(true)
      expect(physics.config.invalidProperty).toBeUndefined()
      expect(physics.config.randomOption).toBeUndefined()
    })
  })
})
