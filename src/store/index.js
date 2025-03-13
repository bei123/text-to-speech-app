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

export default createStore({
  state: {
    token: localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) || null,
    refreshToken: localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN) || null,
    user: safeParseLocalStorage(LOCAL_STORAGE_KEYS.USER),
  },
  mutations: {
    setToken(state, token) {
      state.token = token;
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
    },
    setRefreshToken(state, refreshToken) {
      state.refreshToken = refreshToken;
      localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    },
    clearToken(state) {
      state.token = null;
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    },
    clearRefreshToken(state) {
      state.refreshToken = null;
      localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
    },
    setUser(state, user) {
      state.user = user;
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(user));
    },
    clearUser(state) {
      state.user = null;
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
    },
  },
  actions: {
    login({ commit }, { accessToken, refreshToken, user }) {
      commit('setToken', accessToken);
      commit('setRefreshToken', refreshToken);
      commit('setUser', user);
      router.push('/');
    },
    logout({ commit }) {
      commit('clearToken');
      commit('clearRefreshToken');
      commit('clearUser');
      router.push('/login');
    },
    async refreshToken({ commit, state, dispatch }) {
      try {
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
        console.error('刷新 Token 失败:', error);
        dispatch('logout');
        throw error;
      }
    },
  },
  getters: {
    isAuthenticated(state) {
      return !!state.token;
    },
    currentUser(state) {
      return state.user;
    },
    userId(state) {
      return state.user?.id;
    },
    userName(state) {
      return state.user?.name;
    },
    refreshToken(state) {
      return state.refreshToken;
    },
  },
  modules: {
    history: historyModule,
    auth,
  },
});