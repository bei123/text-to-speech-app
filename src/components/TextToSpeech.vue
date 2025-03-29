<template>
  <div id="app">
    <!-- <nav class="navbar">
      <div class="nav-links">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/history" class="nav-link">生成记录</router-link>
      </div>
    </nav> -->
    <!-- <router-view></router-view> -->

  </div>
  <div class="app-container">
    <!-- <h1 class="app-title">AI语音生命</h1> -->
    <!-- <button @click="logoutUser" class="logout-button">退出登录</button> -->

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
      <audio :src="proxyAudioUrl" controls class="audio-player"></audio>
      <button @click="handleDownload" class="button button-primary download-button">下载语音</button>
    </div>

    <!-- 设置 SYSTEM 的模态框 -->
    <SystemModal 
      v-if="showSystemModal" 
      v-model="systemPrompt" 
      :defaultValue="defaultSystemPrompt"
      @save="saveSystemPrompt" 
      @close="closeSystemModal"
      @reset="resetToDefaultPrompt" 
    />

    <!-- 提示信息 -->
    <Snackbar v-if="snackbar" :message="snackbarMessage" @close="snackbar = false" />

    <!-- 底部图标 -->
    
  </div>
  <footer>
    <!-- 页脚内容 -->
    <!-- <p>© 2025 Ai 语音生命</p> -->
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
import CryptoJS from 'crypto-js';
import { API_URLS } from '@/constants/constants';

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
const defaultSystemPrompt = ref(''); // 存储模型默认提示词
const isUsingDefaultPrompt = ref(true); // 标记是否使用默认提示词
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
    const response = await axios.get(API_URLS.MODELS);
    
    // 解密响应数据
    const decryptedData = CryptoJS.AES.decrypt(response.data.encryptedData, response.data.key);
    const parsedData = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
    
    models.value = parsedData;
    if (models.value.length > 0) {
      // 设置第一个模型为默认选择的模型
      selectedModel.value = models.value[0].value;
      selectedModelLabel.value = models.value[0].label;
      
      // 如果模型数据中直接包含system_prompt字段，则直接使用
      const selectedModelData = models.value.find(model => model.value === selectedModel.value);
      if (selectedModelData && selectedModelData.system_prompt) {
        defaultSystemPrompt.value = selectedModelData.system_prompt;
        if (isUsingDefaultPrompt.value || !systemPrompt.value.trim()) {
          systemPrompt.value = defaultSystemPrompt.value;
          isUsingDefaultPrompt.value = true;
        }
      } else {
        // 否则通过API获取默认模型的提示词
        await fetchModelPrompt(selectedModel.value);
      }
    }
  } catch (error) {
    console.error('获取模型数据失败:', error);
    showSnackbar('获取模型数据失败，请稍后重试');
  }
};

// 获取模型对应的提示词
const fetchModelPrompt = async (modelValue) => {
  try {
    const currentUser = store.getters['auth/user'];
    if (!currentUser || !currentUser.username) {
      return;
    }

    // 获取加密密钥
    const initialKey = 'text-to-speech-initial-key';
    const encryptedUsernameForKey = CryptoJS.AES.encrypt(currentUser.username, initialKey).toString();
    
    const keyResponse = await axios.get(API_URLS.ENCRYPTION_KEY, {
      params: { encryptedUsername: encryptedUsernameForKey }
    });
    const secretKey = keyResponse.data.key;

    // 准备请求数据
    const requestData = {
      model_name: modelValue,
      username: currentUser.username
    };

    // 加密请求数据
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(requestData),
      secretKey
    ).toString();

    // 发送加密后的请求
    const promptResponse = await axios.post(
      API_URLS.MODEL_PROMPT,
      {
        encryptedData,
        key: secretKey
      },
      {
        headers: {
          Authorization: `Bearer ${store.getters['auth/accessToken']}`
        }
      }
    );

    // 解析返回的提示词 - 解密服务器返回的数据
    if (promptResponse.data && promptResponse.data.encryptedData) {
      const decryptedBytes = CryptoJS.AES.decrypt(
        promptResponse.data.encryptedData, 
        promptResponse.data.key
      );
      const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
      
      if (decryptedData && decryptedData.prompt) {
        defaultSystemPrompt.value = decryptedData.prompt;
        
        // 如果用户未自定义提示词或正在使用默认提示词，则更新当前提示词
        if (isUsingDefaultPrompt.value || !systemPrompt.value.trim()) {
          systemPrompt.value = defaultSystemPrompt.value;
          isUsingDefaultPrompt.value = true;
        }
      }
    }
  } catch (error) {
    console.error('获取模型提示词失败:', error);
    showSnackbar('获取模型提示词失败，将使用默认提示词');
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
const selectModel = async (model) => {
  selectedModel.value = model.value;
  selectedModelLabel.value = model.label;
  closeModelModal();
  
  // 如果模型数据中直接包含system_prompt字段，则直接使用
  const selectedModelData = models.value.find(m => m.value === model.value);
  if (selectedModelData && selectedModelData.system_prompt) {
    defaultSystemPrompt.value = selectedModelData.system_prompt;
    if (isUsingDefaultPrompt.value || !systemPrompt.value.trim()) {
      systemPrompt.value = defaultSystemPrompt.value;
      isUsingDefaultPrompt.value = true;
    }
  } else {
    // 否则通过API获取新选择模型的提示词
    await fetchModelPrompt(model.value);
  }
};

// 计算模型头像
const selectedModelAvatar = computed(() => {
  const model = models.value.find(m => m.value === selectedModel.value);
  return model ? model.avatar_url : '';
});

// 计算代理后的音频URL
const proxyAudioUrl = computed(() => {
    if (!audioUrl.value) return '';
    return audioUrl.value;
});

// 显示提示信息
const showSnackbar = (message) => {
  // 删除可能存在的旧toast
  const existingToast = document.getElementById('custom-toast');
  if (existingToast) {
    document.body.removeChild(existingToast);
  }

  // 创建toast元素
  const toast = document.createElement('div');
  toast.id = 'custom-toast';
  toast.innerText = message;
  
  // 设置toast样式
  toast.style.position = 'fixed';
  toast.style.top = '80px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = '#42b983';
  toast.style.color = 'white';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 4px 12px rgba(66, 185, 131, 0.25)';
  toast.style.fontWeight = '500';
  toast.style.fontSize = '14px';
  toast.style.textAlign = 'center';
  toast.style.minWidth = '240px';
  toast.style.opacity = '0';
  toast.style.transition = 'all 0.3s ease-in-out';
  toast.style.backdropFilter = 'blur(4px)';
  toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  
  // 添加到body
  document.body.appendChild(toast);
  
  // 显示toast (使用setTimeout确保CSS过渡效果生效)
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);
  
  // 3秒后隐藏
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
    // 完全隐藏后移除元素
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
  
  // 不再使用原来的snackbar
  snackbarMessage.value = message;
  snackbar.value = false;
};

