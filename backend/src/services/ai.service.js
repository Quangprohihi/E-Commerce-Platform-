const prisma = require('../config/prisma');

/** Effective selling price (VND) for budget checks. */
function effectivePriceVnd(p) {
  return Number(p.salePrice != null ? p.salePrice : p.price);
}

/**
 * Parse a maximum budget in VND from Vietnamese / casual text (e.g. "dưới 1tr", "tối đa 2 triệu").
 * @returns {number|null}
 */
function parseMaxBudgetVnd(question) {
  if (!question || typeof question !== 'string') return null;
  const s = question.toLowerCase();
  const parseNum = (str) => {
    const t = String(str).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };

  let m = s.match(
    /(?:dưới|duoi|dươi|under|below|tối đa|toi da|tối-da|toi-da|max|không quá|khong qua|k quá|k qua)\s*[:\s]*(\d+(?:[.,]\d+)?)\s*(tr(?:iệu|iệu|ieu)?|k|nghìn|ngàn|triệu|trieu)?/i,
  );
  if (m) {
    const n = parseNum(m[1]);
    if (n == null) return null;
    const u = (m[2] || '').toLowerCase();
    if (u.startsWith('tr') || u === 'triệu' || u === 'trieu') return Math.round(n * 1_000_000);
    if (u === 'k' || u.startsWith('ngh') || u.startsWith('ng')) return Math.round(n * 1_000);
    if (n >= 1_000_000) return Math.round(n);
    if (n > 0 && n <= 500) return Math.round(n * 1_000_000);
    return Math.round(n);
  }

  m = s.match(/(\d+(?:[.,]\d+)?)\s*(tr)(?![a-zà-ỹ])/i);
  if (m) {
    const n = parseNum(m[1]);
    if (n != null) return Math.round(n * 1_000_000);
  }

  m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu)\b/i);
  if (m) {
    const n = parseNum(m[1]);
    if (n != null) return Math.round(n * 1_000_000);
  }

  m = s.match(/(\d+(?:[.,]\d+)?)\s*k(?![a-zà-ỹ])/i);
  if (m) {
    const n = parseNum(m[1]);
    if (n != null) return Math.round(n * 1_000);
  }

  return null;
}

/** Prisma where: effective price (sale if set, else list) <= maxVnd */
function prismaWhereEffectivePriceLte(maxVnd) {
  if (maxVnd == null || maxVnd <= 0) return null;
  return {
    OR: [
      { AND: [{ salePrice: { not: null } }, { salePrice: { lte: maxVnd } }] },
      { AND: [{ salePrice: null }, { price: { lte: maxVnd } }] },
    ],
  };
}

const FRAME_SHAPE_KEYWORDS = {
  ROUND: ['tròn', 'tron', 'round', 'tròn trĩnh'],
  OVAL: ['oval', 'bầu dục', 'bau duc'],
  SQUARE: ['vuông', 'vuong', 'square', 'góc vuông', 'goc vuong'],
  RECTANGLE: ['chữ nhật', 'chu nhat', 'rectangle', 'hình chữ nhật', 'hinh chu nhat'],
  CAT_EYE: ['mèo', 'meo', 'cat eye', 'cateye'],
  AVIATOR: ['aviator', 'phi công', 'phi cong', 'pilot'],
};

function mockAnalyzeQuestion(question) {
  const q = (question || '').toLowerCase();
  const shapes = [];
  for (const [shape, keywords] of Object.entries(FRAME_SHAPE_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) shapes.push(shape);
  }
  if (shapes.length === 0) {
    shapes.push('ROUND', 'OVAL', 'SQUARE', 'RECTANGLE', 'CAT_EYE', 'AVIATOR');
  }
  return shapes;
}

