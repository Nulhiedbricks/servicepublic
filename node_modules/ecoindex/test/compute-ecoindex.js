import {expect} from 'chai';
import {getQuantiles, computeEcoIndex} from "../dist/index.js";

/**
 * Test ecoIndex value.
 *
 * The ecoindex is based on quantiles of 3 parameters.
 * If the 3 parameters are based on the same quantile level,
 * the ecoIndex is expected to be equal to 100 - (quantileLevel * 100 / quantileNumber)
 * The same quantile index for each parameters should
 */
describe('Compute ecoIndex', async () => {
  it(`Should give the right ecoIndex according to quantiles boundary`, async () => {
    const quantiles = getQuantiles();
    const quantilesRange = 100 / (quantiles.dom.length - 1);

    for (let i in quantiles.dom) {
      const ecoIndex = computeEcoIndex(quantiles.dom[i], quantiles.req[i], quantiles.size[i]);
      expect(ecoIndex).to.be.a('number').to.be.eq(100 - (i * quantilesRange));
    }
  });
});
