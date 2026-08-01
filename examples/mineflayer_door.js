const mineflayer = require('mineflayer')
const { Physics, PlayerState } = require('prismarine-physics')

// Create bot that connects to local server
const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'DoorBot'
})

bot.on('spawn', () => {
  console.log('Bot spawned and ready!')

  // Get minecraft data for the server version
  const mcData = require('minecraft-data')(bot.version)

  // Create physics instance with door passage enabled
  const physics = Physics(mcData, bot.world, { allowOpenDoorPassage: true })

  // Example: Try to walk through nearby open doors
  bot.on('physicTick', () => {
    // Create player state from bot
    const playerState = new PlayerState(bot, bot.control)

    // Simulate physics with door passage enabled
    physics.simulatePlayer(playerState, bot.world).apply(bot)
  })

  // Simple movement test - walk forward
  bot.setControlState('forward', true)

  console.log('Bot will now try to walk through open doors!')
  console.log('Place an open door in front of the bot to test.')
})

bot.on('error', (err) => {
  console.error('Bot error:', err)
})

bot.on('end', () => {
  console.log('Bot disconnected')
})
