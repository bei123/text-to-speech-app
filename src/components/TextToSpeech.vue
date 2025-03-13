<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-links">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/history" class="nav-link">生成记录</router-link>
      </div>
    </nav>
    <router-view></router-view>

  </div>
  <div class="app-container">
    <h1 class="app-title">AI语音生命</h1>
    <button @click="logoutUser" class="logout-button">退出登录</button>

    <!-- 模型头像 -->
    <div class="model-avatar">
      <img :src="selectedModelAvatar" alt="模型头像" class="avatar-image" />
    </div>

    <!-- 模型选择 -->
    <div class="form-group">
      <label for="model-select" class="form-label">选择模型：</label>
      <div class="select-wrapper">
        <input id="model-select" v-model="selectedModelLabel" readonly class="select-field" @click="openModelModal"
          placeholder="点击选择模型" />
        <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
      </div>
    </div>

    <!-- 模型选择模态框 -->
    <ModelModal v-if="showModelModal" :models="models" @select-model="selectModel" @close="closeModelModal" />

    <!-- 文本输入框 -->
    <textarea v-model="inputText" placeholder="请输入文本" class="input-field"></textarea>

    <!-- 语言选择 -->
    <div class="form-group">
      <label for="language-select" class="form-label">选择文本语言（默认为中文）：</label>
      <div class="select-wrapper">
        <select id="language-select" v-model="selectedLanguage" class="select-field">
          <option v-for="language in languages" :key="language.value" :value="language.value">
            {{ language.label }}
          </option>
        </select>
        <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
      </div>
    </div>

    <!-- 开启AI聊天功能 -->
    <div class="newView">
      <label>
        <input type="checkbox" v-model="isOpenAIGPT" class="checkbox1" />
        开启AI聊天功能(测试版)
      </label>
      <div v-if="isOpenAIGPT" class="chatSdButton-container">
        <button @click="openSystemModal" class="button button-primary">设置聊天模型人设</button>
      </div>
    </div>

    <!-- 生成语音按钮 -->
    <button @click="generateSpeech" :disabled="isLoading" class="button button-primary generate-button">
      <span v-if="!isLoading">生成语音</span>
      <span v-else class="loading-spinner"></span>
    </button>

    <!-- 语音预览 -->
    <div v-if="audioUrl" class="audio-preview">
      <h2 class="preview-title">预览</h2>
      <audio :src="audioUrl" controls class="audio-player"></audio>
      <a :href="audioUrl" download="speech.wav" class="button button-primary download-button">下载语音</a>
    </div>

    <!-- 设置 SYSTEM 的模态框 -->
    <SystemModal v-if="showSystemModal" v-model="systemPrompt" @save="saveSystemPrompt" @close="closeSystemModal" />

    <!-- 提示信息 -->
    <Snackbar v-if="snackbar" :message="snackbarMessage" @close="snackbar = false" />

    <!-- 底部图标 -->
    <div class="footer-icon" @click="goToSponsorsPage">
      <span class="icon-text">为爱发电的人们</span>
    </div>
  </div>
  <footer>
    <!-- 页脚内容 -->
    <p>© 2025 Ai 语音生命</p>
  </footer>
  <!-- <button @click="goToHistory" class="button button-primary history-button">查看历史记录</button> -->
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import axios from 'axios';
import ModelModal from './ModelModal.vue';
import SystemModal from './SystemModal.vue';
import Snackbar from './AppSnackbar.vue';

const inputText = ref('');
const selectedLanguage = ref('all_zh');
const selectedModel = ref('');
const selectedModelLabel = ref('');
const audioUrl = ref('');
const isLoading = ref(false);
const models = ref([]);
const isOpenAIGPT = ref(false);
const showSystemModal = ref(false);
const systemPrompt = ref('');
const showModelModal = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');

const languages = [
  { value: 'en', label: '英语' },
  { value: 'all_zh', label: '中文' },
  { value: 'all_yue', label: '粤语' },
  { value: 'all_ja', label: '日语' },
  { value: 'auto', label: '自动' }
];

const router = useRouter();
const store = useStore();

// 获取模型数据
const fetchModels = async () => {
  try {
    const response = await axios.get('http://aidudio.2000gallery.art:5000/models');
    models.value = response.data;
    if (models.value.length > 0) {
      selectedModel.value = models.value[0].value;
    }
  } catch (error) {
    console.error('获取模型数据失败:', error);
    showSnackbar('获取模型数据失败，请稍后重试');
  }
};

// 打开模型选择模态框
const openModelModal = () => {
  showModelModal.value = true;
};

// 关闭模型选择模态框
const closeModelModal = () => {
  showModelModal.value = false;
};

// 选择模型
const selectModel = (model) => {
  selectedModel.value = model.value;
  selectedModelLabel.value = model.label;
  closeModelModal();
};

// 计算模型头像
const selectedModelAvatar = computed(() => {
  const model = models.value.find(m => m.value === selectedModel.value);
  return model ? model.avatar_url : '';
});

// 跳转到赞助页面
const goToSponsorsPage = () => {
  router.push('/sponsors');
};

// 退出登录
const logoutUser = () => {
  store.dispatch('logout');
  router.push('/login');
};

