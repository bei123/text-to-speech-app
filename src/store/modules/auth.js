import { LOCAL_STORAGE_KEYS, API_PATHS } from '@/constants/constants';
import http from '@/utils/http';
import { syncArmsRumUser } from '@/plugins/armsRum';

// 安全解析 localStorage 数据
function safeParseLocalStorage(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Failed to parse localStorage item "${key}":`, error);
    return null;
  }
}

export default {
  namespaced: true,
  state: {
    isSubmitting: false,
    user: safeParseLocalStorage(LOCAL_STORAGE_KEYS.USER),
    accessToken: localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) || null,
    refreshToken: localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN) || null,
  },
  mutations: {
    setSubmitting(state, isSubmitting) {
      state.isSubmitting = isSubmitting;
    },
    setUser(state, user) {
      state.user = user;
      if (user) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
      }
    },
    setTokens(state, { accessToken, refreshToken }) {
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
    },
  },
  actions: {
    async login({ commit }, { accessToken, refreshToken, user }) {
      commit('setTokens', { accessToken, refreshToken });
      commit('setUser', user);
      syncArmsRumUser(user);
    },
    async logout({ commit }) {
      commit('clearAuth');
      syncArmsRumUser(null);
    },
    async refreshToken({ commit, state, dispatch }) {
      try {
        commit('setSubmitting', true);
        const refreshToken = state.refreshToken;

        if (!refreshToken) {
          throw new Error('未找到 Refresh Token');
        }

        const response = await http.post(API_PATHS.REFRESH_TOKEN, {
          refreshToken,
        });

        commit('setTokens', {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken
        });

        return response.data.accessToken;
      } catch (error) {
        if (
          error.response?.data?.code === 'REFRESH_TOKEN_EXPIRED'
          || error.response?.status === 401
          || error.response?.status === 403
        ) {
          await dispatch('logout');
        }
        throw error;
      } finally {
        commit('setSubmitting', false);
      }
    },
  },
  getters: {
    isSubmitting: (state) => state.isSubmitting,
    user: (state) => state.user,
    accessToken: (state) => state.accessToken,
    refreshToken: (state) => state.refreshToken,
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
  },
};
