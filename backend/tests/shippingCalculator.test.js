jest.mock('../src/services/shipping/ghnClient.service', () => ({
  fetchShippingFee: jest.fn().mockResolvedValue({ total: 40_000, usedFallback: false }),
}));

const { fetchShippingFee } = require('../src/services/shipping/ghnClient.service');
const {
  roundMoneyVnd,
  computeShippingDiscount,
  computeCodFee,
  calculateSellerOrderShipping,
  aggregateBillableWeightGrams,
  volumetricGramsFromBox,
} = require('../src/services/shipping/shippingCalculator');

const baseConfig = require('../src/config/shipping.config');

const minimalProduct = {
  weightGrams: 200,
  packageLengthCm: 16,
  packageWidthCm: 6,
  packageHeightCm: 5,
};

describe('roundMoneyVnd', () => {
  it('rounds', () => {
    expect(roundMoneyVnd(100.4)).toBe(100);
    expect(roundMoneyVnd(100.6)).toBe(101);
  });
});

describe('volumetricGramsFromBox', () => {
  it('uses divisor 5000', () => {
    expect(Math.round(volumetricGramsFromBox({ length: 10, width: 10, height: 10 }, 5000))).toBe(200);
  });
});

describe('computeShippingDiscount (freeship cap)', () => {
  it('no discount below threshold', () => {
    expect(
      computeShippingDiscount({
        itemsSubtotalVnd: 100_000,
        shippingFee: 30_000,
        config: baseConfig,
      })
    ).toBe(0);
  });
  it('caps at maxDiscountVnd', () => {
    expect(
      computeShippingDiscount({
        itemsSubtotalVnd: 600_000,
        shippingFee: 50_000,
        config: baseConfig,
      })
    ).toBe(30_000);
  });
});

describe('computeCodFee', () => {
  it('zero when not COD', () => {
    expect(computeCodFee({ itemsSubtotalVnd: 1_000_000, isCod: false, config: baseConfig })).toBe(0);
  });
  it('clamps min max', () => {
    expect(computeCodFee({ itemsSubtotalVnd: 50_000, isCod: true, config: baseConfig })).toBe(2000);
    expect(computeCodFee({ itemsSubtotalVnd: 10_000_000, isCod: true, config: baseConfig })).toBe(15_000);
  });
});

describe('aggregateBillableWeightGrams', () => {
  it('uses defaults when product fields missing', () => {
    const g = aggregateBillableWeightGrams([{ quantity: 1, product: {} }], baseConfig);
    expect(g).toBeGreaterThan(0);
  });
});

describe('calculateSellerOrderShipping (GHN client)', () => {
  beforeEach(() => {
    fetchShippingFee.mockResolvedValue({ total: 40_000, usedFallback: false });
  });

  it('uses GHN fee, freeship, VNPAY', async () => {
    const row = await calculateSellerOrderShipping({
      sellerId: 's1',
      sellerLines: [{ quantity: 1, price: 600_000, product: minimalProduct }],
      sellerDistrictId: 1444,
      sellerWardCode: '20308',
      buyerDistrictCode: '1444',
      buyerWardCode: '20308',
      paymentMethod: 'VNPAY',
      config: baseConfig,
    });
    expect(fetchShippingFee).toHaveBeenCalled();
    expect(row.shippingFee).toBe(40_000);
    expect(row.shippingDiscount).toBe(30_000);
    expect(row.codFee).toBe(0);
    expect(row.shippingQuoteSource).toBe('GHN');
    expect(row.lineTotal).toBe(roundMoneyVnd(600_000 + 10_000));
  });

  it('COD adds fee', async () => {
    fetchShippingFee.mockResolvedValue({ total: 25_000, usedFallback: false });
    const row = await calculateSellerOrderShipping({
      sellerId: 's1',
      sellerLines: [{ quantity: 1, price: 400_000, product: minimalProduct }],
      buyerDistrictCode: '1442',
      buyerWardCode: '21012',
      paymentMethod: 'COD',
      config: baseConfig,
    });
    expect(row.shippingFee).toBe(25_000);
    expect(row.shippingDiscount).toBe(0);
    expect(row.codFee).toBeGreaterThan(0);
    expect(row.lineTotal).toBe(roundMoneyVnd(400_000 + 25_000 + row.codFee));
  });

  it('marks fallback when GHN returns usedFallback', async () => {
    fetchShippingFee.mockResolvedValue({ total: 35_000, usedFallback: true });
    const row = await calculateSellerOrderShipping({
      sellerId: 's1',
      sellerLines: [{ quantity: 1, price: 100_000, product: minimalProduct }],
      buyerDistrictCode: '1442',
      buyerWardCode: '21012',
      paymentMethod: 'VNPAY',
      config: baseConfig,
    });
    expect(row.shippingQuoteSource).toBe('GHN_FALLBACK');
    expect(row.shippingFee).toBe(35_000);
  });
});
