export const ATTR_TRANSLATIONS = {
    frameShape: {
        ROUND: 'Tròn',
        SQUARE: 'Vuông',
        RECTANGLE: 'Chữ nhật',
        OVAL: 'Bầu dục',
        CAT_EYE: 'Mắt mèo',
        AVIATOR: 'Phi công',
    },
    frameMaterial: {
        METAL: 'Kim loại',
        ACETATE: 'Nhựa Acetate',
        TITANIUM: 'Hợp kim Titan',
        PLASTIC: 'Nhựa dẻo',
        WOOD: 'Gỗ',
    },
    lensType: {
        SINGLE_VISION: 'Tròng đơn',
        BIFOCAL: 'Hai tròng',
        PROGRESSIVE: 'Đa tròng',
        SUNGLASSES: 'Kính râm',
        BLUE_LIGHT: 'Chống as xanh',
    },
    condition: {
        NEW: 'Mới 100%',
        LIKE_NEW: 'Như mới',
        USED: 'Đã qua sử dụng',
    },
    gender: {
        UNISEX: 'Unisex',
        MEN: 'Nam',
        WOMEN: 'Nữ',
    }
};

export function translateAttr(group, key) {
    if (!key) return '-';
    return ATTR_TRANSLATIONS[group]?.[key] || key;
}
