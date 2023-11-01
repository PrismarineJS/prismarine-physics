/* eslint-env mocha */

const { FeatureList } = require('prismarine-physics')
const assert = require('node:assert')

const mockFeatures = [{
  name: 'A',
  description: 'Simple version requirement',
  versions: ['== 1.19.2']
}, {
  name: 'B',
  description: 'Simple version requirement',
  versions: ['== 1.18.1']
}, {
  name: 'C',
  description: 'Multiple version requirement',
  versions: ['== 1.18.1', '== 1.19.2']
}, {
  name: 'D',
  description: 'Multiple-And version requirement',
  versions: [['>= 1.13', '< 1.20']]
}, {
  name: 'E',
  description: 'Lagency version requirement',
  versions: ['1.19']
}, {
  name: 'F',
  description: 'Lagency version requirement',
  versions: ['1.14']
}]

describe('Test of FeatureList()', () => {
  it('Test FeatureList conditions', () => {
    const mcData = require('minecraft-data')('1.19.2')
    const supportedFeatureList = new FeatureList(mockFeatures, mcData.version)
    assert.ok(supportedFeatureList.supportFeature('A'))
    assert.ok(!supportedFeatureList.supportFeature('B'))
    assert.ok(supportedFeatureList.supportFeature('C'))
    assert.ok(supportedFeatureList.supportFeature('D'))
    assert.ok(supportedFeatureList.supportFeature('E'))
    assert.ok(!supportedFeatureList.supportFeature('F'))
  })
})
