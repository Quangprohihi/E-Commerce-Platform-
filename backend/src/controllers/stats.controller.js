const statsService = require('../services/stats.service');
const { sendSuccess } = require('../utils/response');

async function getHomeStats(req, res, next) {
  try {
    const data = await statsService.getHomeStats();
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getHomeStats };
