const aiService = require('../services/ai.service');
const { sendSuccess, sendBadRequest } = require('../utils/response');

async function chat(req, res, next) {
  try {
    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return sendBadRequest(res, 'Vui lòng nhập câu hỏi');
    }
    const userId = req.user ? req.user.id : null;
    const data = await aiService.chat(question.trim(), userId);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function compare(req, res, next) {
  try {
    const { productIds } = req.body || {};
    if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 3) {
      return sendBadRequest(res, 'Cần gửi 2 hoặc 3 productId');
    }
    const data = await aiService.compare(productIds);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    if (err.statusCode === 400) {
      return sendBadRequest(res, err.message);
    }
    next(err);
  }
}

module.exports = { chat, compare };
