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

async function getDashboard(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await statsService.getAdminStats({ startDate: from || null, endDate: to || null });
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getHomeStats, getDashboard };
