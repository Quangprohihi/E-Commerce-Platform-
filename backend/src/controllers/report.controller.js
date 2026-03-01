const reportService = require('../services/report.service');
const { sendSuccess } = require('../utils/response');

function normalizeQuery(q) {
  const v = q && String(q).trim();
  return v && v !== 'undefined' ? v : undefined;
}

async function getSummary(req, res, next) {
  try {
    const { type, fromDate, toDate, status } = req.query;
    const reportType = type || 'sales';
    const filters = { fromDate: normalizeQuery(fromDate), toDate: normalizeQuery(toDate), status: normalizeQuery(status) };
    const data = await reportService.getSummary(reportType, filters);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function getDetail(req, res, next) {
  try {
    const { type, fromDate, toDate, status, page, limit } = req.query;
    const reportType = type || 'sales';
    const filters = { fromDate: normalizeQuery(fromDate), toDate: normalizeQuery(toDate), status: normalizeQuery(status) };
    const pagination = { page, limit };
    const data = await reportService.getDetail(reportType, filters, pagination);
    return sendSuccess(res, 'Thành công', data);
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { type, fromDate, toDate, status } = req.query;
    const reportType = type || 'sales';
    const filters = { fromDate: normalizeQuery(fromDate), toDate: normalizeQuery(toDate), status: normalizeQuery(status) };
    const buffer = await reportService.exportExcel(reportType, filters);
    const filename = `report-${reportType}-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

async function exportPdf(req, res, next) {
  try {
    const { type, fromDate, toDate, status } = req.query;
    const reportType = type || 'sales';
    const filters = { fromDate: normalizeQuery(fromDate), toDate: normalizeQuery(toDate), status: normalizeQuery(status) };
    const buffer = await reportService.exportPdf(reportType, filters);
    const filename = `report-${reportType}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getDetail, exportExcel, exportPdf };
