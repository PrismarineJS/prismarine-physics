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

  it('applies water motion on the first tick the feet are below the surface (1.13+)', () => {
    const water = mcData26.blocksByName.water.id
    // pool from x=3 on: water down to y=58, air above it; stone floor elsewhere
    const world = world26((pos) => (pos.x >= 3 && pos.y <= 59 && pos.y >= 57) ? water : (pos.x >= 3 && pos.y === 60) ? mcData26.blocksByName.air.id : undefined)
    const physics = Physics(mcData26, world)
    const { player, state } = player26(new Vec3(0.5, 60, 0.5), walkControls)
    const rows = []
    for (let i = 0; i < 30; i++) {
      physics.simulatePlayer(state, world).apply(player)
      rows.push({ y: player.entity.position.y, vy: player.entity.velocity.y, inWater: player.entity.isInWater })
    }
    const surface = 59 + 8 / 9 // a source block is 8/9 tall
    const dip = rows.findIndex(r => r.y < surface)
    expect(dip).toBeGreaterThan(0)
    // the tick after the feet dipped below the surface already used water motion: vy = vy * 0.8 - gravity / 16
    const before = rows[dip].vy
    expect(rows[dip + 1].inWater).toBe(true)
    expect(rows[dip + 1].vy).toBeCloseTo(before * 0.8 - 0.08 / 16, 6)
  })

  // Shallow lava (surface just above the feet) is the case that distinguishes the versions: 1.16+ has a dedicated shallow
  // regime in LivingEntity.travel, while 1.13-1.15 have no split and scale the whole lava velocity by lavaInertia then
  // subtract gravity/4. Same physical setup, feet at 60.5 over lava topping out ~60.79, initial upward velocity 0.1.
  function lavaFloatVy (ver) {
    const data = require('minecraft-data')(ver)
    const VBlock = require('prismarine-block')(ver)
    const world = {
      getBlock: (pos) => {
        const type = (pos.y <= 60 && pos.y > 50) ? data.blocksByName.lava.id : (pos.y <= 50 ? data.blocksByName.stone.id : data.blocksByName.air.id)
        const b = new VBlock(type, 0, 0)
        b.position = pos
        return b
      }
    }
    const physics = Physics(data, world)
    const player = fakePlayer(new Vec3(0.5, 60.5, 0.5))
    player.version = ver
    player.entity.velocity.y = 0.1
    const state = new PlayerState(player, { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false })
    physics.simulatePlayer(state, world).apply(player)
    return { inLava: player.entity.isInLava, vy: player.entity.velocity.y }
  }

  it('uses the pre-1.16 deep-only lava rule on 1.15.2 (no shallow split)', () => {
    const { inLava, vy } = lavaFloatVy('1.15.2')
    expect(inLava).toBe(true)
    // deep branch: 0.1 * lavaInertia(0.5) - gravity/4 (0.08/4) = 0.05 - 0.02 = 0.03
    expect(vy).toBeCloseTo(0.03, 6)
  })

  it('uses the shallow lava regime on 1.16.5', () => {
    const { inLava, vy } = lavaFloatVy('1.16.5')
    expect(inLava).toBe(true)
    // shallow branch: vy *= 0.8 -> 0.08, fallingAdjusted(0.08) = 0.08 - gravity/16, then - gravity/4 = 0.055
    expect(vy).toBeCloseTo(0.055, 6)
  })

  it('keeps the 1.8 fluid test on old versions', () => {
    const water18 = mcData.blocksByName.water.id
    const world = {
      getBlock: (pos) => {
        const type = (pos.y < 60) ? water18 : mcData.blocksByName.air.id
        const b = new Block(type, 0, 0)
        b.position = pos
        return b
      }
    }
    const physics = Physics(mcData, world)
    const player = fakePlayer(new Vec3(0.5, 60.5, 0.5))
    const state = new PlayerState(player, { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false })
    physics.simulatePlayer(state, world).apply(player)
    expect(typeof player.entity.isInWater).toBe('boolean')
  })
})

