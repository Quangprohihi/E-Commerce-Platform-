import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

/**
 * Cascade Tỉnh → Quận → Phường (GHN) tái sử dụng GET /api/shipping/*.
 * @param {{ enabled?: boolean }} opts
 */
export function useGhnAddressCascade(opts = {}) {
  const { enabled = true } = opts;

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [addrLoading, setAddrLoading] = useState({
    provinces: true,
    districts: false,
    wards: false,
  });
  const [addrError, setAddrError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setAddrLoading((s) => ({ ...s, provinces: false }));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setAddrLoading((s) => ({ ...s, provinces: true }));
      setAddrError('');
      try {
        const res = await api.get('/shipping/provinces');
        const list = res.data?.data?.provinces;
        if (!cancelled) setProvinces(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) {
          setAddrError('Không tải được danh sách tỉnh/thành (GHN). Kiểm tra cấu hình server.');
          setProvinces([]);
        }
      } finally {
        if (!cancelled) setAddrLoading((s) => ({ ...s, provinces: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const loadDistricts = useCallback(async (pid) => {
    const id = String(pid || '').trim();
    if (!id) {
      setDistricts([]);
      setDistrictId('');
      setWards([]);
      setWardCode('');
      return;
    }
    setAddrLoading((s) => ({ ...s, districts: true }));
    setAddrError('');
    try {
      const res = await api.get('/shipping/districts', { params: { provinceId: id } });
      const list = res.data?.data?.districts;
      setDistricts(Array.isArray(list) ? list : []);
    } catch {
      setDistricts([]);
      setDistrictId('');
      setWards([]);
      setWardCode('');
      setAddrError('Không tải được quận/huyện.');
    } finally {
      setAddrLoading((s) => ({ ...s, districts: false }));
    }
  }, []);

  const loadWards = useCallback(async (did) => {
    const id = String(did || '').trim();
    if (!id) {
      setWards([]);
      setWardCode('');
      return;
    }
    setAddrLoading((s) => ({ ...s, wards: true }));
    setAddrError('');
    try {
      const res = await api.get('/shipping/wards', { params: { districtId: id } });
      const list = res.data?.data?.wards;
      setWards(Array.isArray(list) ? list : []);
    } catch {
      setWards([]);
      setWardCode('');
      setAddrError('Không tải được phường/xã.');
    } finally {
      setAddrLoading((s) => ({ ...s, wards: false }));
    }
  }, []);

  const handleProvinceChange = useCallback(
    async (value) => {
      const v = String(value || '');
      setProvinceId(v);
      setDistrictId('');
      setWardCode('');
      setDistricts([]);
      setWards([]);
      await loadDistricts(v);
    },
    [loadDistricts]
  );

  const handleDistrictChange = useCallback(
    async (value) => {
      const v = String(value || '');
      setDistrictId(v);
      setWardCode('');
      setWards([]);
      await loadWards(v);
    },
    [loadWards]
  );

  /**
   * Gán lại 3 cấp từ SellerProfile (sau GET /auth/me hoặc sau lưu).
   * @param {{ sellerProvinceId?: number|null, sellerDistrictId?: number|null, sellerWardCode?: string|null }|null|undefined} sp
   */
  const applySavedProfile = useCallback(
    async (sp) => {
      if (!sp) {
        setProvinceId('');
        setDistrictId('');
        setWardCode('');
        setDistricts([]);
        setWards([]);
        return;
      }
      const pid = sp.sellerProvinceId != null ? Number(sp.sellerProvinceId) : NaN;
      if (!Number.isFinite(pid) || pid <= 0) {
        setProvinceId('');
        setDistrictId('');
        setWardCode('');
        setDistricts([]);
        setWards([]);
        return;
      }
      setAddrError('');
      setProvinceId(String(pid));
      setAddrLoading((s) => ({ ...s, districts: true, wards: false }));
      try {
        const res = await api.get('/shipping/districts', { params: { provinceId: String(pid) } });
        const dlist = Array.isArray(res.data?.data?.districts) ? res.data.data.districts : [];
        setDistricts(dlist);
        const did = sp.sellerDistrictId != null ? Number(sp.sellerDistrictId) : NaN;
        const hasDistrict =
          Number.isFinite(did) &&
          did > 0 &&
          dlist.some((d) => Number(d.districtId) === did);
        if (!hasDistrict) {
          setDistrictId('');
          setWards([]);
          setWardCode('');
          return;
        }
        setDistrictId(String(did));
        setAddrLoading((s) => ({ ...s, districts: false, wards: true }));
        const wRes = await api.get('/shipping/wards', { params: { districtId: String(did) } });
        const wlist = Array.isArray(wRes.data?.data?.wards) ? wRes.data.data.wards : [];
        setWards(wlist);
        const wc = sp.sellerWardCode != null ? String(sp.sellerWardCode).trim() : '';
        const hasWard = wc && wlist.some((w) => String(w.wardCode) === wc);
        setWardCode(hasWard ? wc : '');
      } catch {
        setAddrError('Không tải được địa chỉ kho đã lưu.');
        setDistricts([]);
        setDistrictId('');
        setWards([]);
        setWardCode('');
      } finally {
        setAddrLoading((s) => ({ ...s, districts: false, wards: false }));
      }
    },
    []
  );

  return {
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
  };
}
