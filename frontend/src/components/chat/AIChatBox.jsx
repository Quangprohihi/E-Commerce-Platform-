import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Sparkles, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../ui/ProductCard';
import api from '../../services/api';

/** Chỉ báo khi AI đang xử lý — rõ ràng hơn skeleton kính. */
function AIThinkingBubble() {
  return (
    <div
      className="glass rounded-2xl rounded-bl-md px-5 py-4 flex flex-col gap-3 max-w-[min(100%,20rem)] border border-primary/10"
      role="status"
      aria-live="polite"
      aria-label="AI Stylist đang trả lời, vui lòng chờ"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <motion.span
          className="inline-flex p-1 rounded-full bg-primary/10 text-primary"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles size={16} strokeWidth={2} />
        </motion.span>
        <span>AI Stylist đang trả lời…</span>
      </div>
      <div className="flex items-center gap-1.5 pl-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-primary/55"
            animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
            transition={{
              duration: 0.55,
              repeat: Infinity,
              delay: i * 0.12,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <p className="text-[11px] text-text-muted leading-snug">Vui lòng đợi vài giây.</p>
    </div>
  );
}

function buildOrderSummaryFromProducts(suggestedProducts) {
  if (!suggestedProducts?.length) return { items: [], total: 0 };
  const items = suggestedProducts.map((p) => ({
    productId: p.id,
    name: p.name,
    price: typeof (p.salePrice ?? p.price) === 'number' ? p.salePrice ?? p.price : Number(p.salePrice ?? p.price),
    quantity: 1,
  }));
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { items, total };
}

function addAllToCart(orderSummary, suggestedProducts, onDone) {
  const items = orderSummary?.items?.length
    ? orderSummary.items
    : suggestedProducts?.map((p) => ({
        productId: p.id,
        name: p.name,
        price: Number(p.salePrice ?? p.price),
        quantity: 1,
      })) || [];
  if (!items.length) return;
  try {
    const raw = localStorage.getItem('cart');
    const cart = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(cart) ? cart : [];
    for (const it of items) {
      const found = normalized.find((x) => x.id === it.productId);
      const qty = it.quantity || 1;
      if (found) {
        found.quantity = (Number(found.quantity) || 0) + qty;
      } else {
        const p = suggestedProducts?.find((x) => x.id === it.productId);
        normalized.push({
          id: it.productId,
          name: it.name,
          slug: p?.slug || '',
          images: p?.images,
          price: it.price,
          salePrice: p?.salePrice != null ? Number(p.salePrice) : null,
          quantity: qty,
        });
      }
    }
    localStorage.setItem('cart', JSON.stringify(normalized));
    window.dispatchEvent(new Event('cart-updated'));
    onDone?.();
  } catch {
    // silent
  }
}

export default function AIChatBox({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addedToCartMsgIndex, setAddedToCartMsgIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'USER', content: text }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { question: text });
      const data = res.data?.data || {};
      const suggestedProducts = data.suggestedProducts || [];
      const orderSummary =
        data.orderSummary?.items?.length != null
          ? data.orderSummary
          : buildOrderSummaryFromProducts(suggestedProducts);
      const meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
      setMessages((prev) => [
        ...prev,
        {
          role: 'AI',
          content: data.answer || 'Xin lỗi, tôi chưa thể trả lời.',
          suggestedProducts,
          orderSummary,
          meta,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'AI', content: 'Đã có lỗi. Vui lòng thử lại sau.', suggestedProducts: [], orderSummary: { items: [], total: 0 } },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  const suggestionPrompts = [
    'Mặt tròn đeo kính gì hợp?',
    'Gợi ý kính cho phong cách công sở',
    'Có mẫu nào dưới 1.5 triệu không?',
    'Da ngăm nên chọn màu gọng nào?',
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-100 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute inset-0 bg-[rgba(10,10,10,0.3)] backdrop-blur-sm"
          aria-label="Đóng AI Chat"
        />
        <div className="relative flex flex-col h-full max-w-5xl mx-auto w-full glass-strong border-x border-white/35">
          {/* Header */}
          <header className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-black/10">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-full bg-primary/5 text-primary">
                <Sparkles size={22} strokeWidth={1.5} />
              </span>
              <div>
                <h2 className="font-serif text-lg font-semibold text-primary">AI Stylist</h2>
                <p className="text-xs text-text-muted">Gợi ý kính phù hợp với bạn</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-primary hover:bg-primary/5 rounded-full transition-colors"
              aria-label="Đóng"
            >
              <X size={24} strokeWidth={1.5} />
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-8 py-8 space-y-6">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageCircle size={48} className="text-primary/20 mb-4" strokeWidth={1} />
                <p className="text-primary font-medium mb-1">Hỏi AI Stylist</p>
                <p className="text-sm text-text-muted max-w-sm">
                  Ví dụ: Mặt tròn đeo kính gì hợp? Kính nào cho da ngăm?
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-xl">
                  {suggestionPrompts.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-2 rounded-full glass text-[11px] uppercase tracking-[0.12em] hover:bg-white/85 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[92%] sm:max-w-2xl ${
                    msg.role === 'USER'
                      ? 'bg-primary text-white rounded-2xl rounded-br-md px-5 py-4'
                      : 'glass rounded-2xl rounded-bl-md px-5 py-4'
                  }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'AI' && msg.suggestedProducts?.length > 0 && (
                  <div className="mt-4 w-full space-y-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7f786f] mb-3">Gợi ý sản phẩm</p>
                    <div className="overflow-x-auto scrollbar-hide scroll-pl-4 pl-1 sm:pl-2">
                      <div className="flex gap-4 min-w-max pr-4">
                        {msg.suggestedProducts.map((p) => (
                          <div key={p.id} className="w-65 shrink-0">
                            <ProductCard product={p} />
                          </div>
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const summary = msg.orderSummary?.items?.length
                        ? msg.orderSummary
                        : buildOrderSummaryFromProducts(msg.suggestedProducts);
                      const hasItems = summary.items?.length > 0;
                      const added = addedToCartMsgIndex === i;
                      if (!hasItems) return null;
                      return (
                        <div className="glass rounded-2xl rounded-bl-md px-4 py-4 mt-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#7f786f] mb-3">Tóm tắt</p>
                          <ul className="space-y-2 mb-3">
                            {summary.items.map((it) => (
                              <li key={it.productId} className="flex justify-between text-sm text-primary">
                                <span className="truncate pr-2">{it.name}</span>
                                <span className="shrink-0">
                                  {(it.price * (it.quantity || 1)).toLocaleString('vi-VN')} ₫
                                  {it.quantity > 1 ? ` × ${it.quantity}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {msg.meta?.maxBudgetVnd > 0 && Number(summary.total) > msg.meta.maxBudgetVnd ? (
                            <p className="text-[11px] text-text-muted leading-snug mb-2">
                              Mỗi sản phẩm gợi ý có giá thanh toán trong ngân sách tối đa{' '}
                              {Number(msg.meta.maxBudgetVnd).toLocaleString('vi-VN')} ₫. Tổng dưới đây là nếu thêm hết vào giỏ
                              (nhiều món) — có thể cao hơn một lần mua một món.
                            </p>
                          ) : null}
                          <div className="flex items-center justify-between border-t border-black/10 pt-3">
                            <span className="font-medium text-primary">Tổng cộng: {Number(summary.total).toLocaleString('vi-VN')} ₫</span>
                            <button
                              type="button"
                              onClick={() => {
                                addAllToCart(summary, msg.suggestedProducts, () => setAddedToCartMsgIndex(i));
                              }}
                              disabled={added}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm disabled:opacity-70 hover:bg-primary-soft transition-colors"
                            >
                              <ShoppingCart size={16} strokeWidth={1.5} />
                              {added ? 'Đã thêm vào giỏ' : 'Thêm tất cả vào giỏ'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <AIThinkingBubble />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-black/10 px-4 sm:px-8 py-5">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi AI Stylist..."
                className="flex-1 bg-background-alt border border-black/10 rounded-full px-5 py-3 text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={loading}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="p-3 rounded-full bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-soft transition-colors"
                aria-label="Gửi"
              >
                <Send size={20} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