function mockAnswer(question, shapes) {
  const shapeNames = {
    ROUND: 'tròn',
    OVAL: 'oval',
    SQUARE: 'vuông',
    RECTANGLE: 'chữ nhật',
    CAT_EYE: 'mắt mèo',
    AVIATOR: 'aviator',
  };
  const names = [...new Set(shapes)].map((s) => shapeNames[s] || s).join(', ');
  return `Dựa trên câu hỏi của bạn, chúng tôi gợi ý các kiểu gọng: ${names}. Dưới đây là một số sản phẩm phù hợp từ Kính Tốt.`;
}

/** Build product list for AI prompt (compact, no images). Limit 30 to save tokens when quota is tight. */
async function loadProductsForPrompt(options = {}) {
  const maxBudgetVnd = options.maxBudgetVnd;
  const budgetWhere = prismaWhereEffectivePriceLte(maxBudgetVnd);
  const baseWhere = { isActive: true };
  const where = budgetWhere ? { AND: [baseWhere, budgetWhere] } : baseWhere;

  let products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      price: true,
      salePrice: true,
      condition: true,
      frameShape: true,
      frameMaterial: true,
      stock: true,
      category: { select: { id: true, name: true } },
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
  });

  if (budgetWhere && products.length < 6) {
    const more = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        condition: true,
        frameShape: true,
        frameMaterial: true,
        stock: true,
        category: { select: { id: true, name: true } },
      },
      take: 80,
      orderBy: { createdAt: 'desc' },
    });
    products = more.slice(0, 30);
  }
  if (budgetWhere && products.length < 6) {
    products = await prisma.product.findMany({
      where: baseWhere,
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        condition: true,
        frameShape: true,
        frameMaterial: true,
        stock: true,
        category: { select: { id: true, name: true } },
      },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });
  }
  return products;
}

/** Format products as text for Gemini prompt. */
function formatProductsForPrompt(products) {
  const condVi = (c) =>
    c === 'USED' ? 'đã qua sử dụng' : c === 'LIKE_NEW' ? 'like new' : 'mới';
  return products
    .map((p) => {
      const price = Number(p.price);
      const sale = p.salePrice != null ? Number(p.salePrice) : null;
      const priceStr = sale != null ? `${sale} (giá niêm yết ${price})` : String(price);
      return `- id: "${p.id}", tên: "${p.name}", giá: ${priceStr}, tình trạng: ${condVi(p.condition)}, hình gọng: ${p.frameShape || 'N/A'}, chất liệu: ${p.frameMaterial || 'N/A'}, danh mục: ${p.category?.name || 'N/A'}, tồn kho: ${p.stock}`;
    })
    .join('\n');
}

/** Try 2.5 first (free tier often has quota); then 2.0. */
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const GEMINI_429_RETRY_MS = 8000;

