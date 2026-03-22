const axios = require('axios');
const ghnConfig = require('../../config/ghn.config');

function tokenHeaders() {
  return {
    Token: ghnConfig.token,
    'Content-Type': 'application/json',
  };
}

function shopHeaders() {
  return {
    ...tokenHeaders(),
    ShopId: String(ghnConfig.shopId),
  };
}

function assertGhnConfigured() {
  if (!ghnConfig.token || !ghnConfig.shopId) {
    const err = new Error('Chưa cấu hình GHN_TOKEN hoặc GHN_SHOP_ID trên máy chủ.');
    err.statusCode = 503;
    throw err;
  }
}

function unwrapGhnResponse(res, context) {
  const payload = res && res.data;
  if (!payload || typeof payload !== 'object') {
    throw new Error(`${context}: phản hồi GHN không hợp lệ`);
  }
  if (Number(payload.code) !== 200) {
    const msg = payload.message || payload.code_message || 'GHN lỗi';
    const err = new Error(`${context}: ${msg}`);
    err.statusCode = 502;
    throw err;
  }
  return payload.data;
}

/**
 * @returns {Promise<Array<{ provinceId: number, name: string, code: string }>>}
 */
async function fetchProvinces() {
  assertGhnConfigured();
  const url = `${ghnConfig.masterBase}/master-data/province`;
  const res = await axios.get(url, {
    headers: tokenHeaders(),
    timeout: ghnConfig.requestTimeoutMs,
    validateStatus: () => true,
  });
  const data = unwrapGhnResponse(res, 'Danh sách tỉnh');
  const list = Array.isArray(data) ? data : [];
  return list.map((p) => ({
    provinceId: Number(p.ProvinceID ?? p.ProvinceId),
    name: String(p.ProvinceName ?? p.Name ?? ''),
    code: p.Code != null ? String(p.Code) : '',
  }));
}

/**
 * @returns {Promise<Array<{ districtId: number, name: string, code: string }>>}
 */
async function fetchDistricts(provinceId) {
  assertGhnConfigured();
  const pid = Number(provinceId);
  if (!Number.isFinite(pid) || pid <= 0) {
    const err = new Error('provinceId không hợp lệ');
    err.statusCode = 400;
    throw err;
  }
  const url = `${ghnConfig.masterBase}/master-data/district`;
  const res = await axios.post(
    url,
    { province_id: pid },
    {
      headers: tokenHeaders(),
      timeout: ghnConfig.requestTimeoutMs,
      validateStatus: () => true,
    }
  );
  const data = unwrapGhnResponse(res, 'Danh sách quận/huyện');
  const list = Array.isArray(data) ? data : [];
  return list.map((d) => ({
    districtId: Number(d.DistrictID ?? d.DistrictId),
    name: String(d.DistrictName ?? d.Name ?? ''),
    code: d.Code != null ? String(d.Code) : '',
  }));
}

/**
 * @returns {Promise<Array<{ wardCode: string, name: string }>>}
 */
async function fetchWards(districtId) {
  assertGhnConfigured();
  const did = Number(districtId);
  if (!Number.isFinite(did) || did <= 0) {
    const err = new Error('districtId không hợp lệ');
    err.statusCode = 400;
    throw err;
  }
  const url = `${ghnConfig.masterBase}/master-data/ward`;
  const res = await axios.post(
    url,
    { district_id: did },
    {
      headers: tokenHeaders(),
      timeout: ghnConfig.requestTimeoutMs,
      validateStatus: () => true,
    }
  );
  const data = unwrapGhnResponse(res, 'Danh sách phường/xã');
  const list = Array.isArray(data) ? data : [];
  return list
    .map((w) => ({
      wardCode: String(w.WardCode ?? w.ward_code ?? ''),
      name: String(w.WardName ?? w.Name ?? ''),
    }))
    .filter((w) => w.wardCode);
}

/**
 * @param {{
 *   to_district_id: number,
 *   to_ward_code: string,
 *   weightGrams: number,
 *   lengthCm: number,
 *   widthCm: number,
 *   heightCm: number,
 *   from_district_id?: number|null,
 *   from_ward_code?: string|null,
 * }} params
 * @returns {Promise<{ total: number, usedFallback: boolean }>}
 */
async function fetchShippingFee(params) {
  if (!ghnConfig.token || !ghnConfig.shopId) {
    return { total: ghnConfig.fallbackFeeVnd, usedFallback: true };
  }

  const toDistrict = Number(params.to_district_id);
  const toWard = String(params.to_ward_code || '').trim();
  if (!Number.isFinite(toDistrict) || toDistrict <= 0 || !toWard) {
    return { total: ghnConfig.fallbackFeeVnd, usedFallback: true };
  }

  const weight = Math.min(30000, Math.max(1, Math.round(Number(params.weightGrams) || 1)));
  const length = Math.min(150, Math.max(1, Math.round(Number(params.lengthCm) || 1)));
  const width = Math.min(150, Math.max(1, Math.round(Number(params.widthCm) || 1)));
  const height = Math.min(150, Math.max(1, Math.round(Number(params.heightCm) || 1)));

  const body = {
    shop_id: ghnConfig.shopId,
    service_type_id: 2,
    to_district_id: toDistrict,
    to_ward_code: toWard,
    weight,
    length,
    width,
    height,
    insurance_value: 0,
  };

  const fromD = params.from_district_id != null ? Number(params.from_district_id) : NaN;
  if (Number.isFinite(fromD) && fromD > 0) {
    body.from_district_id = fromD;
  }
  const fromW = params.from_ward_code != null ? String(params.from_ward_code).trim() : '';
  if (fromW) {
    body.from_ward_code = fromW;
  }

  const hasCompleteFrom =
    Number.isFinite(Number(body.from_district_id)) &&
    Number(body.from_district_id) > 0 &&
    body.from_ward_code &&
    String(body.from_ward_code).trim();
  if (
    !hasCompleteFrom &&
    ghnConfig.defaultFromDistrictId > 0 &&
    ghnConfig.defaultFromWardCode
  ) {
    body.from_district_id = ghnConfig.defaultFromDistrictId;
    body.from_ward_code = ghnConfig.defaultFromWardCode;
  }

  try {
    const url = `${ghnConfig.v2Base}/shipping-order/fee`;
    const res = await axios.post(url, body, {
      headers: shopHeaders(),
      timeout: ghnConfig.requestTimeoutMs,
      validateStatus: () => true,
    });
    const payload = res.data;
    if (!payload || Number(payload.code) !== 200 || !payload.data) {
      return { total: ghnConfig.fallbackFeeVnd, usedFallback: true };
    }
    const total = Number(payload.data.total);
    if (!Number.isFinite(total) || total < 0) {
      return { total: ghnConfig.fallbackFeeVnd, usedFallback: true };
    }
    return { total: Math.round(total), usedFallback: false };
  } catch (_error) {
    return { total: ghnConfig.fallbackFeeVnd, usedFallback: true };
  }
}

module.exports = {
  fetchProvinces,
  fetchDistricts,
  fetchWards,
  fetchShippingFee,
  tokenHeaders,
  shopHeaders,
};
