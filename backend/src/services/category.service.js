const prisma = require('../config/prisma');

/**
 * List all categories (id, name, slug) for dropdowns and filters.
 */
async function list() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });
  return categories;
}

module.exports = { list };