/** Call Gemini and parse JSON response. Returns { answer, productIds } or null on failure. */
async function callGemini(question, productListText, maxBudgetVnd = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.warn('GEMINI_API_KEY is not set; using mock AI.');
    return null;
  }

  const budgetBlock =
    maxBudgetVnd != null && maxBudgetVnd > 0
      ? `\nRÀNG BUỘC NGÂN SÁCH: Khách yêu cầu mức giá tối đa ${maxBudgetVnd.toLocaleString('vi-VN')} VND. CHỈ được chọn sản phẩm có giá thanh toán (số đầu tiên trong mục giá — giá sale nếu có, không thì giá niêm yết) KHÔNG VƯỢT quá số này. Giá niêm yết trong ngoặc có thể cao hơn ngân sách nếu đang giảm giá — điều đó là bình thường; trong phần answer KHÔNG được nói "giá gốc/giá niêm yết nằm trong ngân sách" nếu giá niêm yết thực tế vượt ngân sách. Chỉ nói giá thanh toán / giá sau giảm nằm trong ngân sách.`
      : '';

  const systemPrompt = `Bạn là AI Stylist của cửa hàng kính mắt "Kính Tốt". Nhiệm vụ: dựa vào nhu cầu khách (kiểu mặt, phong cách, giá tiền, màu da, v.v.) gợi ý sản phẩm từ DANH SÁCH SẢN PHẨM bên dưới.
Trả lời ĐÚNG theo JSON sau (không thêm ký tự nào ngoài JSON):
{"answer": "Câu trả lời thân thiện bằng tiếng Việt, giải thích ngắn gọn vì sao gợi ý những sản phẩm đó.", "productIds": ["id1", "id2", ...]}
- answer: 1-3 câu, tiếng Việt.
- productIds: mảng tối đa 6 id từ danh sách (chỉ dùng id có trong danh sách). Nếu không có sản phẩm phù hợp thì trả productIds rỗng.${budgetBlock}`;

  const userContent = `Nhu cầu khách: "${question}"

DANH SÁCH SẢN PHẨM (chỉ gợi ý từ danh sách này):
${productListText}

Trả lời bằng JSON duy nhất (không markdown, không \`\`\`):`;

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const payload = { contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userContent }] }] };

  const tryOnce = async (modelId) => {
    const model = genAI.getGenerativeModel({ model: modelId });
    const result = await model.generateContent(payload);
    const response = result.response;
    if (!response || !response.text) return null;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(jsonStr);
    const answer = typeof parsed.answer === 'string' ? parsed.answer : '';
    const productIds = Array.isArray(parsed.productIds) ? parsed.productIds.filter((id) => typeof id === 'string') : [];
    return { answer, productIds };
  };

  for (const modelId of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const out = await tryOnce(modelId);
        if (out) return out;
      } catch (err) {
        const is429 = /429|Too Many Requests|quota/i.test(err.message || '');
        console.warn(`Gemini API error (${modelId}):`, err.message);
        if (is429 && attempt === 1) {
          console.warn(`Rate limited; retrying in ${GEMINI_429_RETRY_MS / 1000}s...`);
          await new Promise((r) => setTimeout(r, GEMINI_429_RETRY_MS));
        } else {
          break;
        }
      }
    }
  }
  return null;
}

/** Fetch products by IDs with category, only in-stock. Replace out-of-stock with same-category alternatives. */
async function resolveSuggestedProducts(productIds, options = {}) {
  if (!productIds.length) return { products: [], orderSummary: { items: [], total: 0 } };

  const maxBudgetVnd = options.maxBudgetVnd;
  const withinBudget = (p) =>
    maxBudgetVnd == null || maxBudgetVnd <= 0 || effectivePriceVnd(p) <= maxBudgetVnd;

  const byId = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  const idToProduct = new Map(byId.map((p) => [p.id, p]));

  const inStock = [];
  const outOfStockCategoryIds = new Set();

  for (const id of productIds) {
    const p = idToProduct.get(id);
    if (!p) continue;
    if (!withinBudget(p)) continue;
    if (p.stock > 0) {
      inStock.push(p);
    } else {
      if (p.categoryId) outOfStockCategoryIds.add(p.categoryId);
    }
  }

  let replacements = [];
  if (outOfStockCategoryIds.size > 0) {
    const existingIds = inStock.map((x) => x.id);
    const budgetWhere = prismaWhereEffectivePriceLte(maxBudgetVnd);
    replacements = await prisma.product.findMany({
      where: {
        categoryId: { in: [...outOfStockCategoryIds] },
        id: { notIn: existingIds },
        stock: { gt: 0 },
        isActive: true,
        ...(budgetWhere ? { AND: [budgetWhere] } : {}),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
      take: 24,
      orderBy: { createdAt: 'desc' },
    });
    replacements = replacements.filter(withinBudget);
  }

  let suggested = [...inStock];
  const usedIds = new Set(inStock.map((p) => p.id));
  for (const p of replacements) {
    if (usedIds.has(p.id)) continue;
    if (!withinBudget(p)) continue;
    suggested.push(p);
    usedIds.add(p.id);
    if (suggested.length >= 6) break;
  }
  suggested = suggested.filter(withinBudget).slice(0, 6);

  const normalized = suggested.slice(0, 6).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    condition: p.condition,
    images: p.images,
    frameShape: p.frameShape,
    frameMaterial: p.frameMaterial,
    category: p.category,
  }));

  const items = normalized.map((p) => ({
    productId: p.id,
    name: p.name,
    price: p.salePrice ?? p.price,
    quantity: 1,
  }));
  const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const orderSummary = { items, total };

  return { products: normalized, orderSummary };
}

