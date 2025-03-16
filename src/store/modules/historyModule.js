import axios from 'axios';
import { API_URLS } from '@/constants/constants';

export default {
  namespaced: true,
  state: {
    historyList: [],
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
  },
  mutations: {
    SET_HISTORY_LIST(state, historyList) {
      if (!Array.isArray(historyList)) {
        console.error('historyList 不是数组:', historyList);
        state.historyList = []; // 设置为空数组
        return;
      }

      state.historyList = historyList.map(record => ({
        ...record,
        isExpanded: false, // 默认不展开
        status: record.status || 'pending' // 确保 status 字段存在
      }));
    },
    SET_CURRENT_PAGE(state, page) {
      state.currentPage = page;
    },
    SET_TOTAL_ITEMS(state, total) {
      state.totalItems = total;
    },
  },
  actions: {
    async fetchHistory({ commit, rootState, dispatch }, { keyword, page = 1, itemsPerPage = 10 }) {
      const requestConfig = {
        headers: {
          Authorization: `Bearer ${rootState.token}`,
        },
        params: {
          page,
          itemsPerPage,
        },
      };

      if (keyword) {
        requestConfig.params.keyword = keyword;
      }

      try {
        if (!rootState.token) {
          throw new Error('未找到 Token，请重新登录');
        }

        const response = await axios.get(API_URLS.HISTORY, requestConfig);
        // console.log('后端返回的数据:', response.data); // 调试日志

        if (!response.data || !Array.isArray(response.data.data)) {
          throw new Error('后端返回的数据格式不正确');
        }

        commit('SET_HISTORY_LIST', response.data.data); // 确保传递的是数组
        commit('SET_TOTAL_ITEMS', response.data.total); // 设置总记录数
        commit('SET_CURRENT_PAGE', response.data.page); // 设置当前页
      } catch (error) {
        if (error.response?.status === 401) {
          try {
            await dispatch('refreshToken', {}, { root: true });
            requestConfig.headers.Authorization = `Bearer ${rootState.token}`;
            const response = await axios.get(API_URLS.HISTORY, requestConfig);
            commit('SET_HISTORY_LIST', response.data.data);
            commit('SET_TOTAL_ITEMS', response.data.total);
            commit('SET_CURRENT_PAGE', response.data.page);
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
      return state.historyList.map(record => ({
        ...record,
        status: record.status || 'pending' // 确保 status 字段存在
      }));
    },
    paginatedHistoryList: (state) => {
      const start = (state.currentPage - 1) * state.itemsPerPage;
      const end = start + state.itemsPerPage;
      return state.historyList.slice(start, end);
    },
    totalPages: (state) => Math.ceil(state.totalItems / state.itemsPerPage),
  },
};