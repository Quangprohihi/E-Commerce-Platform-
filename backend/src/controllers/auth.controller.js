const authService = require('../services/auth.service');
const { validateRegister, validateLogin, validateProfileUpdate } = require('../utils/validators');
const { sendCreated, sendSuccess } = require('../utils/response');

async function register(req, res, next) {
  try {
    const v = validateRegister(req.body);
    if (!v.ok) return res.status(400).json({ status: 400, message: v.message });
    const result = await authService.register(v.data);
    return sendCreated(res, 'Đăng ký thành công', result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const v = validateLogin(req.body);
    if (!v.ok) return res.status(400).json({ status: 400, message: v.message });
    const result = await authService.login(v.data.email, v.data.password);
    return sendSuccess(res, 'Đăng nhập thành công', result);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const data = await authService.getMe(req.user.id);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function uploadKYC(req, res, next) {
  try {
    const filePath = req.file ? req.file.path : null;
    const data = await authService.submitKYC(req.user.id, filePath, req.body);
    return sendSuccess(res, 'Gửi KYC thành công. Trạng thái: PENDING', data);
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const v = validateProfileUpdate(req.body);
    if (!v.ok) return res.status(400).json({ status: 400, message: v.message });
    const data = await authService.updateProfile(req.user.id, v.data);
    return sendSuccess(res, 'Cập nhật thông tin cá nhân thành công', data);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe, uploadKYC, updateMe };
