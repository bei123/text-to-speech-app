import axios from 'axios';
import { API_URLS } from '@/constants/constants';

export default {
  namespaced: true,
  state: {
    historyList: [],
  },
  mutations: {
    SET_HISTORY_LIST(state, historyList) {
      state.historyList = historyList;
    },
  },
  actions: {
    async fetchHistory({ commit, rootState, dispatch }, keyword) {
      const requestConfig = {
        headers: {
          Authorization: `Bearer ${rootState.token}`,
        },
        params: {},
      };

      if (keyword) {
        requestConfig.params.keyword = keyword;
      }

      try {
        if (!rootState.token) {
          throw new Error('未找到 Token，请重新登录');
        }

        const response = await axios.get(API_URLS.HISTORY, requestConfig);
        commit('SET_HISTORY_LIST', response.data);
      } catch (error) {
        if (error.response?.status === 401) {
          try {
            await dispatch('refreshToken', {}, { root: true });
            requestConfig.headers.Authorization = `Bearer ${rootState.token}`;
            const response = await axios.get(API_URLS.HISTORY, requestConfig);
            commit('SET_HISTORY_LIST', response.data);
          } catch (refreshError) {
            console.error('刷新 Token 失败:', refreshError);
            throw new Error('Token 已过期，请重新登录');
          }
        } else {
          console.error('获取历史记录失败:', error);
          throw error;
        }
      }
    },
  },
  getters: {
    historyList(state) {
      return state.historyList;
    },
  },
};