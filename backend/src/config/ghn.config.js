/**
 * GHN (Giao Hàng Nhanh) — token & shop_id từ .env (không commit secret).
 * GHN_MASTER_BASE: .../shiip/public-api  (master-data không nằm dưới /v2)
 * GHN_API_V2_BASE: .../shiip/public-api/v2
 */
module.exports = {
  token: (process.env.GHN_TOKEN || '').trim(),
  shopId: parseInt(process.env.GHN_SHOP_ID || '0', 10),
  masterBase: (process.env.GHN_MASTER_BASE || 'https://online-gateway.ghn.vn/shiip/public-api').replace(
    /\/$/,
    ''
  ),
  v2Base: (process.env.GHN_API_V2_BASE || 'https://online-gateway.ghn.vn/shiip/public-api/v2').replace(
    /\/$/,
    ''
  ),
  fallbackFeeVnd: Math.max(0, parseInt(process.env.GHN_FALLBACK_FEE_VND || '35000', 10)),
  requestTimeoutMs: Math.max(1000, parseInt(process.env.GHN_REQUEST_TIMEOUT_MS || '10000', 10)),
  /**
   * Kho lấy hàng mặc định (GHN DistrictID + WardCode) khi SellerProfile thiếu cặp from_* đầy đủ.
   * Ưu tiên GHN_SHOP_* rồi tới GHN_FROM_* (tương thích .env cũ). GHN cần cả district + ward.
   */
  defaultFromDistrictId: (() => {
    const shop = Math.max(0, parseInt(process.env.GHN_SHOP_DISTRICT_ID || '0', 10));
    const from = Math.max(0, parseInt(process.env.GHN_FROM_DISTRICT_ID || '0', 10));
    return shop > 0 ? shop : from;
  })(),
  defaultFromWardCode: (() => {
    const shop = (process.env.GHN_SHOP_WARD_CODE || '').trim();
    const from = (process.env.GHN_FROM_WARD_CODE || '').trim();
    return shop || from;
  })(),
};
