/* eslint-env mocha */

const expect = require('expect')
const features = require('../lib/features.json')

describe('Liquid gravity feature', () => {
  it('proportionalLiquidGravity should include 26.1 and 26.2', () => {
    // Physics() throws if a version's majorVersion matches neither independentLiquidGravity nor
    // proportionalLiquidGravity (see index.js) — 26.2 was missing here, breaking Physics()
    // construction for every consumer as soon as minecraft-data ships data for 26.2.
    const proportional = features.find(f => f.name === 'proportionalLiquidGravity')
    expect(proportional).toBeTruthy()
    expect(proportional.versions).toContain('26.1')
    expect(proportional.versions).toContain('26.2')
  })
})
