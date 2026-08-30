import axios from 'axios';
import { API_BASE_URL } from '@/constants/constants';
import { attachApiSignInterceptor } from '@/utils/apiSign';

/** 上传参考音频 + 等待合成完成所需时间明显长于普通 JSON 请求 */
const FORM_DATA_TIMEOUT_MS = 180000;

function isFormDataPayload(data) {
    return typeof FormData !== 'undefined' && data instanceof FormData;
}

function unsetContentType(headers) {
    if (!headers) return;
    // false：跳过 JSON 序列化，交给浏览器补上带 boundary 的 multipart
    if (typeof headers.set === 'function') {
        headers.set('Content-Type', false);
        return;
    }
    delete headers['Content-Type'];
    delete headers['content-type'];
}

/** 带签名的基础客户端（无 Token 拦截，供 refresh-token 等使用） */
const http = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

http.interceptors.request.use((config) => {
    if (!isFormDataPayload(config.data)) {
        return config;
    }

    // Axios 1.x：若保留默认 application/json，会把 FormData 转成 JSON，
    // File 会被序列化成 {}，后端 multer 收不到 ref_wav_file。
    unsetContentType(config.headers);

    if (config.timeout === http.defaults.timeout) {
        config.timeout = FORM_DATA_TIMEOUT_MS;
    }

    return config;
});

attachApiSignInterceptor(http);

export default http;
