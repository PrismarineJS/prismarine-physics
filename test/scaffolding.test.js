/* eslint-env mocha */

const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')
const expect = require('expect')
const features = require('../lib/features.json')

describe('Scaffolding climbable and climbUsingJump feature', () => {
  describe('features.json', () => {
    it('climbUsingJump should include version 1.21', () => {
      const climbUsingJump = features.find(f => f.name === 'climbUsingJump')
      expect(climbUsingJump).toBeTruthy()
      expect(climbUsingJump.versions).toContain('1.21')
    })

    it('climbUsingJump should include versions 1.14 through 1.21', () => {
      const climbUsingJump = features.find(f => f.name === 'climbUsingJump')
      for (const v of ['1.14', '1.15', '1.16', '1.17', '1.18', '1.19', '1.20', '1.21']) {
        expect(climbUsingJump.versions).toContain(v)
      }
    })
  })

  describe('Scaffolding is climbable for versions >= 1.14', () => {
    for (const version of ['1.14.4', '1.16.5', '1.21']) {
      it(`should treat scaffolding as climbable in ${version}`, () => {
        const mcData = require('minecraft-data')(version)
        const Block = require('prismarine-block')(version)

        const scaffoldingId = mcData.blocksByName.scaffolding.id
        const stoneId = mcData.blocksByName.stone.id
        const airId = mcData.blocksByName.air.id

        // World: stone below y=60, scaffolding at y=61, air elsewhere
        const fakeWorld = {
          getBlock: (pos) => {
            let type
            if (pos.y < 60) {
              type = stoneId
            } else if (pos.y === 61 && pos.x === 0 && pos.z === 0) {
              type = scaffoldingId
            } else {
              type = airId
            }
            const b = new Block(type, 0, 0)
            b.position = pos
            return b
          }
        }

        const physics = Physics(mcData, fakeWorld)
        const controls = {
          forward: false,
          back: false,
          left: false,
          right: false,
          jump: true,
          sprint: false,
          sneak: false
        }

        const player = {
          entity: {
            position: new Vec3(0, 61, 0),
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
          version,
          inventory: {
            slots: []
          }
        }

        const playerState = new PlayerState(player, controls)
        physics.simulatePlayer(playerState, fakeWorld).apply(player)

        // When on scaffolding with jump pressed, the player should climb
        // (velocity.y should be positive, equal to ladderClimbSpeed)
        expect(player.entity.velocity.y).toBeGreaterThan(0)
      })
    }
  })

  describe('Scaffolding does not exist pre-1.14', () => {
    it('should not crash when scaffolding block does not exist (1.13.2)', () => {
      const mcData = require('minecraft-data')('1.13.2')
      const Block = require('prismarine-block')('1.13.2')

      expect(mcData.blocksByName.scaffolding).toBeFalsy()

      const fakeWorld = {
        getBlock: (pos) => {
          const type = (pos.y < 60) ? mcData.blocksByName.stone.id : mcData.blocksByName.air.id
          const b = new Block(type, 0, 0)
          b.position = pos
          return b
        }
      }

      // Should not throw
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

      const player = {
        entity: {
          position: new Vec3(0, 80, 0),
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

      const playerState = new PlayerState(player, controls)
      physics.simulatePlayer(playerState, fakeWorld).apply(player)
    })
  })
})
