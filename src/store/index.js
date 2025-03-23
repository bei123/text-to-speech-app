import { createStore } from 'vuex';
import auth from './modules/auth';
import historyModule from './modules/historyModule';

export default createStore({
  state: {
    loading: false,
    error: null,
  },
  mutations: {
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
    async login({ dispatch }, { accessToken, refreshToken, user }) {
      await dispatch('auth/login', { accessToken, refreshToken, user });
    },
    async logout({ dispatch }) {
      await dispatch('auth/logout');
    },
    async refreshToken({ dispatch }) {
      return await dispatch('auth/refreshToken');
    },
  },
  getters: {
    isLoading: (state) => state.loading,
    error: (state) => state.error,
  },
  modules: {
    history: historyModule,
    auth,
  },
});