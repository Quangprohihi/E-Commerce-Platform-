const categoryService = require('../services/category.service');

async function list(req, res, next) {
  try {
    const categories = await categoryService.list();
    return res.json({
      data: { items: categories },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
