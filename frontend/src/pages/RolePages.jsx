import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Star,
  Package,
  ClipboardList,
  BadgeCheck,
  Users,
  PackageSearch,
  ShieldCheck,
  AlertTriangle,
  Clock3,
  TrendingUp,
  CircleCheckBig,
  Bell,
  ChartColumn,
  Settings,
  UserCircle,
  Mail,
  Phone,
  AtSign,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath } from '../utils/auth';
import { ATTR_TRANSLATIONS, translateAttr } from '../utils/translations';
import DashboardLayout from '../components/dashboard/DashboardLayout';

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('vi-VN');
}

function currency(value) {
  const amount = Number(value || 0);
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

function PageShell({ title, subtitle, children }) {
  const { user } = useAuth();

  return (
    <DashboardLayout title={title} subtitle={subtitle}>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Xin chào {user?.fullName || 'bạn'}</p>
        <h1 className="font-serif text-3xl md:text-5xl text-primary mt-2">{title}</h1>
        <p className="text-text-muted mt-3">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon: Icon, accentColor = '#c9a96e' }) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      {Icon ? (
        <div className="absolute top-4 right-4 rounded-xl p-2" style={{ background: `${accentColor}1a` }}>
          <Icon size={18} style={{ color: accentColor }} strokeWidth={1.6} />
        </div>
      ) : null}
      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="font-serif text-3xl mt-2 text-primary">{value}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-text-muted text-sm">{text}</p>;
}

function MessageBox({ type = 'info', text }) {
  if (!text) return null;
  const style = type === 'error'
    ? 'text-red-700 bg-red-50 border-red-200'
    : type === 'success'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : 'text-primary bg-white/70 border-black/10';

  return <p className={`text-sm border rounded-xl px-3 py-2 ${style}`}>{text}</p>;
}

