/* eslint-env mocha */

const expect = require('expect')
const features = require('../lib/features.json')

// Each feature lists its versions explicitly, so a new release gets none of them
// until someone adds it to every list. 26.2 and 26.3 behave like 26.1 for all of
// them, so a feature that covers 26.1 must also cover the later releases.
describe('feature version lists', () => {
  for (const { name, versions } of features.filter(f => f.versions.includes('26.1'))) {
    it(`${name} covers 26.2 and 26.3`, () => {
      expect(versions).toEqual(expect.arrayContaining(['26.2', '26.3']))
    })
  }
})
