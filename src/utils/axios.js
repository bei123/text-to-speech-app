import axios from 'axios';
import store from '@/store';
import { API_BASE_URL, HTTP_STATUS_UNAUTHORIZED } from '@/constants/constants';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// 请求拦截器：添加 Token
api.interceptors.request.use((config) => {
    const token = store.state.token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 响应拦截器：处理 Token 过期
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 如果是 401 错误且未重试过
        if (error.response?.status === HTTP_STATUS_UNAUTHORIZED && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // 调用 Vuex Store 的 refreshToken 方法刷新 Token
                const newAccessToken = await store.dispatch('refreshToken');

                // 更新请求头中的 Access Token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                // 重试原始请求
                return api(originalRequest);
            } catch (refreshError) {
                console.error('刷新 Token 失败:', refreshError);
                throw refreshError;
            }
        }

        // 其他错误直接返回
        return Promise.reject(error);
    }
);

export default api;