function SectionCard({ title, children, action }) {
  return (
    <div className="glass-strong rounded-3xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-serif text-2xl text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-190 text-sm">
        <thead>
          <tr className="text-left border-b border-black/10 text-text-muted uppercase tracking-[0.08em] text-xs">
            {columns.map((column, i) => (
              <th key={column} className={`py-3 pr-3 ${i === 0 && column === 'STT' ? 'text-center' : ''}`}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
  );
}

export function BuyerDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [ordersRes, reviewsRes] = await Promise.all([
          api.get('/orders'),
          user?.id ? api.get('/reviews', { params: { userId: user.id, limit: 100 } }) : Promise.resolve({ data: { data: { items: [] } } }),
        ]);

        if (cancelled) return;

        setOrders(ordersRes.data?.data || []);
        setReviews(reviewsRes.data?.data?.items || []);
      } catch {
        if (cancelled) return;
        setOrders([]);
        setReviews([]);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const pendingOrders = useMemo(() => orders.filter((item) => item.status === 'PENDING').length, [orders]);
  const deliveredOrders = useMemo(() => orders.filter((item) => item.status === 'DELIVERED').length, [orders]);

  const topProducts = useMemo(() => {
    const bucket = new Map();

    orders.forEach((order) => {
      (order.details || []).forEach((detail) => {
        const key = detail.product?.id || detail.productId || detail.product?.name;
        if (!key) return;
        const current = bucket.get(key) || { name: detail.product?.name || 'Sản phẩm', qty: 0 };
        current.qty += Number(detail.quantity || 1);
        bucket.set(key, current);
      });
    });

    return Array.from(bucket.values()).sort((a, b) => b.qty - a.qty).slice(0, 3);
  }, [orders]);

  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5), [orders]);

  return (
    <PageShell title="Trang Buyer" subtitle="Theo dõi đơn hàng, hồ sơ cá nhân và đánh giá sản phẩm.">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Tổng đơn" value={orders.length} icon={ShoppingBag} accentColor="#3B82F6" />
        <StatCard label="Đang chờ" value={pendingOrders} icon={Clock3} accentColor="#3B82F6" />
        <StatCard label="Đã giao" value={deliveredOrders} icon={CircleCheckBig} accentColor="#3B82F6" />
        <StatCard label="Reviews" value={reviews.length} icon={Star} accentColor="#3B82F6" />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard title="Cần chú ý">
          <div className="space-y-2 text-sm text-text-muted">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> {pendingOrders > 0 ? `${pendingOrders} đơn đang chờ xử lý` : 'Không có đơn chờ xử lý'}</p>
            <p className="flex items-center gap-2"><Bell size={16} className="text-blue-600" /> {reviews.length > 0 ? `${reviews.length} đánh giá đã gửi` : 'Chưa có đánh giá mới'}</p>
            <p className="flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Theo dõi lịch sử để mua lại nhanh hơn</p>
          </div>
        </SectionCard>

        <SectionCard title="Đơn gần đây">
          <div className="space-y-2">
            {recentOrders.length === 0 ? <EmptyState text="Chưa có đơn hàng gần đây." /> : recentOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="text-primary">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-text-muted">{formatDate(order.createdAt)}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.08em] text-text-muted">{order.status || '--'}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top sản phẩm đã mua">
          <div className="space-y-2">
            {topProducts.length === 0 ? <EmptyState text="Chưa đủ dữ liệu sản phẩm." /> : topProducts.map((item) => (
              <div key={item.name} className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 flex items-center justify-between">
                <p className="text-sm text-primary truncate pr-2">{item.name}</p>
                <span className="text-xs text-text-muted">x{item.qty}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

    </PageShell>
  );
}

export function BuyerOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/orders');
      setOrders(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const viewDetail = async (order) => {
    setError('');
    try {
      const response = await api.get(`/orders/${order.id}`);
      setSelectedOrder(response.data?.data || order);
    } catch (err) {
      setSelectedOrder(order);
      setError(err.response?.data?.message || 'Không thể tải chi tiết đơn.');
    }
  };

  const cancelOrder = async () => {
    if (!selectedOrder?.id) return;
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    setCancelling(true);
    setError('');
    try {
      await api.patch(`/orders/${selectedOrder.id}/status`, { status: 'CANCELLED' });
      setError('');
      const refreshed = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(refreshed.data?.data || { ...selectedOrder, status: 'CANCELLED' });
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể hủy đơn hàng.');
    } finally {
      setCancelling(false);
    }
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((item) => item.status === 'PENDING').length;

  return (
    <PageShell title="Đơn hàng của Buyer" subtitle="Theo dõi trạng thái và tổng giá trị đơn hàng của bạn.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard label="Tổng đơn" value={totalOrders} icon={ShoppingBag} accentColor="#3B82F6" />
        <StatCard label="Đang chờ" value={pendingOrders} icon={ClipboardList} accentColor="#3B82F6" />
      </div>

      <SectionCard
        title="Danh sách đơn hàng"
        action={<button type="button" onClick={loadOrders} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">Refresh</button>}
      >
        {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
        {error ? <MessageBox type={error.includes('thành công') ? 'success' : 'error'} text={error} /> : null}
        {!loading && !error && orders.length === 0 ? <EmptyState text="Bạn chưa có đơn hàng nào." /> : null}
        {!loading && !error && orders.length > 0 ? (
          <DataTable
            columns={['Mã đơn', 'Ngày tạo', 'Trạng thái', 'Tổng tiền', 'Sản phẩm', 'Thao tác']}
            rows={orders.map((order) => (
              <tr key={order.id} className="border-b border-black/5">
                <td className="py-3 pr-3">{order.id.slice(0, 10)}...</td>
                <td className="py-3 pr-3">{formatDate(order.createdAt)}</td>
                <td className="py-3 pr-3">{order.status}</td>
                <td className="py-3 pr-3">{currency(order.totalAmount)}</td>
                <td className="py-3 pr-3">{order.details?.length || 0} sản phẩm</td>
                <td className="py-3 pr-3">
                  <button type="button" onClick={() => viewDetail(order)} className="text-xs uppercase tracking-[0.12em] text-primary hover:text-accent">
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          />
        ) : null}
      </SectionCard>

      <div className="mt-8">
        <SectionCard title="Chi tiết đơn hàng">
          {!selectedOrder ? (
            <p className="text-text-muted text-sm">Chọn một đơn từ bảng trên và bấm <strong>Xem chi tiết</strong>.</p>
          ) : (
            <div className="mt-4 rounded-xl border border-black/10 bg-white/60 p-4 space-y-3">
              <p><span className="text-text-muted">Mã đơn:</span> {selectedOrder.id}</p>
              <p><span className="text-text-muted">Ngày tạo:</span> {formatDate(selectedOrder.createdAt)}</p>
              <p><span className="text-text-muted">Trạng thái:</span> <span className={`font-medium ${selectedOrder.status === 'CANCELLED' ? 'text-red-600' : selectedOrder.status === 'DELIVERED' ? 'text-emerald-600' : 'text-primary'}`}>{selectedOrder.status}</span></p>
              <p><span className="text-text-muted">Địa chỉ:</span> {selectedOrder.shippingAddress || '--'}</p>
              <p><span className="text-text-muted">Số điện thoại:</span> {selectedOrder.phone || '--'}</p>
              {selectedOrder.note ? <p><span className="text-text-muted">Ghi chú:</span> {selectedOrder.note}</p> : null}
              <p><span className="text-text-muted">Tổng tiền:</span> <span className="font-medium">{currency(selectedOrder.totalAmount)}</span></p>
              <p><span className="text-text-muted">Thanh toán:</span> {selectedOrder.paymentMethod || 'COD'}</p>
              {selectedOrder.details?.length ? (
                <div className="rounded-xl border border-black/10 bg-white/70 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted mb-2">Sản phẩm trong đơn</p>
                  <div className="space-y-2">
                    {selectedOrder.details.map((detail) => (
                      <div key={detail.id || `${detail.productId}-${detail.quantity}`} className="flex items-center justify-between gap-3 text-sm">
                        <p className="text-primary">{detail.product?.name || detail.productId}</p>
                        <p className="text-text-muted">x{detail.quantity} • {currency(detail.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedOrder.status === 'PENDING' ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={cancelOrder}
                    disabled={cancelling}
                    className="h-10 px-5 rounded-xl bg-red-600 text-white text-xs uppercase tracking-[0.12em] hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}

export function BuyerReviewsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create review state
  const [deliveredProducts, setDeliveredProducts] = useState([]);
  const [reviewForm, setReviewForm] = useState({ productId: '', rating: '5', comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/reviews', { params: { userId: user.id, limit: 100 } });
      setReviews(response.data?.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [reviewsRes, ordersRes] = await Promise.all([
          api.get('/reviews', { params: { userId: user.id, limit: 100 } }),
          api.get('/orders'),
        ]);

        if (cancelled) return;

        const reviewItems = reviewsRes.data?.data?.items || [];
        setReviews(reviewItems);

        // Extract products from DELIVERED orders that haven't been reviewed yet
        const orders = ordersRes.data?.data || [];
        const reviewedProductIds = new Set(reviewItems.map((r) => r.productId));
        const productMap = new Map();
        orders
          .filter((o) => o.status === 'DELIVERED')
          .forEach((order) => {
            (order.details || []).forEach((detail) => {
              const pid = detail.product?.id || detail.productId;
              if (pid && !reviewedProductIds.has(pid) && !productMap.has(pid)) {
                productMap.set(pid, { id: pid, name: detail.product?.name || pid });
              }
            });
          });
        setDeliveredProducts(Array.from(productMap.values()));
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Không thể tải dữ liệu.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleCreateReview = async (event) => {
    event.preventDefault();
    if (!reviewForm.productId) {
      setError('Vui lòng chọn sản phẩm cần đánh giá.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/reviews', {
        productId: reviewForm.productId,
        rating: parseInt(reviewForm.rating, 10),
        comment: reviewForm.comment || null,
      });
      setSuccessMsg('Gửi đánh giá thành công!');
      setReviewForm({ productId: '', rating: '5', comment: '' });
      // Reload to update both reviews list and available products
      const [reviewsRes, ordersRes] = await Promise.all([
        api.get('/reviews', { params: { userId: user.id, limit: 100 } }),
        api.get('/orders'),
      ]);
      const reviewItems = reviewsRes.data?.data?.items || [];
      setReviews(reviewItems);
      const reviewedProductIds = new Set(reviewItems.map((r) => r.productId));
      const productMap = new Map();
      (ordersRes.data?.data || [])
        .filter((o) => o.status === 'DELIVERED')
        .forEach((order) => {
          (order.details || []).forEach((detail) => {
            const pid = detail.product?.id || detail.productId;
            if (pid && !reviewedProductIds.has(pid) && !productMap.has(pid)) {
              productMap.set(pid, { id: pid, name: detail.product?.name || pid });
            }
          });
        });
      setDeliveredProducts(Array.from(productMap.values()));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Bạn có chắc muốn xóa đánh giá này?')) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.delete(`/reviews/${reviewId}`);
      setSuccessMsg('Xóa đánh giá thành công.');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa đánh giá.');
    }
  };

  return (
    <PageShell title="Đánh giá của Buyer" subtitle="Tổng hợp các review bạn đã gửi và tạo đánh giá mới.">
      {/* Create Review Form */}
      <SectionCard title="Tạo đánh giá mới">
        {deliveredProducts.length === 0 && !loading ? (
          <EmptyState text="Không có sản phẩm nào cần đánh giá. Bạn cần có đơn hàng đã giao (DELIVERED) và chưa đánh giá." />
        ) : (
          <form onSubmit={handleCreateReview} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Sản phẩm *</label>
                <select
                  value={reviewForm.productId}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, productId: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
                  required
                >
                  <option value="">— Chọn sản phẩm —</option>
                  {deliveredProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Số sao *</label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                  <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                  <option value="3">⭐⭐⭐ (3 sao)</option>
                  <option value="2">⭐⭐ (2 sao)</option>
                  <option value="1">⭐ (1 sao)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Nhận xét</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                className="w-full min-h-24 rounded-xl border border-black/10 px-4 py-3 bg-white/70"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-6 rounded-xl bg-primary text-white text-xs uppercase tracking-[0.12em] disabled:opacity-60"
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </form>
        )}
        {error ? <div className="mt-3"><MessageBox type="error" text={error} /></div> : null}
        {successMsg ? <div className="mt-3"><MessageBox type="success" text={successMsg} /></div> : null}
      </SectionCard>

      {/* Reviews List */}
      <div className="mt-6">
        <SectionCard
          title="Danh sách đánh giá"
          action={<button type="button" onClick={loadReviews} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">Refresh</button>}
        >
          {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
          {!loading && reviews.length === 0 ? <EmptyState text="Bạn chưa gửi đánh giá nào." /> : null}
          {!loading && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-black/10 bg-white/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary">{review.product?.name || 'Sản phẩm'}</p>
                      <p className="text-sm text-text-muted mt-1">{'⭐'.repeat(review.rating)} ({review.rating}/5)</p>
                      <p className="text-sm mt-2">{review.comment || 'Không có nhận xét'}</p>
                      <p className="text-xs text-text-muted mt-2">{formatDate(review.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-red-600 hover:text-red-700 text-xs uppercase tracking-widest font-medium shrink-0"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </PageShell>
  );
}

export function BuyerProfilePage() {
  const { user } = useAuth();

  return (
    <PageShell title="Hồ sơ Buyer" subtitle="Thông tin phiên đăng nhập hiện tại của bạn.">
      <SectionCard title="Thông tin tài khoản">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-black/10 bg-white/60 p-4"><p className="text-text-muted">Họ tên</p><p className="mt-1">{user?.fullName || '--'}</p></div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-4"><p className="text-text-muted">Email</p><p className="mt-1">{user?.email || '--'}</p></div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-4"><p className="text-text-muted">Số điện thoại</p><p className="mt-1">{user?.phone || '--'}</p></div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-4"><p className="text-text-muted">Role</p><p className="mt-1">{user?.role || '--'}</p></div>
        </div>
      </SectionCard>
    </PageShell>
  );
}

export function SellerDashboardPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          api.get('/products', { params: { limit: 100 } }),
          api.get('/orders/manage', { params: { limit: 20, page: 1 } }),
        ]);

        if (cancelled) return;
        const productItems = productsRes.data?.data?.items || [];
        const ownProducts = productItems.filter((item) => item.seller?.id === user?.id);
        setProducts(ownProducts);
        setOrders(ordersRes.data?.data?.items || []);
      } catch {
        if (cancelled) return;
        setProducts([]);
        setOrders([]);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const lowStockCount = useMemo(() => products.filter((item) => Number(item.stock || 0) < 5).length, [products]);
  const pendingOrders = useMemo(() => orders.filter((item) => item.status === 'PENDING').length, [orders]);
  const processingOrders = useMemo(() => orders.filter((item) => item.status === 'PROCESSING').length, [orders]);
  const estimatedRevenue = useMemo(() => orders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0), [orders]);
  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5), [orders]);

  const topProducts = useMemo(() => {
    const sorted = [...products]
      .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
      .slice(0, 3);
    return sorted;
  }, [products]);

  return (
    <PageShell title="Seller Dashboard" subtitle="Quản lý sản phẩm, đơn hàng và trạng thái KYC của người bán.">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Sản phẩm" value={products.length} icon={Package} accentColor="#10B981" />
        <StatCard label="Đơn chờ" value={pendingOrders} icon={Clock3} accentColor="#10B981" />
        <StatCard label="Đang xử lý" value={processingOrders} icon={ClipboardList} accentColor="#10B981" />
        <StatCard label="Doanh thu ước tính" value={currency(estimatedRevenue)} icon={TrendingUp} accentColor="#10B981" />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard title="Cảnh báo vận hành">
          <div className="space-y-2 text-sm text-text-muted">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> {lowStockCount > 0 ? `${lowStockCount} sản phẩm sắp hết hàng` : 'Tồn kho đang ổn định'}</p>
            <p className="flex items-center gap-2"><Bell size={16} className="text-blue-600" /> {pendingOrders > 0 ? `${pendingOrders} đơn cần xác nhận` : 'Không có đơn chờ xác nhận'}</p>
            <p className="flex items-center gap-2"><BadgeCheck size={16} className="text-emerald-600" /> KYC hiện tại: {user?.sellerProfile?.kycStatus || 'CHƯA GỬI HỒ SƠ'}</p>
          </div>
        </SectionCard>

        <SectionCard title="Đơn gần đây">
          <div className="space-y-2">
            {recentOrders.length === 0 ? <EmptyState text="Chưa có đơn hàng mới." /> : recentOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="text-primary">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-text-muted">{currency(order.totalAmount || 0)}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.08em] text-text-muted">{order.status || '--'}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top sản phẩm tồn kho">
          <div className="space-y-2">
            {topProducts.length === 0 ? <EmptyState text="Chưa có dữ liệu sản phẩm." /> : topProducts.map((item) => (
              <div key={item.id} className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 flex items-center justify-between gap-3">
                <p className="text-sm text-primary truncate">{item.name}</p>
                <span className="text-xs text-text-muted">Kho: {item.stock}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

    </PageShell>
  );
}

export function SellerProductsPage() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [categoriesFromApi, setCategoriesFromApi] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    description: '',
    price: '',
    salePrice: '',
    stock: '0',
    condition: 'NEW',
    frameShape: 'ROUND',
    frameMaterial: 'METAL',
    lensType: 'SINGLE_VISION',
    gender: 'UNISEX',
  });

  // Refetch current user so KYC status is up-to-date (login response may omit sellerProfile).
  useEffect(() => {
    let cancelled = false;
    api.get('/auth/me')
      .then((res) => {
        if (!cancelled && res.data?.data) {
          setUser(res.data.data);
          if (res.data.data) localStorage.setItem('currentUser', JSON.stringify(res.data.data));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [setUser]);

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    api.get('/categories')
      .then((res) => {
        if (!cancelled) {
          const items = res.data?.data?.items || [];
          setCategoriesFromApi(items);
        }
      })
      .catch(() => {
        if (!cancelled) setCategoriesFromApi([]);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (categoriesFromApi.length === 0) return;
    setForm((prev) => {
      if (prev.categoryId) return prev;
      return { ...prev, categoryId: categoriesFromApi[0].id };
    });
  }, [categoriesFromApi]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/products', { params: { limit: 100 } });
      const allItems = response.data?.data?.items || [];
      setProducts(allItems.filter((item) => item.seller?.id === user?.id));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadProducts();
  }, [user?.id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return;
    try {
      await api.delete(`/products/${id}`);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa sản phẩm.');
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setCreateMessage('');
    setCreateError('');
    setImageFile(null);
    setForm({
      name: product.name || '',
      categoryId: product.categoryId || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      salePrice: product.salePrice?.toString() || '',
      stock: product.stock?.toString() || '0',
      condition: product.condition || 'NEW',
      frameShape: product.frameShape || 'ROUND',
      frameMaterial: product.frameMaterial || 'METAL',
      lensType: product.lensType || 'SINGLE_VISION',
      gender: product.gender || 'UNISEX',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setCreateMessage('');
    setCreateError('');
    setImageFile(null);
    setForm({
      name: '',
      categoryId: categoriesFromApi[0]?.id || '',
      description: '',
      price: '',
      salePrice: '',
      stock: '0',
      condition: 'NEW',
      frameShape: 'ROUND',
      frameMaterial: 'METAL',
      lensType: 'SINGLE_VISION',
      gender: 'UNISEX',
    });
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateMessage('');

    try {
      let imageUrl = editingProduct?.images?.[0] || null;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await api.post('/products/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrl = uploadRes.data?.data?.url;
        if (!imageUrl) {
          throw new Error('Upload ảnh thất bại: không nhận được URL từ Cloudinary.');
        }
      } else if (!editingProduct && !imageFile) {
        throw new Error('Vui lòng chọn ảnh sản phẩm trước khi tạo.');
      }

      if (!form.categoryId) {
        throw new Error('Vui lòng chọn danh mục sản phẩm.');
      }

      const payload = {
        name: form.name,
        categoryId: form.categoryId,
        description: form.description || null,
        price: form.price.toString(),
        salePrice: form.salePrice ? form.salePrice.toString() : null,
        stock: Number(form.stock || 0),
        condition: form.condition,
        frameShape: form.frameShape,
        frameMaterial: form.frameMaterial,
        lensType: form.lensType,
        gender: form.gender,
      };

      if (imageUrl) {
        payload.images = [imageUrl];
      }

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        setCreateMessage('Cập nhật sản phẩm thành công.');
      } else {
        await api.post('/products', payload);
        setCreateMessage('Tạo sản phẩm thành công. Ảnh đã upload lên Cloudinary.');
      }
      setImageFile(null);
      if (!editingProduct) {
        setForm((prev) => ({
          ...prev,
          name: '',
          description: '',
          price: '',
          salePrice: '',
          stock: '0',
          condition: 'NEW',
          frameShape: 'ROUND',
          frameMaterial: 'METAL',
          lensType: 'SINGLE_VISION',
          gender: 'UNISEX',
        }));
      } else {
        setEditingProduct(null);
        cancelEdit();
      }
      await loadProducts();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || (editingProduct ? 'Không thể cập nhật sản phẩm.' : 'Không thể tạo sản phẩm.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageShell title="Sản phẩm của Seller" subtitle="Danh sách sản phẩm hiện tại thuộc cửa hàng của bạn.">
      {user?.sellerProfile?.kycStatus !== 'APPROVED' ? (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-6 flex flex-col items-center justify-center text-center">
          <p className="text-amber-800 font-medium text-lg">Tài khoản chưa được phê duyệt</p>
          <p className="text-amber-700/80 text-sm mt-2 max-w-lg">
            Cửa hàng của bạn đang trong trạng thái "{user?.sellerProfile?.kycStatus || 'Chưa đăng ký KYC'}".
            Vui lòng gửi hồ sơ ở trang <strong>KYC Seller</strong> và chờ Quản trị viên phê duyệt trước khi đăng bán sản phẩm.
          </p>
          <Link
            to="/seller/kyc"
            className="mt-4 px-6 py-2 rounded-full bg-amber-600 text-white hover:bg-amber-700 font-medium text-sm transition-colors"
          >
            Đi tới trang hồ sơ KYC
          </Link>
        </div>
      ) : (
        <SectionCard title={editingProduct ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'}>
          <form onSubmit={handleCreateProduct} className="space-y-5">
          {/* Row 1: Tên + Danh mục */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Tên sản phẩm *</label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="VD: Kính râm Ray-Ban Aviator Classic"
                className="w-full h-11 rounded-xl border border-black/10 px-4 bg-white/70"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Danh mục *</label>
              <select
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
                required
                disabled={categoriesLoading}
              >
                <option value="">
                  {categoriesLoading ? 'Đang tải danh mục...' : '— Chọn danh mục —'}
                </option>
                {categoriesFromApi.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Mô tả */}
          <div>
            <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Mô tả sản phẩm</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="VD: Kính râm phong cách phi công, tròng phân cực chống UV400, gọng kim loại mạ vàng..."
              className="w-full min-h-24 rounded-xl border border-black/10 px-4 py-3 bg-white/70"
            />
          </div>

          {/* Row 3: Giá, Giá KM, Tồn kho, Tình trạng */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Giá bán (VNĐ) *</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="VD: 2500000"
                className="w-full h-11 rounded-xl border border-black/10 px-4 bg-white/70"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Giá khuyến mãi</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={form.salePrice}
                onChange={(event) => setForm((prev) => ({ ...prev, salePrice: event.target.value }))}
                placeholder="VD: 1990000 (để trống nếu không KM)"
                className="w-full h-11 rounded-xl border border-black/10 px-4 bg-white/70"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Tồn kho *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
                placeholder="VD: 50"
                className="w-full h-11 rounded-xl border border-black/10 px-4 bg-white/70"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Tình trạng</label>
              <select
                value={form.condition}
                onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value }))}
                className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
              >
                {Object.keys(ATTR_TRANSLATIONS.condition).map(k => (
                  <option key={k} value={k}>{translateAttr('condition', k)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Hình dáng, Chất liệu, Loại tròng, Giới tính */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Hình dáng gọng</label>
              <select
                value={form.frameShape}
                onChange={(event) => setForm((prev) => ({ ...prev, frameShape: event.target.value }))}
                className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
              >
                {Object.keys(ATTR_TRANSLATIONS.frameShape).map(k => (
                  <option key={k} value={k}>{translateAttr('frameShape', k)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Chất liệu gọng</label>
              <select
                value={form.frameMaterial}
                onChange={(event) => setForm((prev) => ({ ...prev, frameMaterial: event.target.value }))}
                className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
              >
                {Object.keys(ATTR_TRANSLATIONS.frameMaterial).map(k => (
                  <option key={k} value={k}>{translateAttr('frameMaterial', k)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Loại tròng kính</label>
              <select
                value={form.lensType}
                onChange={(event) => setForm((prev) => ({ ...prev, lensType: event.target.value }))}
                className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
              >
                {Object.keys(ATTR_TRANSLATIONS.lensType).map(k => (
                  <option key={k} value={k}>{translateAttr('lensType', k)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Giới tính</label>
              <select
                value={form.gender}
                onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
              >
                {Object.keys(ATTR_TRANSLATIONS.gender).map(k => (
                  <option key={k} value={k}>{translateAttr('gender', k)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Upload ảnh + Preview */}
          <div>
            <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-1.5">Ảnh sản phẩm {editingProduct ? '' : '*'}</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70"
              required={!editingProduct}
            />
            <p className="text-xs text-text-muted mt-1.5">
              {editingProduct ? 'Chọn ảnh mới nếu muốn thay. Bỏ trống nếu giữ ảnh cũ.' : 'Chọn 1 ảnh sản phẩm (JPG/PNG/WEBP). Ảnh sẽ được upload lên Cloudinary.'}
            </p>
            {/* Image Preview */}
            {imageFile ? (
              <div className="mt-3 w-32 h-32 rounded-xl border border-black/10 overflow-hidden bg-white/70">
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : editingProduct?.images?.[0] ? (
              <div className="mt-3 w-32 h-32 rounded-xl border border-black/10 overflow-hidden bg-white/70">
                <img src={editingProduct.images[0]} alt="Ảnh hiện tại" className="w-full h-full object-cover" />
              </div>
            ) : null}
          </div>

          {createError ? <MessageBox type="error" text={createError} /> : null}
          {createMessage ? <MessageBox type="success" text={createMessage} /> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="h-11 px-6 rounded-xl bg-primary text-white text-xs uppercase tracking-[0.12em] disabled:opacity-60"
            >
              {creating ? 'Đang lưu...' : (editingProduct ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm')}
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={cancelEdit}
                className="h-11 px-5 rounded-xl border border-black/20 text-xs uppercase tracking-[0.12em] hover:bg-white/70"
              >
                Hủy thay đổi
              </button>
            )}
          </div>
        </form>
      </SectionCard>
      )}

      <div className="mt-6">
      <SectionCard title="Danh sách sản phẩm" action={<button type="button" onClick={loadProducts} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">Refresh</button>}>
        {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
        {error ? <MessageBox type="error" text={error} /> : null}
        {!loading && !error && products.length === 0 ? <EmptyState text="Bạn chưa có sản phẩm nào đang active." /> : null}
        {!loading && !error && products.length > 0 ? (
          <DataTable
            columns={['Tên', 'Giá', 'Kho', 'Danh mục', 'Thao tác']}
            rows={products.map((product) => (
              <tr key={product.id} className="border-b border-black/5">
                <td className="py-3 pr-3">{product.name}</td>
                <td className="py-3 pr-3">{currency(product.salePrice ?? product.price)}</td>
                <td className="py-3 pr-3">{product.stock}</td>
                <td className="py-3 pr-3">{product.category?.name || '--'}</td>
                <td className="py-3 pr-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={() => handleEditClick(product)} className="text-blue-600 hover:text-blue-700 text-xs uppercase tracking-widest font-medium">Sửa</button>
                    <button type="button" onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-700 text-xs uppercase tracking-widest font-medium">Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          />
        ) : null}
      </SectionCard>
      </div>
    </PageShell>
  );
}

function ManageOrdersPage({ title, subtitle, backPath, backLabel }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [status, setStatus] = useState('CONFIRMED');
  const [statusFilter, setStatusFilter] = useState('');
  const [order, setOrder] = useState(null);

  const loadOrders = async (nextPage = page) => {
    setLoading(true);
    setListError('');
    try {
      const response = await api.get('/orders/manage', {
        params: {
          limit: meta.limit,
          page: nextPage,
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });
      const payload = response.data?.data || {};
      setOrders(payload.items || []);
      setMeta({
        total: payload.total || 0,
        totalPages: payload.totalPages || 1,
        limit: payload.limit || meta.limit,
      });
      setPage(payload.page || nextPage);
    } catch (err) {
      setListError(err.response?.data?.message || 'Không thể tải danh sách đơn hàng.');
      setOrders([]);
      setMeta((prev) => ({ ...prev, total: 0, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadOrders(1);
  }, [statusFilter]);

  const refreshOrderDetail = async () => {
    if (!order?.id) return;
    setListError('');
    try {
      const response = await api.get(`/orders/${order.id}`);
      setOrder(response.data?.data || null);
      setStatus(response.data?.data?.status || 'CONFIRMED');
      await loadOrders(page);
    } catch (err) {
      setListError(err.response?.data?.message || 'Không thể tải chi tiết đơn.');
    }
  };

  const updateStatus = async () => {
    if (!order?.id) return;
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
      await refreshOrderDetail();
      setListError('Cập nhật trạng thái thành công.');
      await loadOrders(page);
    } catch (err) {
      setListError(err.response?.data?.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const viewOrderDetail = async (selectedOrder) => {
    setListError('');
    try {
      const response = await api.get(`/orders/${selectedOrder.id}`);
      const detail = response.data?.data || selectedOrder;
      setOrder(detail);
      setStatus(detail.status || 'CONFIRMED');
    } catch (err) {
      setOrder(selectedOrder);
      setStatus(selectedOrder.status || 'CONFIRMED');
      setListError(err.response?.data?.message || 'Không thể tải chi tiết đơn.');
    }
  };

  const applySearch = () => {
    setPage(1);
    loadOrders(1);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setOrder(null);
    setPage(1);
    setListError('');
    setTimeout(() => loadOrders(1), 0);
  };

  return (
    <PageShell title={title} subtitle={subtitle}>
      {backPath ? (
        <div className="mb-4">
          <Link
            to={backPath}
            className="inline-flex items-center h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em] hover:bg-white/70 transition-colors"
          >
            {backLabel || 'Quay lại'}
          </Link>
        </div>
      ) : null}

      <SectionCard
        title="Danh sách đơn hàng"
        action={<button type="button" onClick={() => loadOrders(page)} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">Refresh</button>}
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Mã đơn, tên buyer, email hoặc SĐT"
            className="h-10 rounded-xl border border-black/10 px-3 bg-white/70"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-black/10 px-3 bg-white/70">
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="SHIPPING">SHIPPING</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <button type="button" onClick={applySearch} className="h-10 px-4 rounded-xl bg-primary text-white text-xs uppercase tracking-[0.12em]">Tìm</button>
          <button type="button" onClick={resetFilters} className="h-10 px-4 rounded-xl border border-black/20 text-xs uppercase tracking-[0.12em]">Reset</button>
        </div>
        {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
        {listError ? <MessageBox type={listError.includes('thành công') ? 'success' : 'error'} text={listError} /> : null}
        {!loading && !listError && orders.length === 0 ? <EmptyState text="Không có đơn hàng phù hợp điều kiện lọc." /> : null}
        {!loading && orders.length > 0 ? (
          <DataTable
            columns={['Mã đơn', 'Buyer', 'Ngày tạo', 'Trạng thái', 'Tổng tiền', 'Thao tác']}
            rows={orders.map((item) => (
              <tr key={item.id} className="border-b border-black/5">
                <td className="py-3 pr-3">{item.id.slice(0, 10)}...</td>
                <td className="py-3 pr-3">{item.buyer?.fullName || '--'}</td>
                <td className="py-3 pr-3">{formatDate(item.createdAt)}</td>
                <td className="py-3 pr-3">{item.status}</td>
                <td className="py-3 pr-3">{currency(item.totalAmount)}</td>
                <td className="py-3 pr-3">
                  <button type="button" onClick={() => viewOrderDetail(item)} className="text-xs uppercase tracking-[0.12em] text-primary hover:text-accent">
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          />
        ) : null}
        {!loading && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between mt-4 gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
              Trang {page}/{meta.totalPages} • Tổng {meta.total} đơn
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => loadOrders(page - 1)}
                className="h-9 px-3 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em] disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => loadOrders(page + 1)}
                className="h-9 px-3 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em] disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <div className="mt-8">
      <SectionCard title="Chi tiết đơn hàng">
        {!order ? (
          <p className="text-text-muted text-sm">Chọn một đơn từ bảng trên và bấm <strong>Xem chi tiết</strong>.</p>
        ) : (
          <div className="mt-4 rounded-xl border border-black/10 bg-white/60 p-4 space-y-3">
            <p><span className="text-text-muted">Mã đơn:</span> {order.id}</p>
            <p><span className="text-text-muted">Buyer:</span> {order.buyer?.fullName || '--'} ({order.buyer?.email || '--'})</p>
            <p><span className="text-text-muted">Trạng thái hiện tại:</span> {order.status}</p>
            <p><span className="text-text-muted">Địa chỉ:</span> {order.shippingAddress || '--'}</p>
            <p><span className="text-text-muted">Số điện thoại:</span> {order.phone || '--'}</p>
            <p><span className="text-text-muted">Tổng tiền:</span> {currency(order.totalAmount)}</p>
            {order.details?.length ? (
              <div className="rounded-xl border border-black/10 bg-white/70 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted mb-2">Sản phẩm trong đơn</p>
                <div className="space-y-2">
                  {order.details.map((detail) => (
                    <div key={detail.id || `${detail.productId}-${detail.quantity}`} className="flex items-center justify-between gap-3 text-sm">
                      <p className="text-primary">{detail.product?.name || detail.productId}</p>
                      <p className="text-text-muted">x{detail.quantity} • {currency(detail.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-black/10 px-3 bg-white/70">
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="SHIPPING">SHIPPING</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button type="button" onClick={updateStatus} className="h-10 px-4 rounded-xl border border-black/20 text-xs uppercase tracking-[0.12em]">Cập nhật trạng thái</button>
            </div>
          </div>
        )}
      </SectionCard>
      </div>
    </PageShell>
  );
}

export function SellerOrdersPage() {
  return (
    <ManageOrdersPage
      title="Đơn hàng Seller"
      subtitle="Xem danh sách đơn hàng thuộc sản phẩm của bạn. Lọc theo mã đơn, buyer hoặc trạng thái."
    />
  );
}

export function SellerKycPage() {
  const [form, setForm] = useState({ shopName: '', description: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const submitKyc = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const data = new FormData();
      data.append('shopName', form.shopName);
      data.append('description', form.description);
      if (file) data.append('kycDocument', file);
      const response = await api.post('/auth/kyc', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(response.data?.message || 'Gửi KYC thành công.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Không thể gửi KYC.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="KYC Seller" subtitle="Gửi hồ sơ xác minh và theo dõi trạng thái duyệt.">
      <SectionCard title="Nộp hồ sơ KYC">
        <form onSubmit={submitKyc} className="space-y-4">
          <input value={form.shopName} onChange={(event) => setForm((prev) => ({ ...prev, shopName: event.target.value }))} placeholder="Tên cửa hàng" className="w-full h-11 rounded-xl border border-black/10 px-4 bg-white/70" required />
          <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Mô tả cửa hàng" className="w-full min-h-28 rounded-xl border border-black/10 px-4 py-3 bg-white/70" />
          <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} className="w-full h-11 rounded-xl border border-black/10 px-3 bg-white/70" />
          <button type="submit" disabled={saving} className="h-11 px-5 rounded-xl bg-primary text-white text-xs uppercase tracking-[0.14em] disabled:opacity-60">{saving ? 'Đang gửi...' : 'Gửi KYC'}</button>
        </form>
        <MessageBox type={message.includes('thành công') ? 'success' : 'info'} text={message} />
      </SectionCard>
    </PageShell>
  );
}

export function StaffDashboardPage() {
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [productsRes, reviewsRes, ordersRes, sellersRes] = await Promise.all([
          api.get('/products', { params: { limit: 100 } }),
          api.get('/reviews', { params: { limit: 100 } }),
          api.get('/orders/manage', { params: { limit: 20, page: 1 } }),
          api.get('/admin/users', { params: { role: 'SELLER', limit: 100 } }),
        ]);

        if (cancelled) return;
        setProducts(productsRes.data?.data?.items || []);
        setReviews(reviewsRes.data?.data?.items || []);
        setOrders(ordersRes.data?.data?.items || []);
        setSellers(sellersRes.data?.data?.items || []);
      } catch {
        if (cancelled) return;
        setProducts([]);
        setReviews([]);
        setOrders([]);
        setSellers([]);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const pendingKyc = useMemo(() => sellers.filter((item) => (item.sellerProfile?.kycStatus || 'PENDING') === 'PENDING').length, [sellers]);
  const lowStock = useMemo(() => products.filter((item) => Number(item.stock || 0) < 5).length, [products]);
  const pendingOrders = useMemo(() => orders.filter((item) => item.status === 'PENDING').length, [orders]);
  const flaggedReviews = useMemo(() => reviews.filter((item) => Number(item.rating || 0) <= 2).length, [reviews]);
  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5), [orders]);

  return (
    <PageShell title="Staff Dashboard" subtitle="Vận hành hệ thống: khách hàng, seller, sản phẩm, phản hồi và đơn hàng.">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="KYC chờ duyệt" value={pendingKyc} icon={ShieldCheck} accentColor="#8B5CF6" />
        <StatCard label="Đơn chờ xử lý" value={pendingOrders} icon={Clock3} accentColor="#8B5CF6" />
        <StatCard label="Review cần chú ý" value={flaggedReviews} icon={Star} accentColor="#8B5CF6" />
        <StatCard label="SP sắp hết hàng" value={lowStock} icon={PackageSearch} accentColor="#8B5CF6" />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard title="Queue cảnh báo">
          <div className="space-y-2 text-sm text-text-muted">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> {pendingKyc} hồ sơ KYC đang chờ</p>
            <p className="flex items-center gap-2"><Bell size={16} className="text-violet-600" /> {flaggedReviews} review điểm thấp cần kiểm tra</p>
            <p className="flex items-center gap-2"><ClipboardList size={16} className="text-blue-600" /> {pendingOrders} đơn cần can thiệp</p>
          </div>
        </SectionCard>

        <SectionCard title="Đơn mới nhất">
          <div className="space-y-2">
            {recentOrders.length === 0 ? <EmptyState text="Không có đơn mới." /> : recentOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="text-primary">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-text-muted">{formatDate(order.createdAt)}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.08em] text-text-muted">{order.status || '--'}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top danh mục xử lý">
          <div className="space-y-2 text-sm text-text-muted">
            <p className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2"><span>Seller</span><span>{sellers.length}</span></p>
            <p className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2"><span>Sản phẩm</span><span>{products.length}</span></p>
            <p className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2"><span>Reviews</span><span>{reviews.length}</span></p>
          </div>
        </SectionCard>
      </div>

    </PageShell>
  );
}

function UsersListPage({ title, subtitle, roleFilter }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/users', { params: { role: roleFilter, limit: 100 } });
      setUsers(response.data?.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn xóa người dùng này? Hành động không thể hoàn tác.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa người dùng.');
    }
  };

  const columns = useMemo(() => {
    const base = ['Họ tên', 'Email', 'SĐT', 'Role', 'KYC'];
    if (user?.role === 'ADMIN') base.push('Thao tác');
    return base;
  }, [user?.role]);

  return (
    <PageShell title={title} subtitle={subtitle}>
      <SectionCard title="Danh sách người dùng" action={<button type="button" onClick={loadUsers} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">Refresh</button>}>
        {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
        {error ? <MessageBox type="error" text={error} /> : null}
        {!loading && !error && users.length === 0 ? <EmptyState text="Không có dữ liệu người dùng." /> : null}
        {!loading && !error && users.length > 0 ? (
          <DataTable
            columns={columns}
            rows={users.map((item) => (
              <tr key={item.id} className="border-b border-black/5">
                <td className="py-3 pr-3">{item.fullName}</td>
                <td className="py-3 pr-3">{item.email}</td>
                <td className="py-3 pr-3">{item.phone || '--'}</td>
                <td className="py-3 pr-3">{item.role}</td>
                <td className="py-3 pr-3">{item.sellerProfile?.kycStatus || '--'}</td>
                {user?.role === 'ADMIN' ? (
                  <td className="py-3 pr-3">
                    {item.id !== user?.id ? (
                      <button type="button" onClick={() => handleDeleteUser(item.id)} className="text-red-600 hover:text-red-700 text-xs uppercase tracking-widest">Xóa</button>
                    ) : (
                      <span className="text-text-muted text-xs">--</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          />
        ) : null}
      </SectionCard>
    </PageShell>
  );
}

export function StaffCustomersPage() {
  return <UsersListPage title="Manage Customer" subtitle="Theo dõi danh sách khách hàng BUYER." roleFilter="BUYER" />;
}

export function StaffSellersPage() {
  return <UsersListPage title="Manage Seller" subtitle="Theo dõi danh sách SELLER và trạng thái KYC." roleFilter="SELLER" />;
}

export function StaffProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/products', { params: { limit: 100 } });
      setProducts(response.data?.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa sản phẩm.');
    }
  };

  return (
    <PageShell title="Manage Products" subtitle="Quản lý toàn bộ sản phẩm active trên hệ thống.">
      <SectionCard title="Danh sách sản phẩm" action={<button type="button" onClick={loadProducts} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">Refresh</button>}>
        {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
        {error ? <MessageBox type="error" text={error} /> : null}
        {!loading && !error && products.length === 0 ? <EmptyState text="Không có sản phẩm." /> : null}
        {!loading && !error && products.length > 0 ? (
          <DataTable
            columns={['Tên', 'Seller', 'Giá', 'Kho', 'Thao tác']}
            rows={products.map((item) => (
              <tr key={item.id} className="border-b border-black/5">
                <td className="py-3 pr-3">{item.name}</td>
                <td className="py-3 pr-3">{item.seller?.fullName || '--'}</td>
                <td className="py-3 pr-3">{currency(item.salePrice ?? item.price)}</td>
                <td className="py-3 pr-3">{item.stock}</td>
                <td className="py-3 pr-3"><button type="button" onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700 text-xs uppercase tracking-widest">Xóa</button></td>
              </tr>
            ))}
          />
        ) : null}
      </SectionCard>
    </PageShell>
  );
}

export function StaffReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/reviews', { params: { limit: 100 } });
      setReviews(response.data?.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reviews/${id}`);
      await loadReviews();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa đánh giá.');
    }
  };

  return (
    <PageShell title="Manage Feedback" subtitle="Quản lý review và phản hồi từ khách hàng.">
      <SectionCard title="Danh sách đánh giá" action={<button type="button" onClick={loadReviews} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">Refresh</button>}>
        {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
        {error ? <MessageBox type="error" text={error} /> : null}
        {!loading && !error && reviews.length === 0 ? <EmptyState text="Không có review." /> : null}
        {!loading && !error && reviews.length > 0 ? (
          <DataTable
            columns={['User', 'Product', 'Rating', 'Comment', 'Thao tác']}
            rows={reviews.map((item) => (
              <tr key={item.id} className="border-b border-black/5">
                <td className="py-3 pr-3">{item.user?.fullName || '--'}</td>
                <td className="py-3 pr-3">{item.product?.name || '--'}</td>
                <td className="py-3 pr-3">{item.rating}/5</td>
                <td className="py-3 pr-3">{item.comment || '--'}</td>
                <td className="py-3 pr-3"><button type="button" onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700 text-xs uppercase tracking-widest">Xóa</button></td>
              </tr>
            ))}
          />
        ) : null}
      </SectionCard>
    </PageShell>
  );
}

export function StaffOrdersPage() {
  return (
    <ManageOrdersPage
      title="Manage Orders"
      subtitle="Xem đầy đủ danh sách đơn hàng, lọc theo mã đơn, buyer hoặc trạng thái."
    />
  );
}

export function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, p, r, o] = await Promise.all([
          api.get('/admin/users', { params: { limit: 100 } }),
          api.get('/products', { params: { limit: 100 } }),
          api.get('/reviews', { params: { limit: 100 } }),
          api.get('/orders/manage', { params: { limit: 50, page: 1 } }),
        ]);
        setUsers(u.data?.data?.items || []);
        setProducts(p.data?.data?.items || []);
        setReviews(r.data?.data?.items || []);
        setOrders(o.data?.data?.items || []);
      } catch {
        setUsers([]);
        setProducts([]);
        setReviews([]);
        setOrders([]);
      }
    };
    load();
  }, []);

  const pendingKyc = useMemo(() => users.filter((item) => item.sellerProfile?.kycStatus === 'PENDING').length, [users]);
  const activeUsers = useMemo(() => users.filter((item) => ['BUYER', 'SELLER'].includes(item.role)).length, [users]);
  const totalRevenue = useMemo(() => orders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0), [orders]);
  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6), [orders]);
  const topCategories = useMemo(() => {
    const bucket = new Map();

    products.forEach((product) => {
      const key = product.category?.name || 'Khác';
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });

    return Array.from(bucket.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [products]);

  return (
    <PageShell title="Admin Dashboard" subtitle="Bảng tổng quan số liệu chính của hệ thống.">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Users" value={activeUsers} icon={Users} accentColor="#F59E0B" />
        <StatCard label="Tổng đơn" value={orders.length} icon={ShoppingBag} accentColor="#F59E0B" />
        <StatCard label="Doanh thu" value={currency(totalRevenue)} icon={ChartColumn} accentColor="#F59E0B" />
        <StatCard label="KYC Pending" value={pendingKyc} icon={ShieldCheck} accentColor="#F59E0B" />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard title="Cảnh báo hệ thống">
          <div className="space-y-2 text-sm text-text-muted">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> {pendingKyc} hồ sơ KYC cần duyệt</p>
            <p className="flex items-center gap-2"><Bell size={16} className="text-blue-600" /> {reviews.length} phản hồi cần theo dõi chất lượng</p>
            <p className="flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Theo dõi báo cáo để tối ưu chuyển đổi</p>
          </div>
        </SectionCard>

        <SectionCard title="Hoạt động mới nhất">
          <div className="space-y-2">
            {recentOrders.length === 0 ? <EmptyState text="Chưa có hoạt động đơn hàng." /> : recentOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="text-primary">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-text-muted">{currency(order.totalAmount || 0)}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.08em] text-text-muted">{order.status || '--'}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top danh mục">
          <div className="space-y-2">
            {topCategories.length === 0 ? <EmptyState text="Chưa có dữ liệu danh mục." /> : topCategories.map((item) => (
              <div key={item.name} className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 flex items-center justify-between">
                <p className="text-sm text-primary truncate">{item.name}</p>
                <span className="text-xs text-text-muted">{item.count} SP</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

    </PageShell>
  );
}


export function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/admin/users', { params: { limit: 100 } });
      setUsers(response.data?.data?.items || []);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Không thể tải danh sách users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (userId, nextRole) => {
    setMessage('');
    try {
      await api.patch(`/admin/users/${userId}`, { role: nextRole });
      setMessage('Cập nhật role thành công.');
      await loadUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Không thể cập nhật role.');
    }
  };

  return (
    <PageShell title="User Management" subtitle="Quản lý tài khoản và phân quyền hệ thống.">
      <SectionCard title="Danh sách người dùng" action={<button type="button" onClick={loadUsers} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">Refresh</button>}>
        {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
        {message ? <MessageBox type={message.includes('thành công') ? 'success' : 'error'} text={message} /> : null}
        {!loading && users.length > 0 ? (
          <DataTable
            columns={['Họ tên', 'Email', 'Role', 'Đổi role']}
            rows={users.map((item) => (
              <tr key={item.id} className="border-b border-black/5">
                <td className="py-3 pr-3">{item.fullName}</td>
                <td className="py-3 pr-3">{item.email}</td>
                <td className="py-3 pr-3">{item.role}</td>
                <td className="py-3 pr-3">
                  <select
                    value={item.role}
                    onChange={(event) => updateRole(item.id, event.target.value)}
                    className="h-9 rounded-xl border border-black/10 px-3 bg-white/70"
                  >
                    <option value="BUYER">BUYER</option>
                    <option value="SELLER">SELLER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
              </tr>
            ))}
          />
        ) : null}
      </SectionCard>
    </PageShell>
  );
}

const REPORT_TYPES = [
  { id: 'sales', label: 'Doanh số / Đơn hàng' },
  { id: 'users', label: 'Người dùng' },
  { id: 'products', label: 'Sản phẩm' },
  { id: 'reviews', label: 'Đánh giá' },
];

export function AdminReportsPage() {
  const [reportType, setReportType] = useState('sales');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState(null);
  const [detail, setDetail] = useState({ items: [], total: 0, page: 1, totalPages: 0 });
  const [showDetail, setShowDetail] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [message, setMessage] = useState('');

  const filters = { fromDate: fromDate || undefined, toDate: toDate || undefined, status: status || undefined };

  const loadSummary = async () => {
    setLoadingSummary(true);
    setMessage('');
    try {
      const res = await api.get('/admin/reports/summary', { params: { type: reportType, ...filters } });
      setSummary(res.data?.data ?? null);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Không tải được tổng quan.');
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadDetail = async (page = 1) => {
    setLoadingDetail(true);
    setMessage('');
    try {
      const res = await api.get('/admin/reports/detail', {
        params: { type: reportType, ...filters, page, limit: 20 },
      });
      setDetail(res.data?.data ?? { items: [], total: 0, page: 1, totalPages: 0 });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Không tải được chi tiết.');
      setDetail({ items: [], total: 0, page: 1, totalPages: 0 });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [reportType, fromDate, toDate, status]);

  useEffect(() => {
    if (showDetail) loadDetail(1);
  }, [showDetail, reportType, fromDate, toDate, status]);

  const handleApplyFilter = () => {
    loadSummary();
    if (showDetail) loadDetail(1);
  };

  const downloadExport = async (format) => {
    const params = new URLSearchParams({ type: reportType });
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (status) params.set('status', status);
    try {
      const res = await api.get(`/admin/reports/export/${format}?${params.toString()}`, { responseType: 'blob' });
      if (res.status !== 200) {
        const text = await (res.data instanceof Blob ? res.data.text() : Promise.resolve(String(res.data)));
        let msg = `Không tải được file ${format}.`;
        try {
          const json = JSON.parse(text);
          if (json.message) msg = json.message;
        } catch (_) {}
        setMessage(msg);
        return;
      }
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportType}-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      let msg = `Không tải được file ${format}.`;
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const json = JSON.parse(text);
          if (json.message) msg = json.message;
        } catch (_) {}
      } else if (data?.message) {
        msg = data.message;
      }
      setMessage(msg);
    }
  };

  return (
    <PageShell title="Reports" subtitle="Báo cáo tổng hợp và xuất file PDF/Excel.">
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-[#7f786f] mb-4">Chọn loại báo cáo</h2>
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setReportType(t.id); setShowDetail(false); }}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.12em] transition-colors ${reportType === t.id ? 'bg-primary text-white' : 'border border-black/15 hover:bg-white/80'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-[#7f786f] mb-4">Bộ lọc</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-black/15 bg-white/70"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-black/15 bg-white/70"
            />
          </div>
          {reportType === 'sales' && (
            <div>
              <label className="block text-xs text-text-muted mb-1">Trạng thái đơn</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-black/15 bg-white/70"
              >
                <option value="">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="SHIPPING">SHIPPING</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={handleApplyFilter}
            className="h-10 px-4 rounded-full bg-primary text-white text-xs uppercase tracking-[0.12em] hover:opacity-90"
          >
            Áp dụng
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-[#7f786f] mb-4">Tổng quan</h2>
        {loadingSummary && <p className="text-text-muted text-sm">Đang tải...</p>}
        {!loadingSummary && summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label={reportType === 'sales' ? 'Số đơn' : 'Số bản ghi'} value={summary.count ?? 0} />
            {reportType === 'sales' && summary.totalAmount != null && (
              <StatCard label="Tổng doanh thu (đ)" value={new Intl.NumberFormat('vi-VN').format(summary.totalAmount)} />
            )}
          </div>
        )}
        {message && <MessageBox type="error" text={message} />}
      </div>

      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-[#7f786f]">Xem chi tiết báo cáo</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetail(!showDetail)}
              className="px-4 py-2 rounded-full border border-black/15 text-xs uppercase tracking-[0.12em] hover:bg-white/80"
            >
              {showDetail ? 'Ẩn bảng chi tiết' : 'Hiện bảng chi tiết'}
            </button>
            <button
              type="button"
              onClick={() => downloadExport('excel')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs uppercase tracking-[0.12em] hover:opacity-90"
            >
              Tải Excel
            </button>
            <button
              type="button"
              onClick={() => downloadExport('pdf')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-xs uppercase tracking-[0.12em] hover:opacity-90"
            >
              Tải PDF
            </button>
          </div>
        </div>
        {showDetail && (
          <>
            {loadingDetail && <p className="text-text-muted text-sm">Đang tải chi tiết...</p>}
            {!loadingDetail && detail.items.length === 0 && <EmptyState text="Không có dữ liệu chi tiết." />}
            {!loadingDetail && detail.items.length > 0 && (
              <div className="overflow-x-auto">
                {reportType === 'sales' && (
                  <DataTable
                    columns={['STT', 'Người mua', 'Email', 'Tổng tiền', 'Trạng thái', 'Ngày tạo']}
                    rows={detail.items.map((row, index) => (
                      <tr key={row.id} className="border-b border-black/5">
                        <td className="py-2 pr-3 text-center tabular-nums">{index + 1 + (detail.page - 1) * 20}</td>
                        <td className="py-2 pr-3">{row.buyerName}</td>
                        <td className="py-2 pr-3 text-sm">{row.buyerEmail}</td>
                        <td className="py-2 pr-3">{currency(row.totalAmount)}</td>
                        <td className="py-2 pr-3">{row.status}</td>
                        <td className="py-2 pr-3">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  />
                )}
                {reportType === 'users' && (
                  <DataTable
                    columns={['STT', 'Email', 'Họ tên', 'Điện thoại', 'Role', 'Cửa hàng', 'KYC', 'Ngày tạo']}
                    rows={detail.items.map((row, index) => (
                      <tr key={row.id} className="border-b border-black/5">
                        <td className="py-2 pr-3 text-center tabular-nums">{index + 1 + (detail.page - 1) * 20}</td>
                        <td className="py-2 pr-3">{row.email}</td>
                        <td className="py-2 pr-3">{row.fullName}</td>
                        <td className="py-2 pr-3">{row.phone}</td>
                        <td className="py-2 pr-3">{row.role}</td>
                        <td className="py-2 pr-3">{row.shopName || '--'}</td>
                        <td className="py-2 pr-3">{row.kycStatus || '--'}</td>
                        <td className="py-2 pr-3">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  />
                )}
                {reportType === 'products' && (
                  <DataTable
                    columns={['STT', 'Tên', 'Slug', 'Giá', 'Sale', 'Tồn kho', 'Active', 'Ngày tạo']}
                    rows={detail.items.map((row, index) => (
                      <tr key={row.id} className="border-b border-black/5">
                        <td className="py-2 pr-3 text-center tabular-nums">{index + 1 + (detail.page - 1) * 20}</td>
                        <td className="py-2 pr-3">{row.name}</td>
                        <td className="py-2 pr-3 text-xs">{row.slug}</td>
                        <td className="py-2 pr-3">{currency(row.price)}</td>
                        <td className="py-2 pr-3">{row.salePrice != null ? currency(row.salePrice) : '--'}</td>
                        <td className="py-2 pr-3">{row.stock}</td>
                        <td className="py-2 pr-3">{row.isActive ? 'Có' : 'Không'}</td>
                        <td className="py-2 pr-3">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  />
                )}
                {reportType === 'reviews' && (
                  <DataTable
                    columns={['STT', 'Điểm', 'Bình luận', 'Người đánh giá', 'Sản phẩm', 'Ngày tạo']}
                    rows={detail.items.map((row, index) => (
                      <tr key={row.id} className="border-b border-black/5">
                        <td className="py-2 pr-3 text-center tabular-nums">{index + 1 + (detail.page - 1) * 20}</td>
                        <td className="py-2 pr-3">{row.rating}</td>
                        <td className="py-2 pr-3 max-w-50 truncate">{row.comment || '--'}</td>
                        <td className="py-2 pr-3">{row.userName}</td>
                        <td className="py-2 pr-3">{row.productName}</td>
                        <td className="py-2 pr-3">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

export function AdminKycPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadSellers = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/users', {
        params: {
          role: 'SELLER',
          page: nextPage,
          limit: meta.limit,
          search: search || undefined,
        },
      });
      const payload = response.data?.data || {};
      let items = payload.items || [];
      if (statusFilter) {
        items = items.filter(u => (u.sellerProfile?.kycStatus || 'PENDING') === statusFilter);
      }
      setUsers(items);
      setMeta({
        total: payload.total || 0,
        totalPages: payload.totalPages || 1,
        limit: payload.limit || meta.limit,
      });
      setPage(payload.page || nextPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách seller.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadSellers(1);
  }, [statusFilter]);

  const applySearch = () => {
    setPage(1);
    loadSellers(1);
  };

  const updateKycStatus = async (userId, newStatus) => {
    if (!window.confirm(`Xác nhận chuyển KYC sang ${newStatus}?`)) return;
    try {
      await api.patch(`/admin/users/${userId}`, {
        sellerProfile: { kycStatus: newStatus },
      });
      await loadSellers(page);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật KYC');
    }
  };

  const { user: currentUser } = useAuth();
  const handleDeleteSeller = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn xóa seller này? Hành động không thể hoàn tác.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      await loadSellers(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa seller.');
    }
  };

  return (
    <PageShell title="Duyệt KYC Seller" subtitle="Xem và phê duyệt hồ sơ bán hàng của Seller.">
      <SectionCard
        title="Danh sách Seller"
        action={
          <button type="button" onClick={() => loadSellers(page)} className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em]">
            Refresh
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Tìm theo email, tên, SĐT"
            className="flex-1 min-w-50 h-10 px-4 rounded-xl border border-black/10 bg-white/70"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-xl border border-black/10 bg-white/70">
            <option value="">Tất cả trạng thái KYC</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <button type="button" onClick={applySearch} className="h-10 px-5 rounded-xl bg-primary text-white text-xs uppercase tracking-[0.12em]">
            Tìm
          </button>
        </div>

        {loading ? <EmptyState text="Đang tải dữ liệu..." /> : null}
        {error ? <MessageBox type="error" text={error} /> : null}
        {!loading && !error && users.length === 0 ? <EmptyState text="Không có seller nào phù hợp." /> : null}
        
        {!loading && users.length > 0 ? (
          <DataTable
            columns={['Email', 'Họ tên', 'Trạng thái KYC', 'Tên Shop', 'Thao tác']}
            rows={users.map((u) => {
              const kyc = u.sellerProfile?.kycStatus || 'PENDING';
              return (
                <tr key={u.id} className="border-b border-black/5">
                  <td className="py-3 pr-3">{u.email}</td>
                  <td className="py-3 pr-3">{u.fullName}</td>
                  <td className="py-3 pr-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                      kyc === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      kyc === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {kyc}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-sm">{u.sellerProfile?.shopName || '--'}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {kyc !== 'APPROVED' && (
                        <button type="button" onClick={() => updateKycStatus(u.id, 'APPROVED')} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700">Duyệt</button>
                      )}
                      {kyc !== 'REJECTED' && (
                        <button type="button" onClick={() => updateKycStatus(u.id, 'REJECTED')} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">Từ chối</button>
                      )}
                      {currentUser?.role === 'ADMIN' && u.id !== currentUser?.id && (
                        <button type="button" onClick={() => handleDeleteSeller(u.id)} className="px-3 py-1 border border-red-600 text-red-600 rounded-lg text-xs hover:bg-red-50">Xóa</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          />
        ) : null}
      </SectionCard>
    </PageShell>
  );
}

export function AdminSystemPage() {
  return (
    <PageShell title="Manage System" subtitle="Tổng quan kỹ thuật và trạng thái module quản trị.">
      <SectionCard title="System notes">
        <div className="space-y-2 text-sm text-text-muted">
          <p>- Frontend đã có guard theo role và giữ phiên đăng nhập qua /auth/me.</p>
          <p>- Module Staff/Admin đã kết nối API users/products/reviews.</p>
          <p>- Quản lý order tổng hiện chưa có endpoint list-all từ backend, đang hỗ trợ tra cứu theo order ID.</p>
        </div>
      </SectionCard>
    </PageShell>
  );
}

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ fullName: '', phone: '', avatar: '' });
  const needProfileCompletion = location.state?.reason === 'complete-profile';
  const redirectFrom = location.state?.from;

  useEffect(() => {
    setForm({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
    });
  }, [user?.fullName, user?.phone, user?.avatar]);

  const syncProfile = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/auth/me');
      const nextUser = response.data?.data || null;
      setUser(nextUser);
      if (nextUser) localStorage.setItem('currentUser', JSON.stringify(nextUser));
      setMessage('Đã đồng bộ thông tin tài khoản mới nhất.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Không thể đồng bộ thông tin tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await api.put('/auth/me', {
        fullName: form.fullName,
        phone: form.phone,
        avatar: form.avatar || null,
      });
      const nextUser = response.data?.data || null;
      setUser(nextUser);
      if (nextUser) localStorage.setItem('currentUser', JSON.stringify(nextUser));
      setMessage('Cập nhật thông tin cá nhân thành công.');

      const targetPath = needProfileCompletion && redirectFrom && redirectFrom !== '/settings'
        ? redirectFrom
        : getRoleHomePath(nextUser?.role);

      setTimeout(() => {
        navigate(targetPath || '/', { replace: true });
      }, 450);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Không thể lưu thông tin cá nhân.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Cài đặt" subtitle="Quản lý tài khoản và thông tin cá nhân của bạn.">
      {needProfileCompletion ? (
        <div className="mb-6">
          <MessageBox type="info" text={`Bạn cần cập nhật đầy đủ thông tin cá nhân để tiếp tục sử dụng hệ thống.${redirectFrom ? ` Trang trước đó: ${redirectFrom}` : ''}`} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Role" value={user?.role || '--'} icon={ShieldCheck} accentColor="#6b6b6b" />
        <StatCard label="KYC" value={user?.sellerProfile?.kycStatus || '--'} icon={BadgeCheck} accentColor="#6b6b6b" />
        <StatCard label="Shop" value={user?.sellerProfile?.shopName || '--'} icon={Package} accentColor="#6b6b6b" />
        <StatCard label="Account" value={user?.email ? 'Đang hoạt động' : '--'} icon={Settings} accentColor="#6b6b6b" />
      </div>

      <SectionCard
        title="Thông tin cá nhân"
        action={(
          <button
            type="button"
            onClick={syncProfile}
            disabled={loading}
            className="h-9 px-4 rounded-full border border-black/20 text-xs uppercase tracking-[0.12em] inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang đồng bộ' : 'Đồng bộ'}
          </button>
        )}
      >
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted mb-4">
          Để tiếp tục sử dụng các tính năng có đăng nhập, vui lòng điền đầy đủ họ tên và số điện thoại.
        </p>

        <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-black/10 bg-white/60 p-4">
            <label className="text-text-muted flex items-center gap-2"><UserCircle size={15} /> Họ và tên *</label>
            <input
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="mt-2 w-full h-10 rounded-xl border border-black/10 px-3 bg-white/80"
              placeholder="Nhập họ và tên"
              required
            />
          </div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-4">
            <label className="text-text-muted flex items-center gap-2"><Mail size={15} /> Email</label>
            <input
              value={user?.email || ''}
              className="mt-2 w-full h-10 rounded-xl border border-black/10 px-3 bg-white/70 text-text-muted"
              disabled
            />
          </div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-4">
            <label className="text-text-muted flex items-center gap-2"><Phone size={15} /> Số điện thoại *</label>
            <input
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="mt-2 w-full h-10 rounded-xl border border-black/10 px-3 bg-white/80"
              placeholder="Nhập số điện thoại"
              required
            />
          </div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-4">
            <label className="text-text-muted flex items-center gap-2"><AtSign size={15} /> Ảnh đại diện URL</label>
            <input
              value={form.avatar}
              onChange={(event) => setForm((prev) => ({ ...prev, avatar: event.target.value }))}
              className="mt-2 w-full h-10 rounded-xl border border-black/10 px-3 bg-white/80"
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <p className="text-xs text-text-muted">User ID: <span className="text-primary break-all">{user?.id || '--'}</span></p>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-xl bg-primary text-white text-xs uppercase tracking-[0.12em] disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </form>

        {message ? (
          <div className="mt-4">
            <MessageBox type={message.includes('thành công') || message.includes('Đã đồng bộ') ? 'success' : 'error'} text={message} />
          </div>
        ) : null}
      </SectionCard>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Trạng thái bảo mật tài khoản">
          <div className="space-y-2 text-sm text-text-muted">
            <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Phiên đăng nhập được bảo vệ bằng token.</p>
            <p className="flex items-center gap-2"><Bell size={16} className="text-blue-600" /> Khuyến nghị cập nhật đầy đủ số điện thoại để nhận thông báo đơn hàng.</p>
          </div>
        </SectionCard>

        <SectionCard title="Thông tin seller (nếu có)">
          {user?.role === 'SELLER' || user?.sellerProfile ? (
            <div className="space-y-2 text-sm text-text-muted">
              <p className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2"><span>Tên shop</span><span className="text-primary">{user?.sellerProfile?.shopName || '--'}</span></p>
              <p className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2"><span>Trạng thái KYC</span><span className="text-primary">{user?.sellerProfile?.kycStatus || '--'}</span></p>
              <p className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">{user?.sellerProfile?.description || 'Chưa có mô tả cửa hàng.'}</p>
            </div>
          ) : (
            <EmptyState text="Tài khoản hiện tại không có hồ sơ seller." />
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-xl mx-auto glass-strong rounded-3xl p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">403</p>
        <h1 className="font-serif text-4xl mt-2">Không có quyền truy cập</h1>
        <p className="text-text-muted mt-4">Bạn không có quyền truy cập vào trang này theo role hiện tại.</p>
        <Link to="/" className="inline-flex items-center justify-center mt-6 h-11 px-6 rounded-full bg-primary text-white text-xs uppercase tracking-[0.16em]">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
