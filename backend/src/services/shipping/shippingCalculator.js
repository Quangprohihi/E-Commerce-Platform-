const { fetchShippingFee } = require('./ghnClient.service');

/**
 * @param {number} n
 * @returns {number}
 */
function roundMoneyVnd(n) {
  return Math.round(Number(n) || 0);
}

/**
 * @param {{ length: number, width: number, height: number }} boxCm
 * @param {number} divisor
 * @returns {number} volumetric grams (integer-ish)
 */
function volumetricGramsFromBox(boxCm, divisor) {
  const L = Number(boxCm.length) || 0;
  const W = Number(boxCm.width) || 0;
  const H = Number(boxCm.height) || 0;
  if (L <= 0 || W <= 0 || H <= 0) return 0;
  const cm3 = L * W * H;
  return (cm3 / divisor) * 1000;
}

/**
 * @param {Array<{ quantity: number, product: object }>} sellerLines
 * @param {object} config
 * @returns {number} billable weight in grams (rounded up)
 */
function aggregateBillableWeightGrams(sellerLines, config) {
  const divisor = config.volumetricDivisor;
  const defBox = config.defaultBoxCm;
  let actualSum = 0;
  let volumetricSum = 0;

  for (const line of sellerLines) {
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
    if (qty === 0) continue;
    const p = line.product;
    const w = p.weightGrams != null ? Number(p.weightGrams) : config.defaultWeightGramsPerUnit;
    const L = p.packageLengthCm != null ? Number(p.packageLengthCm) : defBox.length;
    const W = p.packageWidthCm != null ? Number(p.packageWidthCm) : defBox.width;
    const H = p.packageHeightCm != null ? Number(p.packageHeightCm) : defBox.height;
    const volG = volumetricGramsFromBox({ length: L, width: W, height: H }, divisor);
    actualSum += qty * Math.max(0, w);
    volumetricSum += qty * Math.max(0, volG);
  }

  const raw = Math.max(actualSum, volumetricSum);
  return Math.max(1, Math.ceil(raw));
}

/**
 * Kích thước kiện gửi GHN: max chiều dài/rộng theo dòng; tổng chiều cao (H × qty) mỗi dòng, trần 150cm.
 * @param {Array<{ quantity: number, product: object }>} sellerLines
 * @param {object} config
 * @returns {{ lengthCm: number, widthCm: number, heightCm: number }}
 */
function aggregateParcelDimensionsCm(sellerLines, config) {
  const defBox = config.defaultBoxCm;
  let maxL = 0;
  let maxW = 0;
  let sumH = 0;

  for (const line of sellerLines) {
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const p = line.product;
    const L = p.packageLengthCm != null ? Number(p.packageLengthCm) : defBox.length;
    const W = p.packageWidthCm != null ? Number(p.packageWidthCm) : defBox.width;
    const H = p.packageHeightCm != null ? Number(p.packageHeightCm) : defBox.height;
    maxL = Math.max(maxL, L);
    maxW = Math.max(maxW, W);
    sumH += Math.max(0, H) * qty;
  }

  const lengthCm = Math.max(1, Math.min(150, Math.ceil(maxL > 0 ? maxL : defBox.length)));
  const widthCm = Math.max(1, Math.min(150, Math.ceil(maxW > 0 ? maxW : defBox.width)));
  const heightCm = Math.max(1, Math.min(150, Math.ceil(sumH > 0 ? sumH : defBox.height)));

  return { lengthCm, widthCm, heightCm };
}

/**
 * @param {{ itemsSubtotalVnd: number, shippingFee: number, config: object }}
 */
function computeShippingDiscount({ itemsSubtotalVnd, shippingFee, config }) {
  const th = config.freeship.thresholdSubtotalVnd;
  const cap = config.freeship.maxDiscountVnd;
  if (itemsSubtotalVnd < th) return 0;
  return roundMoneyVnd(Math.min(shippingFee, cap));
}

/**
 * @param {{ itemsSubtotalVnd: number, isCod: boolean, config: object }}
 */
function computeCodFee({ itemsSubtotalVnd, isCod, config }) {
  if (!isCod) return 0;
  const { percent, minVnd, maxVnd } = config.cod;
  const raw = itemsSubtotalVnd * percent;
  return roundMoneyVnd(Math.min(maxVnd, Math.max(minVnd, raw)));
}

function parseGhnDistrictId(str) {
  const s = String(str || '').trim();
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** GHN DistrictID từ SellerProfile (Int) hoặc chuỗi số legacy. */
function parseSellerDistrictId(value) {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/**
 * @param {{
 *   sellerId: string,
 *   sellerLines: Array<{ quantity: number, price: number, product: object }>,
 *   sellerProvinceId?: number|null,
 *   sellerDistrictId?: number|null,
 *   sellerWardCode?: string|null,
 *   buyerProvinceCode?: string|null,
 *   buyerDistrictCode?: string|null,
 *   buyerWardCode?: string|null,
 *   paymentMethod: string,
 *   config?: object
 * }} input
 */
async function calculateSellerOrderShipping(input) {
  const config = input.config || require('../../config/shipping.config');
  const itemsSubtotalVnd = roundMoneyVnd(
    input.sellerLines.reduce((s, line) => {
      const price = Number(line.price);
      const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
      return s + price * qty;
    }, 0)
  );

  const billableWeightGrams = aggregateBillableWeightGrams(input.sellerLines, config);
  const { lengthCm, widthCm, heightCm } = aggregateParcelDimensionsCm(input.sellerLines, config);

  const toDistrictId = parseGhnDistrictId(input.buyerDistrictCode);
  const toWardCode = String(input.buyerWardCode || '').trim();

  const fromDistrictId = parseSellerDistrictId(input.sellerDistrictId);
  const fromWardCode =
    input.sellerWardCode != null && String(input.sellerWardCode).trim()
      ? String(input.sellerWardCode).trim()
      : null;

  const feeResult = await fetchShippingFee({
    to_district_id: toDistrictId || 0,
    to_ward_code: toWardCode,
    weightGrams: billableWeightGrams,
    lengthCm,
    widthCm,
    heightCm,
    from_district_id: fromDistrictId,
    from_ward_code: fromWardCode,
  });

  const shippingFee = roundMoneyVnd(feeResult.total);
  const shippingDiscount = computeShippingDiscount({
    itemsSubtotalVnd,
    shippingFee,
    config,
  });
  const netShipping = roundMoneyVnd(Math.max(0, shippingFee - shippingDiscount));
  const isCod = String(input.paymentMethod || '').toUpperCase() === 'COD';
  const codFee = computeCodFee({ itemsSubtotalVnd, isCod, config });
  const lineTotal = roundMoneyVnd(itemsSubtotalVnd + netShipping + codFee);

  return {
    sellerId: input.sellerId,
    itemsSubtotal: itemsSubtotalVnd,
    itemsAmount: itemsSubtotalVnd,
    shippingFee,
    shippingDiscount,
    codFee,
    lineTotal,
    billableWeightGrams,
    shippingQuoteSource: feeResult.usedFallback ? 'GHN_FALLBACK' : 'GHN',
  };
}

module.exports = {
  roundMoneyVnd,
  volumetricGramsFromBox,
  aggregateBillableWeightGrams,
  aggregateParcelDimensionsCm,
  computeShippingDiscount,
  computeCodFee,
  calculateSellerOrderShipping,
};
