import { useEffect, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useGhnAddressCascade } from '../hooks/useGhnAddressCascade';

function MessageBox({ type = 'info', text }) {
  if (!text) return null;
  const style =
    type === 'error'
      ? 'text-red-700 bg-red-50 border-red-200'
      : type === 'success'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : 'text-primary bg-white/70 border-black/10';
  return <p className={`text-sm border rounded-xl px-3 py-2 ${style}`}>{text}</p>;
}

export default function SellerWarehousePage() {
  const { user, setUser } = useAuth();
  const [meLoading, setMeLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    provinces,
    districts,
    wards,
    provinceId,
    districtId,
    wardCode,
    setWardCode,
    addrLoading,
    addrError,
    setAddrError,
    handleProvinceChange,
    handleDistrictChange,
    applySavedProfile,
  } = useGhnAddressCascade({ enabled: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        const res = await api.get('/auth/me');
        if (!cancelled) setProfile(res.data?.data || null);
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setError(err.response?.data?.message || 'Không tải được thông tin tài khoản.');
        }
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (meLoading || addrLoading.provinces || provinces.length === 0) return;
    applySavedProfile(profile?.sellerProfile);
  }, [meLoading, addrLoading.provinces, provinces.length, profile, applySavedProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!provinceId || !districtId || !wardCode) {
      setError('Vui lòng chọn đủ Tỉnh, Quận/Huyện và Phường/Xã (GHN).');
      return;
    }
    setSaving(true);
    try {
      await api.put('/seller/profile/address', {
        provinceId: Number(provinceId),
        districtId: Number(districtId),
        wardCode,
      });
      const meRes = await api.get('/auth/me');
      const next = meRes.data?.data || null;
      if (next) {
        setUser(next);
        localStorage.setItem('currentUser', JSON.stringify(next));
        setProfile(next);
      }
      setSuccessMsg('Đã lưu địa chỉ kho. Phí ship cho buyer sẽ tính từ điểm lấy hàng này.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không lưu được địa chỉ kho.');
    } finally {
      setSaving(false);
    }
  };

  const noSellerProfile = !meLoading && profile && !profile.sellerProfile;

  return (
    <DashboardLayout title="Địa chỉ kho hàng" subtitle="Điểm lấy hàng GHN — dùng khi tính phí vận chuyển cho đơn của shop bạn.">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
          Xin chào {user?.fullName || 'bạn'}
        </p>
        <h1 className="font-serif text-3xl md:text-5xl text-primary mt-2">Địa chỉ kho (GHN)</h1>
        <p className="text-text-muted mt-3">
          Chọn Tỉnh / Quận / Phường trùng với kho lấy hàng trên GHN. Dữ liệu lấy từ API GHN giống trang thanh toán.
        </p>

        <div className="mt-6 space-y-4">
          {error ? <MessageBox type="error" text={error} /> : null}
          {successMsg ? <MessageBox type="success" text={successMsg} /> : null}
          {addrError ? <MessageBox type="error" text={addrError} /> : null}

          {noSellerProfile ? (
            <MessageBox
              type="error"
              text="Tài khoản chưa có hồ sơ seller. Hoàn tất đăng ký / KYC trước khi lưu địa chỉ kho."
            />
          ) : null}

          {meLoading ? (
            <p className="text-sm text-text-muted">Đang tải hồ sơ...</p>
          ) : (
            <form onSubmit={handleSubmit} className="glass-strong rounded-3xl p-6 max-w-xl space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-text-muted mb-2" htmlFor="whProvince">
                  Tỉnh / Thành phố (GHN) *
                </label>
                <select
                  id="whProvince"
                  value={provinceId}
                  onChange={(e) => {
                    setAddrError('');
                    handleProvinceChange(e.target.value);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70"
                  disabled={addrLoading.provinces || noSellerProfile}
                  required
                >
                  <option value="">— Chọn tỉnh/thành —</option>
                  {provinces.map((p) => (
                    <option key={p.provinceId} value={String(p.provinceId)}>
                      {p.name}
                      {p.code ? ` (${p.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-text-muted mb-2" htmlFor="whDistrict">
                  Quận / Huyện (GHN) *
                </label>
                <select
                  id="whDistrict"
                  value={districtId}
                  onChange={(e) => {
                    setAddrError('');
                    handleDistrictChange(e.target.value);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70"
                  disabled={!provinceId || addrLoading.districts || noSellerProfile}
                  required
                >
                  <option value="">— Chọn quận/huyện —</option>
                  {districts.map((d) => (
                    <option key={d.districtId} value={String(d.districtId)}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-text-muted mb-2" htmlFor="whWard">
                  Phường / Xã (GHN) *
                </label>
                <select
                  id="whWard"
                  value={wardCode}
                  onChange={(e) => {
                    setAddrError('');
                    setWardCode(e.target.value);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70"
                  disabled={!districtId || addrLoading.wards || noSellerProfile}
                  required
                >
                  <option value="">— Chọn phường/xã —</option>
                  {wards.map((w, idx) => (
                    <option key={`${districtId}-${w.wardCode}-${idx}`} value={w.wardCode}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving || noSellerProfile || addrLoading.provinces}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white text-xs uppercase tracking-[0.14em] disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu địa chỉ kho'}
              </button>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
