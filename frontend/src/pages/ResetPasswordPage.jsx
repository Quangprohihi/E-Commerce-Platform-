import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);
  const email = useMemo(() => (searchParams.get('email') || '').trim(), [searchParams]);
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canSubmit = Boolean(token || email);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!canSubmit) {
      setError('Không tìm thấy thông tin đặt lại mật khẩu.');
      return;
    }
    if (!form.newPassword || form.newPassword.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token: token || undefined,
        email: token ? undefined : email,
        newPassword: form.newPassword,
      });
      setSuccess('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.');
      setForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f] mb-2">KÍNH TỐT</p>
        <h1 className="font-serif text-3xl mb-2">Đặt lại mật khẩu</h1>
        <p className="text-sm text-text-muted mb-6">
          Vui lòng nhập mật khẩu mới để hoàn tất.
        </p>

        {!canSubmit ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600">Không tìm thấy thông tin đặt lại mật khẩu.</p>
            <Link to="/forgot-password" className="text-primary hover:underline text-sm">
              Quay lại quên mật khẩu
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="newPassword">
                Mật khẩu mới
              </label>
              <input
                id="newPassword"
                type="password"
                value={form.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                className="w-full h-11 rounded-full px-4 border border-black/10 bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="********"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="confirmPassword">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className="w-full h-11 rounded-full px-4 border border-black/10 bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="********"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-primary text-white text-xs uppercase tracking-[0.16em] hover:bg-primary-soft transition-colors disabled:opacity-60"
            >
              {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        )}

        <p className="mt-5 text-sm text-text-muted">
          Quay lại{' '}
          <Link to="/login" className="text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
