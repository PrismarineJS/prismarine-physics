const { Physics, PlayerState } = require('prismarine-physics')
const { Vec3 } = require('vec3')

const mcData = require('minecraft-data')('1.13.2')
const Block = require('prismarine-block')('1.13.2')

// Create a world with doors for testing prismarine-physics door passability
const doorWorld = {
  getBlock: (pos) => {
    let type = mcData.blocksByName.air.id
    let metadata = 0

    // Ground level
    if (pos.y < 60) {
      type = mcData.blocksByName.stone.id
    // Add an open door at position (0, 61, 0)
    } else if (pos.x === 0 && pos.y === 61 && pos.z === 0) {
      type = mcData.blocksByName.oak_door.id
      metadata = 0b10000 // Open door (bit 4 set)
    // Add a closed door at position (2, 61, 0)
    } else if (pos.x === 2 && pos.y === 61 && pos.z === 0) {
      type = mcData.blocksByName.oak_door.id
      metadata = 0 // Closed door
    }

    const b = new Block(type, metadata, 0)
    b.position = pos
    return b
  }
}

function fakePlayer (pos, baseVersion) {
  return {
    entity: {
      position: pos,
      velocity: new Vec3(0, 0, 0),
      onGround: false,
      isInWater: false,
      isInLava: false,
      isInWeb: false,
      elytraFlying: false,
      isCollidedHorizontally: false,
      isCollidedVertically: false,
      yaw: 0,
      pitch: 0,
      effects: []
    },
    inventory: {
      slots: []
    },
    jumpTicks: 0,
    jumpQueued: false,
    fireworkRocketDuration: 0,
    version: baseVersion
  }
}

const physics = Physics(mcData, doorWorld, { allowOpenDoorPassage: true })
const controls = {
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
  sprint: false,
  sneak: false
}

console.log('=== Prismarine-Physics Door Passability Example ===\n')

// Example 1: Entity walking through open door
const player1 = fakePlayer(new Vec3(-2, 62, 0), mcData.version.version)
const playerState1 = new PlayerState(player1, controls)

// Apply forward velocity towards open door
player1.entity.velocity.x = 0.1

// Let entity fall to ground
for (let i = 0; i < 10; i++) {
  physics.simulatePlayer(playerState1, doorWorld).apply(player1)
}

console.log('Entity starting position:', player1.entity.position)

// Entity attempts to walk through open door
for (let i = 0; i < 50; i++) {
  player1.entity.velocity.x = 0.1
  physics.simulatePlayer(playerState1, doorWorld).apply(player1)
}

console.log('Entity final position after open door encounter:', player1.entity.position)

console.log('\n' + '-'.repeat(50) + '\n')

// Example 2: Entity encountering closed door
const player2 = fakePlayer(new Vec3(0, 62, 0), mcData.version.version)
const playerState2 = new PlayerState(player2, controls)

// Apply forward velocity towards closed door
player2.entity.velocity.x = 0.1

for (let i = 0; i < 50; i++) {
  physics.simulatePlayer(playerState2, doorWorld).apply(player2)
}

console.log('Entity position after closed door encounter:', player2.entity.position)

console.log('\n=== Example Complete ===')
console.log('With allowOpenDoorPassage enabled:')
console.log('- Open doors allow entities to pass through')
console.log('- Closed doors still block entity movement')
console.log('- This solves the "perilous conflict" between physics and bot logic layers')
