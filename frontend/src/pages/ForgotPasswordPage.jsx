import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

function getStoredAccountEmail() {
  try {
    const raw = localStorage.getItem('currentUser');
    const parsed = raw ? JSON.parse(raw) : null;
    return typeof parsed?.email === 'string' ? parsed.email.trim() : '';
  } catch {
    return '';
  }
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultEmail = useMemo(() => {
    const queryEmail = (searchParams.get('email') || '').trim();
    if (queryEmail) return queryEmail;
    return getStoredAccountEmail();
  }, [searchParams]);

  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const normalizedEmail = email.trim();
    try {
      const response = await api.post('/auth/forgot-password', {
        email: normalizedEmail,
      });
      const message = response.data?.message || 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';
      setSuccess(message);

      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(normalizedEmail)}`);
      }, 500);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f] mb-2">KÍNH TỐT</p>
        <h1 className="font-serif text-3xl mb-2">Quên mật khẩu</h1>
        <p className="text-sm text-text-muted mb-6">
          Nhập email đã đăng ký để tiếp tục đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-full px-4 border border-black/10 bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
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
            {loading ? 'Đang xử lý...' : 'Tiếp tục'}
          </button>
        </form>

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