describe('Sprint state', () => {
  // LocalPlayer.aiStep decides whether the player is sprinting from the sprint key, the forward input, sneaking
  // and the previous tick's horizontal collision; the engine mirrors it in entity.isSprinting
  function makeWorld (version, wallAt) {
    const data = require('minecraft-data')(version)
    const VBlock = require('prismarine-block')(version)
    const world = {
      wall: true,
      getBlock: (pos) => {
        const solid = pos.y < 60 || (world.wall && wallAt(pos))
        const b = new VBlock(solid ? data.blocksByName.stone.id : data.blocksByName.air.id, 0, 0)
        b.position = pos
        return b
      }
    }
    return { data, world }
  }

  function makePlayer (version, pos, yaw) {
    const player = fakePlayer(pos)
    player.version = version
    player.entity.onGround = true
    player.entity.velocity = new Vec3(0, -0.0784, 0)
    player.entity.yaw = yaw ?? Math.PI // face +z
    return player
  }

  function tick (physics, world, player, controls) {
    const before = player.entity.position.clone()
    physics.simulatePlayer(new PlayerState(player, { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false, ...controls }), world).apply(player)
    return player.entity.position.minus(before)
  }

  it('stops sprinting for the tick after a head-on collision and starts again once free', () => {
    const { data, world } = makeWorld('26.1', (pos) => pos.z === 5 && pos.y < 62)
    const physics = Physics(data, world)
    const player = makePlayer('26.1', new Vec3(0.5, 60, 3.5))
    let moved
    for (let i = 0; i < 20 && !player.entity.isCollidedHorizontally; i++) {
      moved = tick(physics, world, player, { forward: true, sprint: true })
      expect(player.entity.isSprinting).toBe(true)
    }
    // the first touch still moved forward a little, which the client counts as a minor collision
    expect(player.entity.isCollidedHorizontally).toBe(true)
    expect(player.entity.minorHorizontalCollision).toBe(true)
    moved = tick(physics, world, player, { forward: true, sprint: true })
    expect(player.entity.isSprinting).toBe(true)
    expect(moved.z).toBe(0) // pressed against the wall: this collision is not minor
    expect(player.entity.minorHorizontalCollision).toBe(false)
    world.wall = false // the way is clear again: the client still runs this tick without the sprint
    moved = tick(physics, world, player, { forward: true, sprint: true })
    expect(player.entity.isSprinting).toBe(false)
    expect(moved.z).toBeCloseTo(0.098, 4) // walking acceleration from rest, not 0.1274
    moved = tick(physics, world, player, { forward: true, sprint: true })
    expect(player.entity.isSprinting).toBe(true)
    expect(moved.z).toBeCloseTo(0.098 * 0.91 * 0.6 + 0.1274, 2)
  })

  it('keeps sprinting through a minor brush against a wall, drops it for a wider angle (1.18+)', () => {
    for (const [angle, minor] of [[4, true], [12, false]]) {
      const { data, world } = makeWorld('26.1', (pos) => pos.x === -1 && pos.y < 62)
      const physics = Physics(data, world)
      // wanted direction: forward turned `angle` degrees towards the wall on the -x side
      const player = makePlayer('26.1', new Vec3(0.5, 60, 0.5), Math.PI - angle * Math.PI / 180)
      // run until pressed against the wall (the first touch still moves towards it, a minor collision)
      let moved = new Vec3(1, 0, 0)
      for (let i = 0; i < 60 && !(player.entity.isCollidedHorizontally && moved.x === 0); i++) moved = tick(physics, world, player, { forward: true, sprint: true })
      expect(player.entity.isCollidedHorizontally).toBe(true)
      expect(player.entity.isSprinting).toBe(true)
      expect(player.entity.minorHorizontalCollision).toBe(minor)
      tick(physics, world, player, { forward: true, sprint: true })
      expect(player.entity.isSprinting).toBe(minor)
    }
  })

  it('keeps sprinting through a minor brush from diagonal (forward+right) input', () => {
    // A diagonal input reaching the wall at the same shallow angle as a forward-only brush must also count as minor.
    // The old collision check flipped the strafe sign, so it mis-classified strafe-containing brushes and dropped sprint.
    const { data, world } = makeWorld('26.1', (pos) => pos.x === -1 && pos.y < 62)
    const physics = Physics(data, world)
    const player = makePlayer('26.1', new Vec3(0.5, 60, 0.5), 49 * Math.PI / 180)
    let moved = new Vec3(1, 0, 0)
    for (let i = 0; i < 60 && !(player.entity.isCollidedHorizontally && moved.x === 0); i++) moved = tick(physics, world, player, { forward: true, right: true, sprint: true })
    expect(player.entity.isCollidedHorizontally).toBe(true)
    expect(player.entity.isSprinting).toBe(true)
    expect(player.entity.minorHorizontalCollision).toBe(true)
    tick(physics, world, player, { forward: true, right: true, sprint: true })
    expect(player.entity.isSprinting).toBe(true)
  })

  it('treats every collision as a full stop before 1.18', () => {
    const { data, world } = makeWorld('1.16.5', (pos) => pos.x === -1 && pos.y < 62)
    const physics = Physics(data, world)
    const player = makePlayer('1.16.5', new Vec3(0.5, 60, 0.5), Math.PI - 4 * Math.PI / 180)
    let moved = new Vec3(1, 0, 0)
    for (let i = 0; i < 60 && !(player.entity.isCollidedHorizontally && moved.x === 0); i++) moved = tick(physics, world, player, { forward: true, sprint: true })
    expect(player.entity.isCollidedHorizontally).toBe(true)
    expect(player.entity.minorHorizontalCollision).toBe(true) // the same brush as above
    tick(physics, world, player, { forward: true, sprint: true })
    expect(player.entity.isSprinting).toBe(false) // but no minor-collision rule before 1.18
  })

  it('needs forward input to sprint', () => {
    const { data, world } = makeWorld('26.1', () => false)
    const physics = Physics(data, world)
    const player = makePlayer('26.1', new Vec3(0.5, 60, 0.5))
    const moved = tick(physics, world, player, { right: true, sprint: true })
    expect(player.entity.isSprinting).toBe(false)
    expect(Math.abs(moved.x)).toBeCloseTo(0.098, 4)
    tick(physics, world, player, { forward: true, back: true, sprint: true })
    expect(player.entity.isSprinting).toBe(false)
    tick(physics, world, player, { forward: true, sprint: true })
    expect(player.entity.isSprinting).toBe(true)
    tick(physics, world, player, { forward: false, sprint: true })
    expect(player.entity.isSprinting).toBe(false)
    tick(physics, world, player, { forward: true, sprint: true })
    expect(player.entity.isSprinting).toBe(true)
    tick(physics, world, player, { forward: true, sprint: false }) // releasing the key stops at once (control contract)
    expect(player.entity.isSprinting).toBe(false)
  })

  it('sneaking prevents a sprint from starting and, before 1.14, stops one', () => {
    for (const [version, stops] of [['26.1', false], ['1.8.8', true]]) {
      const { data, world } = makeWorld(version, () => false)
      const physics = Physics(data, world)
      const player = makePlayer(version, new Vec3(0.5, 60, 0.5))
      tick(physics, world, player, { forward: true, sprint: true, sneak: true })
      expect(player.entity.isSprinting).toBe(false)
      tick(physics, world, player, { forward: true, sprint: true })
      expect(player.entity.isSprinting).toBe(true)
      tick(physics, world, player, { forward: true, sprint: true, sneak: true })
      expect(player.entity.isSprinting).toBe(!stops)
    }
  })
})
