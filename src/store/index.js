import { createStore } from 'vuex';
import router from '@/router';
import axios from 'axios';
import { LOCAL_STORAGE_KEYS, API_URLS } from '@/constants/constants';
import auth from './modules/auth';
import historyModule from './modules/historyModule';

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

// 安全存储数据到 localStorage
function safeSetLocalStorage(key, value) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  } catch (error) {
    console.error(`Failed to set localStorage item "${key}":`, error);
  }
}

export default createStore({
  state: {
    token: localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) || null,
    refreshToken: localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN) || null,
    user: safeParseLocalStorage(LOCAL_STORAGE_KEYS.USER),
    loading: false,
    error: null,
  },
  mutations: {
    setToken(state, token) {
      state.token = token;
      safeSetLocalStorage(LOCAL_STORAGE_KEYS.TOKEN, token);
    },
    setRefreshToken(state, refreshToken) {
      state.refreshToken = refreshToken;
      safeSetLocalStorage(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    },
    clearToken(state) {
      state.token = null;
      safeSetLocalStorage(LOCAL_STORAGE_KEYS.TOKEN, null);
    },
    clearRefreshToken(state) {
      state.refreshToken = null;
      safeSetLocalStorage(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, null);
    },
    setUser(state, user) {
      state.user = user;
      safeSetLocalStorage(LOCAL_STORAGE_KEYS.USER, user);
    },
    clearUser(state) {
      state.user = null;
      safeSetLocalStorage(LOCAL_STORAGE_KEYS.USER, null);
    },
    setLoading(state, loading) {
      state.loading = loading;
    },
    setError(state, error) {
      state.error = error;
    },
    clearError(state) {
      state.error = null;
    },
  },
  actions: {
    async login({ commit }, { accessToken, refreshToken, user }) {
      try {
        commit('setLoading', true);
        commit('clearError');
        
        commit('setToken', accessToken);
        commit('setRefreshToken', refreshToken);
        commit('setUser', user);
        
        await router.push('/');
      } catch (error) {
        commit('setError', error.message || '登录失败');
        throw error;
      } finally {
        commit('setLoading', false);
      }
    },
    async logout({ commit }) {
      try {
        commit('setLoading', true);
        commit('clearError');
        
        commit('clearToken');
        commit('clearRefreshToken');
        commit('clearUser');
        
        await router.push('/login');
      } catch (error) {
        commit('setError', error.message || '登出失败');
        throw error;
      } finally {
        commit('setLoading', false);
      }
    },
    async refreshToken({ commit, state, dispatch }) {
      try {
        commit('setLoading', true);
        commit('clearError');
        
        const refreshToken = state.refreshToken;
        if (!refreshToken) {
          throw new Error('未找到 Refresh Token');
        }

        const response = await axios.post(API_URLS.REFRESH_TOKEN, {
          refreshToken,
        });

        commit('setToken', response.data.accessToken);
        return response.data.accessToken;
      } catch (error) {
        commit('setError', error.message || '刷新 Token 失败');
        await dispatch('logout');
        throw error;
      } finally {
        commit('setLoading', false);
      }
    },
  },
  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
    userId: (state) => state.user?.id,
    userName: (state) => state.user?.name,
    refreshToken: (state) => state.refreshToken,
    isLoading: (state) => state.loading,
    error: (state) => state.error,
  },
  modules: {
    history: historyModule,
    auth,
  },
});