// // 跳转到历史记录页面
// const goToHistory = () => {
//   router.push('/history');
// };

// 显示提示信息
const showSnackbar = (message) => {
  snackbarMessage.value = message;
  snackbar.value = true;
  setTimeout(() => {
    snackbar.value = false;
  }, 3000);
};

// 生成语音
const generateSpeech = async () => {
  if (!inputText.value.trim()) {
    showSnackbar('请输入文本');
    return;
  }

  const currentUser = store.getters.currentUser;
  if (!currentUser || !currentUser.username) {
    showSnackbar('请先登入');
    router.push('/login');
    return;
  }

  isLoading.value = true;
  try {
    let textToGenerate = inputText.value;

    if (isOpenAIGPT.value) {
      const response = await axios.post(
        'http://aidudio.2000gallery.art:5000/call-deepseek',
        {
          prompt: inputText.value,
          system: systemPrompt.value
        }
      );
      textToGenerate = response.data.text;
    }

    const speechResponse = await axios.post(
      'http://aidudio.2000gallery.art:5000/generate-speech',
      {
        text: textToGenerate,
        text_language: selectedLanguage.value,
        model_name: selectedModel.value,
        username: currentUser.username
      },
      {
        headers: {
          Authorization: `Bearer ${store.state.token}`
        }
      }
    );

    audioUrl.value = speechResponse.data.downloadLink;
  } catch (error) {
    console.error('生成语音失败:', error);
    showSnackbar('生成语音失败，请稍后重试');
  } finally {
    isLoading.value = false;
  }
};

// 打开设置 SYSTEM 的模态框
const openSystemModal = () => {
  showSystemModal.value = true;
};

// 关闭设置 SYSTEM 的模态框
const closeSystemModal = () => {
  showSystemModal.value = false;
};

// 保存 SYSTEM 提示词
const saveSystemPrompt = () => {
  if (!systemPrompt.value.trim()) {
    showSnackbar('请输入提示词');
    return;
  }
  closeSystemModal();
};

onMounted(() => {
  fetchModels();
});
</script>


<style scoped>
/* 导航栏样式 */
.navbar {
  background: linear-gradient(135deg, #42b983, #3aa876);
  padding: 10px 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-size: 16px;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.2);
}

/* 通用样式 */
.app-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.app-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

/* 按钮样式 */
.button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.button-primary {
  background-color: #42b983;
  color: white;
}

.button-primary:hover {
  background-color: #3aa876;
}

.button-cancel {
  background-color: #ff4d4d;
  color: white;
}

.button-cancel:hover {
  background-color: #ff1a1a;
}

/* 输入框样式 */
.input-field {
  width: 100%;
  padding: 12px;
  border: 2px solid #42b983;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 20px;
  resize: vertical;
  outline: none;
  background-color: #f9f9f9;
  color: #333;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.input-field:focus {
  border-color: #3aa876;
  box-shadow: 0 0 8px rgba(66, 185, 131, 0.3);
}

.input-field::placeholder {
  color: #999;
  font-style: italic;
}

/* 下拉框样式 */
.select-wrapper {
  position: relative;
  width: 100%;
  margin-bottom: 20px;
}

.select-field {
  width: 100%;
  padding: 12px 36px 12px 12px;
  border: 2px solid #42b983;
  border-radius: 8px;
  font-size: 16px;
  background-color: white;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.select-field:focus {
  border-color: #3aa876;
  box-shadow: 0 0 8px rgba(66, 185, 131, 0.3);
}

.dropdown-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #42b983;
  font-size: 14px;
  transition: transform 0.3s ease;
}

.select-field:focus+.dropdown-icon {
  transform: translateY(-50%) rotate(180deg);
}

.select-field option {
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
}

.select-field option:hover {
  background-color: #f0f0f0;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 模型列表样式 */
.model-list {
  max-height: 300px;
  overflow-y: auto;
}

.model-item {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.model-item:hover {
  background-color: #f0f0f0;
}

/* 底部图标样式 */
.footer-icon {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  background-color: #42b983;
  padding: 10px 15px;
  border-radius: 25px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s ease;
}

.footer-icon:hover {
  background-color: #3aa876;
}

.icon-text {
  font-size: 14px;
  color: white;
}

/* 模型头像样式 */
.model-avatar {
  text-align: center;
  margin-bottom: 20px;
}

.avatar-image {
  width: 150px;
  height: 150px;
  border-radius: 20px;
  border: 2px solid #42b983;
  object-fit: cover;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* 生成语音按钮样式 */
.generate-button {
  width: 100%;
  padding: 12px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.generate-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.generate-button:hover:not(:disabled) {
  background-color: #3aa876;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 音频预览样式 */
.audio-preview {
  margin-top: 20px;
  text-align: center;
}

.preview-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.audio-player {
  width: 100%;
  margin-bottom: 10px;
}

.download-button {
  display: inline-block;
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.download-button:hover {
  background-color: #45a049;
}

/* 退出登录按钮样式 */
.logout-button {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background-color: #ff4d4d;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.logout-button:hover {
  background-color: #ff1a1a;
}
</style>