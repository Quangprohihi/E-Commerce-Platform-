const ghnClient = require('../services/shipping/ghnClient.service');
const { sendSuccess } = require('../utils/response');

async function provinces(_req, res, next) {
  try {
    const provinces = await ghnClient.fetchProvinces();
    return sendSuccess(res, 'Thành công', { provinces });
  } catch (err) {
    next(err);
  }
}

async function districts(req, res, next) {
  try {
    const raw = req.query.provinceId ?? req.query.province_id;
    const provinceId = raw != null ? String(raw).trim() : '';
    if (!provinceId) {
      return res.status(400).json({ status: 400, message: 'Thiếu provinceId' });
    }
    const districts = await ghnClient.fetchDistricts(provinceId);
    return sendSuccess(res, 'Thành công', { districts });
  } catch (err) {
    next(err);
  }
}

async function wards(req, res, next) {
  try {
    const raw = req.query.districtId ?? req.query.district_id;
    const districtId = raw != null ? String(raw).trim() : '';
    if (!districtId) {
      return res.status(400).json({ status: 400, message: 'Thiếu districtId' });
    }
    const wards = await ghnClient.fetchWards(districtId);
    return sendSuccess(res, 'Thành công', { wards });
  } catch (err) {
    next(err);
  }
}

module.exports = { provinces, districts, wards };