async function chat(question, userId = null) {
  const maxBudgetVnd = parseMaxBudgetVnd(question);
  const productsForPrompt = await loadProductsForPrompt({ maxBudgetVnd });
  const productListText = formatProductsForPrompt(productsForPrompt);

  let answer;
  let productIds = [];

  const geminiResult = await callGemini(question, productListText, maxBudgetVnd);
  if (geminiResult) {
    answer = geminiResult.answer || 'Dưới đây là gợi ý sản phẩm phù hợp từ Kính Tốt.';
    productIds = geminiResult.productIds || [];
  } else {
    const frameShapes = mockAnalyzeQuestion(question);
    answer = mockAnswer(question, frameShapes);
    const budgetWhere = prismaWhereEffectivePriceLte(maxBudgetVnd);
    const mockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        frameShape: frameShapes.length ? { in: frameShapes } : undefined,
        ...(budgetWhere ? { AND: [budgetWhere] } : {}),
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });
    productIds = mockProducts.map((p) => p.id);
  }

  const { products: suggestedProducts, orderSummary } = await resolveSuggestedProducts(productIds, {
    maxBudgetVnd,
  });

  if (userId) {
    let session = await prisma.chatSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId, title: 'AI Stylist' },
      });
    }
    await prisma.chatMessage.createMany({
      data: [
        { sessionId: session.id, role: 'USER', content: question },
        {
          sessionId: session.id,
          role: 'AI',
          content: answer,
          productSuggestions: suggestedProducts,
        },
      ],
    });
  }

  return {
    answer,
    suggestedProducts,
    orderSummary,
    meta: { maxBudgetVnd: maxBudgetVnd ?? null },
  };
}

const COMPARE_SHAPE_VI = {
  ROUND: 'Tròn',
  OVAL: 'Oval',
  SQUARE: 'Vuông',
  RECTANGLE: 'Chữ nhật',
  CAT_EYE: 'Mắt mèo',
  AVIATOR: 'Aviator / phi công',
};
const COMPARE_MATERIAL_VI = {
  METAL: 'Kim loại',
  ACETATE: 'Acetate',
  TITANIUM: 'Titanium',
  PLASTIC: 'Nhựa',
  WOOD: 'Gỗ',
};
const COMPARE_LENS_VI = {
  SINGLE_VISION: 'Đơn tròng (cận/viễn)',
  BIFOCAL: 'Hai tròng',
  PROGRESSIVE: 'Đa tròng (progressive)',
  SUNGLASSES: 'Kính râm',
  BLUE_LIGHT: 'Chống ánh sáng xanh',
};
const COMPARE_CONDITION_VI = {
  NEW: 'Mới 100%',
  LIKE_NEW: 'Like new (gần như mới)',
  USED: 'Đã qua sử dụng',
};

/** Gợi ý model: tên marketing có thể lệch với dữ liệu kỹ thuật. */
function compareTechnicalNote(p) {
  const name = (p.name || '').toLowerCase();
  const shape = p.frameShape;
  if (!shape) return '';
  const hints = {
    AVIATOR: ['aviator', 'phi công', 'phi cong'],
    CAT_EYE: ['mắt mèo', 'mat meo', 'cat eye'],
    ROUND: ['tròn', 'tron', 'round'],
  };
  for (const [enumShape, kws] of Object.entries(hints)) {
    if (shape === enumShape) continue;
    if (kws.some((k) => name.includes(k)) && shape) {
      return ` (Lưu ý nội bộ: tên gợi ý kiểu ${enumShape} nhưng theo hồ sơ sản phẩm, hình gọng là ${COMPARE_SHAPE_VI[shape] || shape} — khi tư vấn khách, ưu tiên mô tả theo hồ sơ và giải thích nhẹ nhàng)`;
    }
  }
  return '';
}

