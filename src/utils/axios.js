import axios from 'axios';
import store from '@/store';
import router from '@/router';
import { API_BASE_URL, HTTP_STATUS_UNAUTHORIZED } from '@/constants/constants';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 设置请求超时时间
    headers: {
        'Content-Type': 'application/json',
    },
});

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

                // 如果是 refresh token 过期，清除用户状态并跳转到登录页
                if (refreshError.response?.data?.code === 'REFRESH_TOKEN_EXPIRED') {
                    await store.dispatch('logout');
                    router.push({
                        path: '/login',
                        query: {
                            redirect: router.currentRoute.value.fullPath,
                            message: '登录已过期，请重新登录'
                        }
                    });
                }

                return Promise.reject(refreshError);
            }
        }

        // 处理其他错误
        if (error.response) {
            // 服务器响应错误
            console.error('服务器错误:', error.response.data);
            return Promise.reject(error.response.data);
        } else if (error.request) {
            // 请求未收到响应
            console.error('网络错误:', error.request);
            return Promise.reject({ message: '网络连接失败，请检查网络设置' });
        } else {
            // 请求配置错误
            console.error('请求配置错误:', error.message);
            return Promise.reject({ message: '请求配置错误' });
        }
    }
);

export default api;