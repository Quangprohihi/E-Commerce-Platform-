const prisma = require('../config/prisma');

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
async function loadProductsForPrompt() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
      salePrice: true,
      frameShape: true,
      frameMaterial: true,
      stock: true,
      category: { select: { id: true, name: true } },
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
  });
  return products;
}

/** Format products as text for Gemini prompt. */
function formatProductsForPrompt(products) {
  return products
    .map((p) => {
      const price = Number(p.price);
      const sale = p.salePrice != null ? Number(p.salePrice) : null;
      const priceStr = sale != null ? `${sale} (giá gốc ${price})` : String(price);
      return `- id: "${p.id}", tên: "${p.name}", giá: ${priceStr}, hình gọng: ${p.frameShape || 'N/A'}, chất liệu: ${p.frameMaterial || 'N/A'}, danh mục: ${p.category?.name || 'N/A'}, tồn kho: ${p.stock}`;
    })
    .join('\n');
}

/** Try 2.5 first (free tier often has quota); then 2.0. */
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const GEMINI_429_RETRY_MS = 8000;

/** Call Gemini and parse JSON response. Returns { answer, productIds } or null on failure. */
async function callGemini(question, productListText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.warn('GEMINI_API_KEY is not set; using mock AI.');
    return null;
  }

  const systemPrompt = `Bạn là AI Stylist của cửa hàng kính mắt "Kính Tốt". Nhiệm vụ: dựa vào nhu cầu khách (kiểu mặt, phong cách, giá tiền, màu da, v.v.) gợi ý sản phẩm từ DANH SÁCH SẢN PHẨM bên dưới.
Trả lời ĐÚNG theo JSON sau (không thêm ký tự nào ngoài JSON):
{"answer": "Câu trả lời thân thiện bằng tiếng Việt, giải thích ngắn gọn vì sao gợi ý những sản phẩm đó.", "productIds": ["id1", "id2", ...]}
- answer: 1-3 câu, tiếng Việt.
- productIds: mảng tối đa 6 id từ danh sách (chỉ dùng id có trong danh sách). Nếu không có sản phẩm phù hợp thì trả productIds rỗng.`;

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
async function resolveSuggestedProducts(productIds) {
  if (!productIds.length) return { products: [], orderSummary: { items: [], total: 0 } };

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
    if (p.stock > 0) {
      inStock.push(p);
    } else {
      if (p.categoryId) outOfStockCategoryIds.add(p.categoryId);
    }
  }

  let replacements = [];
  if (outOfStockCategoryIds.size > 0) {
    const existingIds = inStock.map((x) => x.id);
    replacements = await prisma.product.findMany({
      where: {
        categoryId: { in: [...outOfStockCategoryIds] },
        id: { notIn: existingIds },
        stock: { gt: 0 },
        isActive: true,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });
  }

  const suggested = [...inStock];
  const usedIds = new Set(inStock.map((p) => p.id));
  for (const p of replacements) {
    if (usedIds.has(p.id)) continue;
    suggested.push(p);
    usedIds.add(p.id);
    if (suggested.length >= 6) break;
  }

  const normalized = suggested.slice(0, 6).map((p) => ({
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
  const productsForPrompt = await loadProductsForPrompt();
  const productListText = formatProductsForPrompt(productsForPrompt);

  let answer;
  let productIds = [];

  const geminiResult = await callGemini(question, productListText);
  if (geminiResult) {
    answer = geminiResult.answer || 'Dưới đây là gợi ý sản phẩm phù hợp từ Kính Tốt.';
    productIds = geminiResult.productIds || [];
  } else {
    const frameShapes = mockAnalyzeQuestion(question);
    answer = mockAnswer(question, frameShapes);
    const mockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        frameShape: frameShapes.length ? { in: frameShapes } : undefined,
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });
    productIds = mockProducts.map((p) => p.id);
  }

  const { products: suggestedProducts, orderSummary } = await resolveSuggestedProducts(productIds);

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

  return { answer, suggestedProducts, orderSummary };
}

/** Format product list for compare prompt (id, name, description snippet, price, frame, material, condition, category). */
function formatProductsForCompare(products) {
  return products
    .map((p) => {
      const desc = (p.description || '').slice(0, 200);
      const price = Number(p.price);
      const sale = p.salePrice != null ? Number(p.salePrice) : null;
      const priceStr = sale != null ? `${sale} (gốc ${price})` : String(price);
      return `- productId: "${p.id}", tên: "${p.name}", mô tả: "${desc}", giá: ${priceStr}, hình gọng: ${p.frameShape || 'N/A'}, chất liệu: ${p.frameMaterial || 'N/A'}, tình trạng: ${p.condition || 'N/A'}, danh mục: ${p.category?.name || 'N/A'}`;
    })
    .join('\n');
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

/** Mock prosCons for compare when Gemini unavailable. */
function mockCompareResult(products) {
  const shapeNames = { ROUND: 'tròn', OVAL: 'oval', SQUARE: 'vuông', RECTANGLE: 'chữ nhật', CAT_EYE: 'mắt mèo', AVIATOR: 'aviator' };
  const summary = `So sánh ${products.length} sản phẩm kính: gợi ý dựa trên hình dạng gọng, chất liệu và giá. Bạn có thể xem chi tiết từng mẫu bên dưới.`;
  const prosCons = products.map((p) => {
    const shape = shapeNames[p.frameShape] || p.frameShape || 'đa dạng';
    const price = Number(p.salePrice ?? p.price);
    return {
      productId: p.id,
      pros: `Gọng ${shape}, chất liệu ${p.frameMaterial || 'phổ biến'}, giá ${price.toLocaleString('vi-VN')} đ.`,
      cons: 'Nên xem thêm đánh giá và ảnh thật trước khi quyết định.',
      bestFor: 'Phù hợp người tìm kiểu dáng tương tự và mức giá này.',
    };
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
    include: { category: { select: { name: true } } },
  });

  if (products.length !== ids.length) {
    const err = new Error('Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng bán');
    err.statusCode = 400;
    throw err;
  }

  const productListText = formatProductsForCompare(products);
  const systemPrompt = `Bạn là chuyên gia tư vấn kính mắt của "Kính Tốt". Nhiệm vụ: so sánh 2 hoặc 3 sản phẩm dưới đây và trả lời ĐÚNG theo JSON (không markdown):
{"summary": "Một đoạn ngắn tiếng Việt: tổng quan so sánh và gợi ý 'nên chọn X nếu...'.", "prosCons": [{"productId": "id1", "pros": "Ưu điểm ngắn gọn", "cons": "Nhược điểm ngắn gọn", "bestFor": "Phù hợp với ai / trường hợp nào"}, ...]}
- prosCons phải có đủ một phần tử cho từng productId trong danh sách; productId phải trùng chính xác id trong danh sách.`;

  const userContent = `DANH SÁCH SẢN PHẨM CẦN SO SÁNH:\n${productListText}\n\nTrả lời bằng JSON duy nhất (không \`\`\`):`;

  let summary;
  let prosCons;

  const geminiResult = await callGeminiCompare(systemPrompt + '\n\n' + userContent);
  if (geminiResult) {
    summary = geminiResult.summary || '';
    prosCons = Array.isArray(geminiResult.prosCons) ? geminiResult.prosCons : [];
    const idSet = new Set(products.map((p) => p.id));
    prosCons = prosCons.filter((x) => idSet.has(x.productId));
    while (prosCons.length < products.length) {
      const missing = products.find((p) => !prosCons.some((c) => c.productId === p.id));
      if (!missing) break;
      const mock = mockCompareResult([missing]).prosCons[0];
      prosCons.push(mock);
    }
  } else {
    const mock = mockCompareResult(products);
    summary = mock.summary;
    prosCons = mock.prosCons;
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

module.exports = { chat, compare, mockAnalyzeQuestion };
