import { LOCAL_STORAGE_KEYS } from '@/constants/constants';

export default {
  namespaced: true,
  state: {
    isSubmitting: false,
    user: null,
    accessToken: null,
    refreshToken: null,
  },
  mutations: {
    setSubmitting(state, isSubmitting) {
      state.isSubmitting = isSubmitting;
    },
    setUser(state, user) {
      state.user = user;
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(user));
    },
    setTokens(state, { accessToken, refreshToken }) {
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    },
  },
  actions: {
    login({ commit }, { accessToken, refreshToken, user }) {
      commit('setTokens', { accessToken, refreshToken });
      commit('setUser', user);
    },
  },
  getters: {
    isSubmitting: (state) => state.isSubmitting,
    user: (state) => state.user,
    accessToken: (state) => state.accessToken,
    refreshToken: (state) => state.refreshToken,
  },
};