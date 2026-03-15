const orderService = require('../services/order.service');
const { sendSuccess, sendCreated } = require('../utils/response');

async function create(req, res, next) {
  try {
    const data = await orderService.create(req.user.id, req.body);
    return sendCreated(res, 'Tạo đơn hàng thành công', data);
  } catch (err) {
    next(err);
  }
}

async function myOrders(req, res, next) {
  try {
    const data = await orderService.getMyOrders(req.user.id, req.query);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function manageOrders(req, res, next) {
  try {
    const data = await orderService.getManageOrders(req.user.id, req.user.role, req.query);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const isStaffOrAdminOrSeller = ['STAFF', 'ADMIN', 'SELLER'].includes(req.user.role);
    const data = await orderService.getById(req.params.id, req.user.id, isStaffOrAdminOrSeller);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await orderService.updateStatus(
      req.params.id,
      req.body.status,
      req.user.id,
      req.user.role
    );
    return sendSuccess(res, 'Cập nhật trạng thái thành công', data);
  } catch (err) {
    next(err);
  }
}

async function createVnpayUrl(req, res, next) {
  try {
    const data = await orderService.createVnpayPaymentUrl(req.params.id, req.user.id, req);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function createVnpayUrlForGroup(req, res, next) {
  try {
    const { orderGroupId } = req.body;
    if (!orderGroupId || typeof orderGroupId !== 'string') {
      return res.status(400).json({ status: 400, message: 'Thiếu orderGroupId' });
    }
    const data = await orderService.createVnpayPaymentUrlForGroup(orderGroupId.trim(), req.user.id, req);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function simulateNext(req, res, next) {
  try {
    const data = await orderService.simulateNextStatus(req.params.id, req.user.id);
    return sendSuccess(res, 'Chuyển trạng thái thành công', data);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, myOrders, manageOrders, getById, updateStatus, createVnpayUrl, createVnpayUrlForGroup, simulateNext };
