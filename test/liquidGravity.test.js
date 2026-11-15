/* eslint-env mocha */

const expect = require('expect')
const features = require('../lib/features.json')

describe('Liquid gravity feature', () => {
  it('proportionalLiquidGravity should include 26.1, 26.2 and 26.3', () => {
    // Physics() throws if a version's majorVersion matches neither independentLiquidGravity nor
    // proportionalLiquidGravity (see index.js) — 26.2 and then 26.3 were each missing here in
    // turn, breaking Physics() construction for every consumer as soon as minecraft-data ships
    // data for that point release.
    const proportional = features.find(f => f.name === 'proportionalLiquidGravity')
    expect(proportional).toBeTruthy()
    expect(proportional.versions).toContain('26.1')
    expect(proportional.versions).toContain('26.2')
    expect(proportional.versions).toContain('26.3')
  })
})