/** Gỡ emoji/icon và dòng liên quan tồn kho khỏi văn bản hiển thị cho khách. */
function sanitizeCompareCopy(text) {
  if (text == null || typeof text !== 'string') return text;
  let t = text
    .replace(/✅\s*/g, '')
    .replace(/⚠️\s*/g, '')
    .replace(/\u2705\s*/g, '')
    .replace(/\u26a0\ufe0f\s*/g, '')
    .replace(/\u26a0\s*/g, '');
  t = t.replace(/(^|\n)[ \t]*[^\n]*(?:tồn kho|Tồn kho|ton kho)[^\n]*/gi, '$1');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/** Format product list for compare — đủ ngữ cảnh để tư vấn sâu, bám DB. */
function formatProductsForCompare(products) {
  return products
    .map((p) => {
      const desc = (p.description || '').replace(/\s+/g, ' ').trim().slice(0, 480);
      const listPrice = Number(p.price);
      const sale = p.salePrice != null ? Number(p.salePrice) : null;
      const pay = effectivePriceVnd(p);
      const priceStr =
        sale != null
          ? `giá thanh toán ${pay} VND (niêm yết ${listPrice} VND)`
          : `giá thanh toán ${pay} VND`;
      const shapeVi = p.frameShape ? COMPARE_SHAPE_VI[p.frameShape] || p.frameShape : '—';
      const matVi = p.frameMaterial ? COMPARE_MATERIAL_VI[p.frameMaterial] || p.frameMaterial : '—';
      const lensVi = p.lensType ? COMPARE_LENS_VI[p.lensType] || p.lensType : '—';
      const condVi = p.condition ? COMPARE_CONDITION_VI[p.condition] || p.condition : '—';
      const shop = p.seller?.sellerProfile?.shopName || '';
      const techNote = compareTechnicalNote(p);
      return (
        `- productId: "${p.id}"\n` +
        `  tên hiển thị: "${p.name}"${techNote}\n` +
        `  mô tả (trích): "${desc || '—'}"\n` +
        `  ${priceStr}\n` +
        `  Hình dáng gọng (hồ sơ): ${shapeVi} | Chất liệu gọng (hồ sơ): ${matVi} | Tròng / loại kính (hồ sơ): ${lensVi}\n` +
        `  TÌNH TRẠNG: ${condVi} | Danh mục: ${p.category?.name || 'N/A'}${shop ? ` | Cửa hàng: ${shop}` : ''}`
      );
    })
    .join('\n\n');
}

/** Call Gemini for compare; returns { summary, prosCons } or null. */
async function callGeminiCompare(promptText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const payload = { contents: [{ role: 'user', parts: [{ text: promptText }] }] };

  const tryOnce = async (modelId) => {
    const model = genAI.getGenerativeModel({ model: modelId });
    const result = await model.generateContent(payload);
    const response = result.response;
    if (!response || !response.text) return null;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonStr);
  };

  for (const modelId of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const out = await tryOnce(modelId);
        if (out && typeof out.summary === 'string' && Array.isArray(out.prosCons)) return out;
      } catch (err) {
        const is429 = /429|Too Many Requests|quota/i.test(err.message || '');
        console.warn(`Gemini API error (${modelId}) compare:`, err.message);
        if (is429 && attempt === 1) {
          await new Promise((r) => setTimeout(r, GEMINI_429_RETRY_MS));
        } else break;
      }
    }
  }
  return null;
}

