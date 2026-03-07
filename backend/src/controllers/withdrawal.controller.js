const withdrawalService = require('../services/withdrawal.service');
const { sendSuccess, sendCreated } = require('../utils/response');

async function getBalance(req, res, next) {
  try {
    const data = await withdrawalService.getBalance(req.user.id);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function getMyRequests(req, res, next) {
  try {
    const data = await withdrawalService.getMyRequests(req.user.id, req.query);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function createRequest(req, res, next) {
  try {
    const data = await withdrawalService.createRequest(req.user.id, req.body);
    return sendCreated(res, 'Gửi yêu cầu rút tiền thành công', data);
  } catch (err) {
    next(err);
  }
}

async function listForAdmin(req, res, next) {
  try {
    const data = await withdrawalService.listForAdmin(req.query);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await withdrawalService.updateStatus(
      req.params.id,
      req.body.status,
      req.body.adminNote,
      req.user.role
    );
    return sendSuccess(res, 'Cập nhật trạng thái thành công', data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBalance,
  getMyRequests,
  createRequest,
  listForAdmin,
  updateStatus,
};
