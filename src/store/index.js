import { createStore } from 'vuex';
import router from '@/router';


function safeParseLocalStorage(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Failed to parse localStorage item "${key}":`, error);
    return null;
  }
}


const LOCAL_STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user'
};

export default createStore({
  state: {
    token: localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) || null,
    user: safeParseLocalStorage(LOCAL_STORAGE_KEYS.USER)
  },
  mutations: {
    setToken(state, token) {
      state.token = token;
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
    },
    clearToken(state) {
      state.token = null;
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    },
    setUser(state, user) {
      state.user = user;
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(user));
    },
    clearUser(state) {
      state.user = null;
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
    }
  },
  actions: {
    login({ commit }, { token, user }) {
      commit('setToken', token);
      commit('setUser', user);
      router.push('/dashboard');
    },
    logout({ commit }) {
      commit('clearToken');
      commit('clearUser');
      router.push('/login');
    }
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
    }
  }
});