/** Cụm bắt buộc khi thiếu thông số (đồng bộ prompt Gemini + mock). */
function compareMissingHint(fields) {
  if (!fields.length) return '';
  const label = fields.join(' và ');
  return `Hiện tại, các thông số chi tiết về ${label} của mẫu này đang được đội ngũ Kính Tốt cập nhật để đảm bảo độ chính xác nhất. Để giúp bạn hoàn toàn an tâm khi lựa chọn, bạn có thể nhắn tin trực tiếp để Kính Tốt hỗ trợ kiểm tra thực tế mẫu này cho bạn ngay lập tức!`;
}

const COMPARE_CTA =
  'Chúng tôi khuyến khích bạn mở chat với Kính Tốt nếu muốn xem ảnh thật hoặc được tư vấn sâu hơn — đội ngũ sẵn sàng hỗ trợ bạn!';

/** Mock prosCons for compare when Gemini unavailable. */
function mockCompareResult(products) {
  const prices = products.map((p) => ({ id: p.id, pay: effectivePriceVnd(p), name: p.name }));
  const minP = prices.reduce((a, b) => (a.pay <= b.pay ? a : b));
  const maxP = prices.reduce((a, b) => (a.pay >= b.pay ? a : b));
  let summary = `**Tổng quan:** Chúng tôi thấy các **tên mẫu kính** trong bộ so sánh khác nhau rõ về **Giá tiền** và thường cả **Tình trạng** — đây là hai điểm dễ giúp bạn định hướng nhanh nhất.\n\n`;
  if (products.length === 2 && minP.id !== maxP.id) {
    summary += `**Khác biệt lớn nhất:** Mức **Giá tiền** chênh lệch rõ (**${minP.pay.toLocaleString('vi-VN')} đ** so với **${maxP.pay.toLocaleString('vi-VN')} đ**).\n\n`;
  }
  summary += `${COMPARE_CTA}`;

  const prosCons = products.map((p) => {
    const shape = p.frameShape ? COMPARE_SHAPE_VI[p.frameShape] || p.frameShape : null;
    const mat = p.frameMaterial ? COMPARE_MATERIAL_VI[p.frameMaterial] || p.frameMaterial : null;
    const lens = p.lensType ? COMPARE_LENS_VI[p.lensType] || p.lensType : null;
    const cond = p.condition ? COMPARE_CONDITION_VI[p.condition] || p.condition : null;
    const missing = [];
    if (!shape) missing.push('hình dáng gọng');
    if (!mat) missing.push('chất liệu gọng');
    if (!lens) missing.push('tròng kính');
    const pay = effectivePriceVnd(p);
    const rel =
      products.length >= 2
        ? pay === minP.pay && minP.id !== maxP.id
          ? ' Trong bộ này, đây là mức **Giá tiền** thấp nhất.'
          : pay === maxP.pay && minP.id !== maxP.id
            ? ' Trong bộ này, đây là mức **Giá tiền** cao nhất.'
            : ''
        : '';
    const nm = (p.name || '').slice(0, 90);
    let pros = `**Tên mẫu kính:** **${nm}**\n**Giá tiền:** **${pay.toLocaleString('vi-VN')} đ** (giá thanh toán)`;
    if (cond) pros += `\n**Tình trạng:** **${cond}**`;
    if (shape) pros += `\n**Hình dáng gọng (theo hồ sơ):** ${shape}`;
    if (mat) pros += `\n**Chất liệu:** ${mat}`;
    if (lens) pros += `\n**Tròng / loại kính:** ${lens}`;
    pros += rel;
    let cons = missing.length
      ? compareMissingHint(missing)
      : `**Lưu ý:** **Thương hiệu** và chi tiết trải nghiệm cần xác nhận thêm qua ảnh thật.`;
    cons += `\n${COMPARE_CTA}`;
    const bestFor = cond?.includes('Mới')
      ? `**Phù hợp với** bạn đang ưu tiên **Tình trạng** mới, muốn an tâm về độ mới và bảo hành.\n${COMPARE_CTA}`
      : cond?.includes('Like') || cond?.includes('dùng')
        ? `**Phù hợp với** bạn chấp nhận **Tình trạng** like new / đã dùng để có **Giá tiền** hời hơn trong cùng phân khúc tên hàng.\n${COMPARE_CTA}`
        : `**Phù hợp với** bạn muốn cân nhắc **Giá tiền** giữa các **tên mẫu kính** trong bộ so sánh.\n${COMPARE_CTA}`;
    return { productId: p.id, pros, cons, bestFor };
  });
  return { summary, prosCons };
}