// 生成语音
const generateSpeech = async () => {
  if (!inputText.value.trim()) {
    showSnackbar('请输入文本');
    return;
  }

  const token = store.getters['auth/accessToken'];
  const currentUser = store.getters['auth/user'];
  console.log('当前登录状态：', {
    token,
    currentUser,
    isAuthenticated: store.getters['auth/isAuthenticated']
  });

  if (!currentUser || !currentUser.username) {
    showSnackbar('请先登入');
    router.replace('/login');
    return;
  }

  isLoading.value = true;
  try {
    let textToGenerate = inputText.value;

    if (isOpenAIGPT.value) {
      try {
        // 获取加密密钥
        const initialKey = 'text-to-speech-initial-key';
        const encryptedUsernameForKey = CryptoJS.AES.encrypt(currentUser.username, initialKey).toString();
        
        const keyResponse = await axios.get(API_URLS.ENCRYPTION_KEY, {
          params: { encryptedUsername: encryptedUsernameForKey }
        });
        const aiSecretKey = keyResponse.data.key;

        // 准备并加密请求数据
        const aiRequestData = {
          prompt: inputText.value,
          system: systemPrompt.value
        };

        // 加密请求数据
        const encryptedAiData = CryptoJS.AES.encrypt(
          JSON.stringify(aiRequestData),
          aiSecretKey
        ).toString();

        // 发送加密后的请求
        const response = await axios.post(
          API_URLS.CALL_DEEPSEEK,
          {
            encryptedData: encryptedAiData,
            key: aiSecretKey
          }
        );
        
        // 解密响应数据
        if (response.data.encryptedData) {
          const decryptedBytes = CryptoJS.AES.decrypt(response.data.encryptedData, aiSecretKey);
          const decryptedResponse = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
          textToGenerate = decryptedResponse.text;
        } else {
          textToGenerate = response.data.text;
        }
      } catch (error) {
        console.error('AI处理失败:', error);
        showSnackbar('AI处理失败，将使用原始文本');
      }
    }

    // 获取加密密钥
    const initialKey = 'text-to-speech-initial-key';
    const encryptedUsernameForKey = CryptoJS.AES.encrypt(currentUser.username, initialKey).toString();
    
    const keyResponse = await axios.get(API_URLS.ENCRYPTION_KEY, {
      params: { encryptedUsername: encryptedUsernameForKey }
    });
    const secretKey = keyResponse.data.key;

    // 准备请求数据
    const requestData = {
      text: textToGenerate,
      text_language: selectedLanguage.value,
      model_name: selectedModel.value,
      username: currentUser.username
    };

    // 加密请求数据
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(requestData),
      secretKey
    ).toString();

    // 发送加密后的请求
    const speechResponse = await axios.post(
      API_URLS.GENERATE_SPEECH,
      {
        encryptedData,
        key: secretKey
      },
      {
        headers: {
          Authorization: `Bearer ${store.getters['auth/accessToken']}`
        }
      }
    );

    audioUrl.value = speechResponse.data.downloadLink;
  } catch (error) {
    console.error('生成语音失败:', error);
    
    // 处理401错误
    if (error.response?.status === 401) {
      try {
        // 尝试刷新token
        await store.dispatch('auth/refreshToken');
        // 刷新成功后重试请求
        await generateSpeech();
        return;
      } catch (refreshError) {
        console.error('Token刷新失败:', refreshError);
        // 刷新失败，清除用户状态并重定向到登录页
        await store.dispatch('auth/logout');
        showSnackbar('登录已过期，请重新登录');
        router.replace('/login');
        return;
      }
    }
    
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
  // 标记为用户自定义提示词
  isUsingDefaultPrompt.value = false;
  closeSystemModal();
};

