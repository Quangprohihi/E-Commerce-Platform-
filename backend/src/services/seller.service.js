const prisma = require('../config/prisma');
const ghnClient = require('./shipping/ghnClient.service');

async function resolveProvinceName(provinceId) {
  try {
    const provinces = await ghnClient.fetchProvinces();
    const pid = Number(provinceId);
    const hit = provinces.find((p) => p.provinceId === pid);
    const name = hit?.name != null ? String(hit.name).trim() : '';
    return name || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} userId
 * @param {{ provinceId: number, districtId: number, wardCode: string }} data
 */
async function updateWarehouseAddress(userId, data) {
  const existing = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (!existing) {
    const err = new Error('Chua co ho so seller. Vui long hoan thanh dang ky/KYC truoc.');
    err.statusCode = 404;
    throw err;
  }
  const sellerProvinceName = await resolveProvinceName(data.provinceId);
  return prisma.sellerProfile.update({
    where: { userId },
    data: {
      sellerProvinceId: data.provinceId,
      sellerDistrictId: data.districtId,
      sellerWardCode: data.wardCode,
      sellerProvinceName,
    },
  });
}

module.exports = {
  updateWarehouseAddress,
};
