<template>
  <div class="app-container">
    <h1 class="page-title">
      <i class="fas fa-users"></i>
      音色圈子
    </h1>
    <p class="page-description">发现和分享优质音色预设，与社区一起创造精彩</p>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 预设列表 -->
    <div v-else-if="presets.length > 0" class="presets-grid">
      <div
        v-for="preset in presets"
        :key="preset.id"
        class="preset-card"
      >
        <div class="preset-header">
          <h3 class="preset-name">{{ preset.name }}</h3>
          <div class="preset-author">
            <i class="fas fa-user"></i>
            <span>{{ preset.author_name }}</span>
          </div>
        </div>
        
        <div class="preset-info">
          <div class="preset-meta-item">
            <i class="fas fa-language"></i>
            <span>提示语言: {{ getLanguageLabel(preset.prompt_language) }}</span>
          </div>
          <div class="preset-meta-item">
            <i class="fas fa-clock"></i>
            <span>更新时间: {{ formatDate(preset.updated_at) }}</span>
          </div>
        </div>

        <div class="preset-actions">
          <button
            @click="usePreset(preset)"
            class="button button-primary use-btn"
            :disabled="isUsingPreset === preset.id"
          >
            <i class="fas" :class="isUsingPreset === preset.id ? 'fa-spinner fa-spin' : 'fa-check'"></i>
            <span>{{ isUsingPreset === preset.id ? '使用中...' : '使用此预设' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <i class="fas fa-inbox"></i>
      <p>暂无分享的预设</p>
      <p class="empty-hint">成为第一个分享音色预设的用户吧！</p>
    </div>

    <!-- 分页 -->
    <div v-if="total > limit" class="pagination">
      <button
        @click="loadPage(page - 1)"
        :disabled="page <= 1"
        class="pagination-btn"
      >
        <i class="fas fa-chevron-left"></i>
        上一页
      </button>
      <span class="pagination-info">
        第 {{ page }} 页，共 {{ Math.ceil(total / limit) }} 页
      </span>
      <button
        @click="loadPage(page + 1)"
        :disabled="page >= Math.ceil(total / limit)"
        class="pagination-btn"
      >
        下一页
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <!-- 提示信息 -->
    <Snackbar v-if="snackbar" :message="snackbarMessage" @close="snackbar = false" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { API_URLS } from '@/constants/constants';
import Snackbar from './AppSnackbar.vue';

const store = useStore();
const router = useRouter();

const presets = ref([]);
const isLoading = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');
const isUsingPreset = ref(null);

// 分页相关
const page = ref(1);
const limit = ref(20);
const total = ref(0);

const languages = [
  { value: 'en', label: '英语' },
  { value: 'all_zh', label: '中文' },
  { value: 'all_yue', label: '粤语' },
  { value: 'all_ja', label: '日语' },
  { value: 'auto', label: '自动' }
];

const showSnackbar = (message) => {
  snackbarMessage.value = message;
  snackbar.value = true;
  setTimeout(() => {
    snackbar.value = false;
  }, 3000);
};

const getLanguageLabel = (value) => {
  const language = languages.find(l => l.value === value);
  return language ? language.label : value;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const loadPublicPresets = async (pageNum = 1) => {
  isLoading.value = true;
  try {
    const currentUser = store.getters['auth/user'];
    
    // 获取加密密钥（如果已登录）
    let secretKey = null;
    if (currentUser && currentUser.username) {
      try {
        const initialKey = 'text-to-speech-initial-key';
        const encryptedUsernameForKey = CryptoJS.AES.encrypt(currentUser.username, initialKey).toString();
        const keyResponse = await axios.get(API_URLS.ENCRYPTION_KEY, {
          params: { encryptedUsername: encryptedUsernameForKey }
        });
        secretKey = keyResponse.data.key;
      } catch (error) {
        console.warn('获取加密密钥失败，使用未加密请求:', error);
      }
    }

    // 发送请求
    const params = { page: pageNum, limit: limit.value };
    if (secretKey) {
      params.key = secretKey;
    }

    const response = await axios.get(API_URLS.PRESET_PUBLIC, { params });

    // 解密响应数据
    let data;
    if (response.data.encryptedData && response.data.key) {
      const decryptedBytes = CryptoJS.AES.decrypt(
        response.data.encryptedData,
        response.data.key
      );
      data = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
    } else {
      data = response.data;
    }

    presets.value = data.presets || [];
    total.value = data.total || 0;
    page.value = data.page || pageNum;
  } catch (error) {
    console.error('加载公开预设列表失败:', error);
    if (error.response?.status === 401) {
      showSnackbar('请先登录');
      router.replace('/login');
    } else {
      showSnackbar('加载预设列表失败，请稍后重试');
    }
  } finally {
    isLoading.value = false;
  }
};

const loadPage = (pageNum) => {
  if (pageNum >= 1 && pageNum <= Math.ceil(total.value / limit.value)) {
    loadPublicPresets(pageNum);
  }
};

const usePreset = async (preset) => {
  isUsingPreset.value = preset.id;
  try {
    // 跳转到自定义音色页面，并传递预设信息
    router.push({
      path: '/custom-voice',
      query: {
        presetId: preset.id,
        presetName: preset.name,
        refAudioUrl: preset.ref_audio_url,
        promptText: preset.prompt_text,
        promptLanguage: preset.prompt_language
      }
    });
  } catch (error) {
    console.error('使用预设失败:', error);
    showSnackbar('使用预设失败，请稍后重试');
  } finally {
    isUsingPreset.value = null;
  }
};

onMounted(() => {
  loadPublicPresets();
});
</script>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title i {
  color: #42b983;
}

.page-description {
  font-size: 16px;
  color: #666;
  margin-bottom: 30px;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.preset-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
}

.preset-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.preset-header {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.preset-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 10px 0;
}

.preset-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

.preset-author i {
  color: #42b983;
}

.preset-info {
  margin-bottom: 15px;
}

.preset-meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.preset-meta-item i {
  color: #42b983;
  width: 16px;
}

.preset-actions {
  display: flex;
  gap: 10px;
}

.button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: center;
}

.button-primary {
  background-color: #42b983;
  color: white;
}

.button-primary:hover:not(:disabled) {
  background-color: #3aa876;
  transform: translateY(-1px);
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #999;
}

.empty-state i {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-hint {
  font-size: 14px;
  margin-top: 10px;
  color: #bbb;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
  padding: 20px;
}

.pagination-btn {
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #42b983;
  color: #42b983;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .app-container {
    padding: 15px;
  }

  .page-title {
    font-size: 24px;
  }

  .presets-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .preset-card {
    padding: 15px;
  }

  .pagination {
    flex-direction: column;
    gap: 15px;
  }

  .pagination-info {
    order: -1;
  }
}
</style>