// 重置为默认提示词
const resetToDefaultPrompt = () => {
  if (defaultSystemPrompt.value) {
    systemPrompt.value = defaultSystemPrompt.value;
    isUsingDefaultPrompt.value = true;
    showSnackbar('已重置为模型默认提示词');
  } else {
    showSnackbar('无法获取默认提示词');
  }
};

// 下载处理函数
const handleDownload = async () => {
    try {
        if (!audioUrl.value) {
            throw new Error('没有可下载的音频文件');
        }
        
        // 从URL中获取原始文件名
        const url = new URL(audioUrl.value);
        const pathParts = url.pathname.split('/');
        const originalFileName = pathParts[pathParts.length - 1];
        
        // 直接从OSS下载
        const response = await fetch(audioUrl.value, {
            method: 'GET',
            headers: {
                'Accept': 'audio/wav'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = originalFileName; // 使用OSS中的原始文件名
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('下载失败:', error);
        showSnackbar('下载失败，请稍后重试');
    }
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
  position: relative;
  z-index: 1;
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
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  margin-bottom: 24px;
  resize: vertical;
  min-height: 120px;
  outline: none;
  background-color: white;
  color: #333;
  transition: all 0.3s ease;
}

.input-field:hover {
  border-color: #42b983;
}

.input-field:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.input-field::placeholder {
  color: #999;
  font-style: italic;
}

/* 下拉框样式 */
.select-wrapper {
  position: relative;
  width: 100%;
}

.select-field {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  background-color: white;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #333;
}

.select-field:hover {
  border-color: #42b983;
}

.select-field:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
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

.select-field:focus + .dropdown-icon {
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
  margin-bottom: 24px;
  position: relative;
}

.avatar-image {
  width: 120px;
  height: 120px;
  border-radius: 16px;
  border: 3px solid #42b983;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.avatar-image:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(66, 185, 131, 0.3);
}

/* 生成语音按钮样式优化 */
.generate-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #42b983, #3aa876);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.2);
}

.generate-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

.generate-button:active:not(:disabled) {
  transform: translateY(0);
}

.generate-button:disabled {
  background: #e0e0e0;
  cursor: not-allowed;
  box-shadow: none;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 音频预览样式优化 */
.audio-preview {
  margin-top: 32px;
  padding: 24px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #eee;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-title::before {
  content: '';
  width: 3px;
  height: 16px;
  background-color: #42b983;
  border-radius: 2px;
}

.audio-player {
  width: 100%;
  margin-bottom: 16px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.audio-player::-webkit-media-controls-panel {
  background-color: #f8f9fa;
  border-radius: 8px;
}

.audio-player::-webkit-media-controls-current-time-display,
.audio-player::-webkit-media-controls-time-remaining-display {
  color: #666;
}

.download-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #42b983, #3aa876);
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.2);
}

.download-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

.download-button:active {
  transform: translateY(0);
}

.download-button::before {
  content: '\f019';
  font-family: 'Font Awesome 5 Free';
  font-weight: 900;
  font-size: 14px;
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

/* Snackbar 样式 */
:deep(.snackbar) {
  position: fixed;
  top: 80px !important;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(66, 185, 131, 0.95);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideDown 0.3s ease-out;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 160px;
  justify-content: center;
  white-space: nowrap;
}

:deep(.snackbar)::before {
  content: '';
  width: 4px;
  height: 4px;
  background-color: white;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes slideDown {
  from {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 错误提示样式 */
:deep(.snackbar.error) {
  background: rgba(255, 77, 77, 0.95);
  box-shadow: 0 2px 12px rgba(255, 77, 77, 0.2);
}

/* 成功提示样式 */
:deep(.snackbar.success) {
  background: rgba(66, 185, 131, 0.95);
  box-shadow: 0 2px 12px rgba(66, 185, 131, 0.2);
}

/* 警告提示样式 */
:deep(.snackbar.warning) {
  background: rgba(255, 167, 38, 0.95);
  box-shadow: 0 2px 12px rgba(255, 167, 38, 0.2);
}

/* 模型选择样式 */
.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-field {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  background-color: white;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #333;
}

.select-field:hover {
  border-color: #42b983;
}

.select-field:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
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

.select-field:focus + .dropdown-icon {
  transform: translateY(-50%) rotate(180deg);
}

/* AI聊天功能开关优化 */
.newView {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.newView label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  color: #666;
  font-size: 14px;
}

.checkbox1 {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid #42b983;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chatSdButton-container {
  margin-top: 12px;
}

.chatSdButton-container .button {
  background-color: #f8f9fa;
  color: #42b983;
  border: 1px solid #42b983;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.chatSdButton-container .button:hover {
  background-color: #42b983;
  color: white;
}
</style>