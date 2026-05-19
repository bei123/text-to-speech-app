import CryptoJS from 'crypto-js';
import { API_BASE_URL } from '@/constants/constants';

// Vue CLI 在构建时注入 process.env
const SIGN_SECRET = process.env.VUE_APP_CLIENT_SIGN_SECRET || ''; // eslint-disable-line no-undef

function resolveRequestPath(config) {
    const base = config.baseURL || API_BASE_URL;
    const rawUrl = config.url || '/';
    if (/^https?:\/\//i.test(rawUrl)) {
        return new URL(rawUrl).pathname;
    }
    return new URL(rawUrl, base.endsWith('/') ? base : `${base}/`).pathname;
}

/**
 * 为 axios 实例附加客户端签名头（需与后端 CLIENT_SIGN_SECRET 一致）
 */
export function attachApiSignInterceptor(instance) {
    if (!SIGN_SECRET) {
        return;
    }

    instance.interceptors.request.use((config) => {
        const path = resolveRequestPath(config);
        const method = (config.method || 'get').toUpperCase();
        const timestamp = Date.now().toString();
        const payload = `${method}\n${path}\n${timestamp}`;
        const sign = CryptoJS.HmacSHA256(payload, SIGN_SECRET).toString(CryptoJS.enc.Hex);

        config.headers = config.headers || {};
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        config.headers['X-Client-Timestamp'] = timestamp;
        config.headers['X-Client-Sign'] = sign;
        return config;
    });
}
