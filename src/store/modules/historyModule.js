import axios from 'axios';
import router from '@/router';
import { LOCAL_STORAGE_KEYS } from '@/constants/constants';
import CryptoJS from 'crypto-js';

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
    CLEAR_HISTORY(state) {
      state.historyList = [];
      state.currentPage = 1;
      state.totalItems = 0;
    }
  },
  actions: {
    async fetchHistory({ commit, dispatch, rootState }, { keyword, page = 1, itemsPerPage = 10, startDate, endDate, model, status }) {
      try {
        // 从 Vuex store 获取 token
        const token = rootState.token || localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
        console.log('当前 token:', token ? '存在' : '不存在');

        if (!token) {
          console.log('未找到 token，重定向到登录页面');
          commit('CLEAR_HISTORY');
          router.push('/login');
          throw new Error('未登录');
        }

        const requestConfig = {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            page,
            itemsPerPage
          }
        };

        if (keyword) {
          requestConfig.params.keyword = keyword;
        }

        // 处理日期范围
        if (startDate) {
          // 确保日期格式为 YYYY-MM-DD
          const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
          requestConfig.params.startDate = formattedStartDate;
          console.log('开始日期:', formattedStartDate);
        }
        if (endDate) {
          // 确保日期格式为 YYYY-MM-DD，并设置为当天的结束时间
          const date = new Date(endDate);
          date.setHours(23, 59, 59, 999);
          const formattedEndDate = date.toISOString().split('T')[0];
          requestConfig.params.endDate = formattedEndDate;
          console.log('结束日期:', formattedEndDate);
        }

        if (model) {
          requestConfig.params.model = model;
        }
        if (status) {
          requestConfig.params.status = status;
        }

        console.log('发送请求配置:', {
          ...requestConfig,
          headers: { ...requestConfig.headers, Authorization: 'Bearer [已隐藏]' }
        });

        const response = await axios.get('https://aidudio.2000gallery.art:5000/history', requestConfig);
        
        // 解密响应数据
        const decryptedData = CryptoJS.AES.decrypt(response.data.encryptedData, response.data.key);
        const parsedData = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
        
        commit('SET_HISTORY_LIST', parsedData.data);
        commit('SET_TOTAL_ITEMS', parsedData.total);
        commit('SET_CURRENT_PAGE', parsedData.page);
        
        return parsedData;
      } catch (error) {
        console.error('获取历史记录失败:', error);
        
        if (error.response?.status === 401) {
          console.log('Token 已过期，尝试刷新');
          try {
            await dispatch('auth/refreshToken', null, { root: true });
            return dispatch('fetchHistory', { keyword, page, itemsPerPage, startDate, endDate, model, status });
          } catch (refreshError) {
            console.error('刷新 token 失败:', refreshError);
            commit('CLEAR_HISTORY');
            router.push('/login');
            throw new Error('登录已过期，请重新登录');
          }
        }
        throw error;
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