const { sendSuccess } = require('../utils/response');
const { validateSellerWarehouseAddress } = require('../utils/validators');
const sellerService = require('../services/seller.service');

async function updateWarehouseAddress(req, res, next) {
  try {
    const v = validateSellerWarehouseAddress(req.body);
    if (!v.ok) {
      return res.status(400).json({ status: 400, message: v.message });
    }
    const sellerProfile = await sellerService.updateWarehouseAddress(req.user.id, v.data);
    return sendSuccess(res, 'Cap nhat dia chi kho thanh cong', { sellerProfile });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateWarehouseAddress,
};
