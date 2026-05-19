import store from '@/store';
import router from '@/router';
import { HTTP_STATUS_UNAUTHORIZED } from '@/constants/constants';
import http from '@/utils/http';

const api = http;

function isRefreshTokenRequest(config) {
    const url = config?.url || '';
    return url.includes('/refresh-token');
}

// 请求拦截器：添加 Token
api.interceptors.request.use(
    (config) => {
        const token = store.getters['auth/accessToken'];
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('请求错误:', error);
        return Promise.reject(error);
    }
);

// 响应拦截器：处理 Token 过期和错误
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === HTTP_STATUS_UNAUTHORIZED
            && originalRequest
            && !originalRequest._retry
            && !isRefreshTokenRequest(originalRequest)
        ) {
            originalRequest._retry = true;

            try {
                const newAccessToken = await store.dispatch('refreshToken');
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error('刷新 Token 失败:', refreshError);

                if (refreshError.response?.data?.code === 'REFRESH_TOKEN_EXPIRED') {
                    await store.dispatch('logout');
                    router.push({
                        path: '/login',
                        query: {
                            redirect: router.currentRoute.value.fullPath,
                            message: '登录已过期，请重新登录',
                        },
                    });
                }

                return Promise.reject(refreshError);
            }
        }

        if (error.response) {
            console.error('服务器错误:', error.response.data);
            return Promise.reject(error.response.data);
        }
        if (error.request) {
            console.error('网络错误:', error.request);
            return Promise.reject({ message: '网络连接失败，请检查网络设置' });
        }
        console.error('请求配置错误:', error.message);
        return Promise.reject({ message: '请求配置错误' });
    }
);

export default api;