async function compare(productIds) {
  const ids = Array.isArray(productIds) ? productIds.filter((id) => typeof id === 'string') : [];
  if (ids.length < 2 || ids.length > 3) {
    const err = new Error('Cần 2 hoặc 3 productId để so sánh');
    err.statusCode = 400;
    throw err;
  }

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: {
      category: { select: { name: true, slug: true } },
      seller: { select: { sellerProfile: { select: { shopName: true } } } },
    },
  });

  if (products.length !== ids.length) {
    const err = new Error('Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng bán');
    err.statusCode = 400;
    throw err;
  }

  const idRank = new Map(ids.map((id, idx) => [id, idx]));
  products.sort((a, b) => (idRank.get(a.id) ?? 0) - (idRank.get(b.id) ?? 0));

  const productListText = formatProductsForCompare(products);
  const systemPrompt = `Bạn là Chuyên gia tư vấn cao cấp tại "Kính Tốt". Nhiệm vụ: so sánh các mẫu kính dựa trên DUY NHẤT nội dung trong "DANH SÁCH SẢN PHẨM". Không bịa thông số không có trong danh sách (không đoán % UV, trọng lượng, coating…).

1) GIỌNG VĂN:
- Chuyên nghiệp, khách quan, thân thiện và nhiệt tình.
- Xưng hô với khách: dùng "Kính Tốt" hoặc "Chúng tôi" (không xưng "tôi" một mình nếu có thể thay bằng "Chúng tôi").

2) QUY TẮC KHI THÔNG SỐ TRỐNG (BẮT BUỘC — áp dụng cho văn bản gửi khách):
- TUYỆT ĐỐI KHÔNG dùng các từ/cụm: "cơ sở dữ liệu", "thiếu dữ liệu", "database", "null", "không có thông tin", "lỗi hệ thống".
- Trong bảng sản phẩm, dấu "—" nghĩa là thông số đó chưa được ghi đầy đủ trong hồ sơ — KHÔNG nhắc "—" hay giải thích kỹ thuật cho khách.
- Nếu thiếu một trong: Hình dáng gọng, Chất liệu gọng, Tròng kính — hãy viết đúng tinh thần: "Hiện tại, các thông số chi tiết về [Tên thông số] của mẫu này đang được đội ngũ Kính Tốt cập nhật để đảm bảo độ chính xác nhất."
- Thêm câu an tâm: "Để giúp bạn hoàn toàn an tâm khi lựa chọn, bạn có thể nhắn tin trực tiếp để Kính Tốt hỗ trợ kiểm tra thực tế mẫu này cho bạn ngay lập tức!"
- Ưu tiên so sánh mạnh các điểm có trong danh sách: gợi ý **Thương hiệu** từ tên, **Giá tiền** (thanh toán / niêm yết), **Tình trạng** (Mới 100% / Like new / Đã dùng), danh mục, mô tả trích.
- TUYỆT ĐỐI KHÔNG nhắc **tồn kho**, số lượng còn hàng, hay bất kỳ con số tồn nào — thông tin đó không dành cho khách trong màn so sánh.
- Nếu tên sản phẩm và "hồ sơ" hình gọng không khớp, ưu tiên mô tả theo hồ sơ và giải thích nhẹ nhàng cho khách.

3) ĐỊNH DẠNG VĂN BẢN (UX) — các chuỗi trong JSON có thể chứa markdown nhẹ:
- Bôi đậm bằng **như vậy** cho: **Thương hiệu** (suy ra từ tên), **Giá tiền** (kèm số), **Tình trạng**, **Tên mẫu kính** (rút gọn nếu quá dài).
- KHÔNG dùng emoji hay icon (cấm ✅, ⚠️, tick, chấm than hình tam giác).
- Chia rõ 3 lớp nội dung:
  + summary: Phần **Đoạn tổng quát** — văn trôi chảy, nêu **sự khác biệt lớn nhất**; có thể 2–4 đoạn ngắn cách nhau bằng \\n\\n; kết thúc bằng **lời kêu gọi hành động (CTA)** khuyến khích chat với Kính Tốt để xem ảnh thật / tư vấn sâu.
  + pros: **Chi tiết ưu điểm** — ngắn gọn súc tích; có thể mỗi ý một dòng (xuống dòng \\n), không icon.
  + cons: **Chi tiết nhược điểm / lưu ý** — ngắn gọn; có thể lồng cụm cập nhật thông số + CTA nhắn tin như trên; không icon.
  + bestFor: Bắt đầu bằng **Phù hợp với** rồi chỉ rõ đối tượng; kết có thể nhắc lại CTA ngắn.

4) MỤC TIÊU CUỐI:
- Luôn có ít nhất một CTA thân thiện khuyến khích khách liên hệ / chat Kính Tốt khi cần ảnh thật hoặc tư vấn sâu.

Trả lời ĐÚNG một JSON hợp lệ (không markdown bọc ngoài, không \`\`\`):
{"summary": "...", "prosCons": [{"productId": "id1", "pros": "...", "cons": "...", "bestFor": "..."}, ...]}
- prosCons: đúng một phần tử cho mỗi productId; productId khớp chính xác. Chuỗi được phép chứa ** để in đậm; không dùng emoji.`;

  const userContent = `DANH SÁCH SẢN PHẨM CẦN SO SÁNH:\n${productListText}\n\nTrả lời bằng JSON duy nhất (không \`\`\`):`;

  let summary;
  let prosCons;

  const geminiResult = await callGeminiCompare(systemPrompt + '\n\n' + userContent);
  if (geminiResult) {
    summary = sanitizeCompareCopy(geminiResult.summary || '');
    prosCons = Array.isArray(geminiResult.prosCons) ? geminiResult.prosCons : [];
    const idSet = new Set(products.map((p) => p.id));
    prosCons = prosCons.filter((x) => idSet.has(x.productId));
    while (prosCons.length < products.length) {
      const missing = products.find((p) => !prosCons.some((c) => c.productId === p.id));
      if (!missing) break;
      const mock = mockCompareResult([missing]).prosCons[0];
      prosCons.push(mock);
    }
    prosCons = prosCons.map((pc) => ({
      ...pc,
      pros: sanitizeCompareCopy(pc.pros),
      cons: sanitizeCompareCopy(pc.cons),
      bestFor: sanitizeCompareCopy(pc.bestFor),
    }));
  } else {
    const mock = mockCompareResult(products);
    summary = sanitizeCompareCopy(mock.summary);
    prosCons = mock.prosCons.map((pc) => ({
      ...pc,
      pros: sanitizeCompareCopy(pc.pros),
      cons: sanitizeCompareCopy(pc.cons),
      bestFor: sanitizeCompareCopy(pc.bestFor),
    }));
  }

  const productsForFront = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    images: p.images,
    frameShape: p.frameShape,
    frameMaterial: p.frameMaterial,
    category: p.category,
  }));

  return { summary, prosCons, products: productsForFront };
}

module.exports = { chat, compare, mockAnalyzeQuestion, parseMaxBudgetVnd };
