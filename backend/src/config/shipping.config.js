/**
 * Shipping: billable weight + Kính Tốt freeship/COD. Base fee comes from 3PL (mock or real API).
 */
module.exports = {
  /** cm³ per kg equivalent (carrier-style divisor) */
  volumetricDivisor: 5000,

  /** Fallback parcel when product has no dimensions (cm) */
  defaultBoxCm: { length: 16, width: 6, height: 5 },

  /** Fallback per unit when product.weightGrams is null */
  defaultWeightGramsPerUnit: 200,

  /**
   * When 1: require buyerDistrictCode + buyerWardCode on quote/create (400 if missing).
   */
  requireBuyerDistrictWard: process.env.SHIPPING_ADDRESS_STRICT === '1',

  freeship: {
    thresholdSubtotalVnd: 500_000,
    maxDiscountVnd: 30_000,
  },

  cod: {
    percent: 0.01,
    minVnd: 2000,
    maxVnd: 15_000,
  },
};
