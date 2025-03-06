<template>
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
    <div v-if="showModelModal" class="modal-overlay">
      <div class="modal-content">
        <h2>选择模型</h2>
        <div class="model-list">
          <div v-for="model in models" :key="model.value" class="model-item" @click="selectModel(model)">
            {{ model.label }}
          </div>
        </div>
        <div class="modal-buttons">
          <button @click="closeModelModal" class="modal-button modal-button-cancel">关闭</button>
        </div>
      </div>
    </div>


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
      <button v-if="isOpenAIGPT" type="primary" class="chatSdButton" plain="true" size="mini" @click="openSystemModal">
        设置聊天模型人设
      </button>
    </div>

    <!-- 生成语音按钮 -->
    <button @click="generateSpeech" :disabled="isLoading" class="generate-button">
      <span v-if="!isLoading">生成语音</span>
      <span v-else class="loading-spinner"></span>
    </button>

    <!-- 语音预览 -->
    <div v-if="audioUrl" class="audio-preview">
      <h2 class="preview-title">预览</h2>
      <audio :src="audioUrl" controls class="audio-player"></audio>
      <a :href="audioUrl" download="speech.wav" class="download-button">下载语音</a>
    </div>

    <!-- 设置 SYSTEM 的模态框 -->
    <div v-if="showSystemModal" class="modal-overlay">
      <div class="modal-content">
        <h2>设置聊天模型人设</h2>
        <textarea v-model="systemPrompt" placeholder="请输入 SYSTEM 提示词（例如：你是一个助手）" class="modal-textarea"></textarea>
        <div class="modal-buttons">
          <button @click="saveSystemPrompt" class="modal-button">保存</button>
          <button @click="closeSystemModal" class="modal-button modal-button-cancel">取消</button>
        </div>
      </div>
    </div>

    <!-- 底部图标 -->
    <div class="footer-icon" @click="goToSponsorsPage">
      <span class="icon-text">为爱发电的人们</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import axios from 'axios';


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

const languages = ref([
  { value: 'en', label: '英语' },
  { value: 'all_zh', label: '中文' },
  { value: 'all_yue', label: '粤语' },
  { value: 'all_ja', label: '日语' },
  { value: 'auto', label: '自动' }
]);

const router = useRouter();
const store = useStore();

// 获取模型数据
const fetchModels = async () => {
  try {
    const response = await axios.get('http://127.0.0.1:5000/models');
    models.value = response.data;
    if (models.value.length > 0) {
      selectedModel.value = models.value[0].value;
    }
  } catch (error) {
    console.error('获取模型数据失败:', error);
    alert('获取模型数据失败，请稍后重试');
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

onMounted(() => {
  fetchModels();
});

const selectedModelAvatar = computed(() => {
  const model = models.value.find(m => m.value === selectedModel.value);
  return model ? model.avatar_url : '';
});


const goToSponsorsPage = () => {
  router.push('/sponsors');
};


const logoutUser = () => {
  store.dispatch('logout');
  router.push('/login');
};

// 生成语音
const generateSpeech = async () => {
  if (!inputText.value.trim()) {
    alert('请输入文本');
    return;
  }

  // 检查用户是否登录
  const currentUser = store.getters.currentUser;
  if (!currentUser || !currentUser.username) {
    alert('请先登录');
    router.push('/login'); // 跳转到登录页面
    return;
  }

  isLoading.value = true;
  try {
    let textToGenerate = inputText.value;

    // 如果开启了 AI 聊天功能，调用 DeepSeek API
    if (isOpenAIGPT.value) {
      const response = await axios.post(
        'http://127.0.0.1:5000/call-deepseek',
        {
          prompt: inputText.value,
          system: systemPrompt.value // 传递用户自定义的 SYSTEM 提示词
        }
      );
      textToGenerate = response.data.text; // 使用 DeepSeek 返回的文本
    }

    // 获取当前用户的用户名
    const username = currentUser.username;

    // 调用生成语音接口
    const speechResponse = await axios.post(
      'http://127.0.0.1:5000/generate-speech',
      {
        text: textToGenerate,
        text_language: selectedLanguage.value,
        model_name: selectedModel.value,
        username: username // 传递当前用户的用户名
      },
      {
        headers: {
          Authorization: `Bearer ${store.state.token}`
        }
      }

    );

    // 更新音频 URL
    audioUrl.value = speechResponse.data.downloadLink;
  } catch (error) {
    console.error('生成语音失败:', error);
    alert('生成语音失败，请稍后重试');
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
    alert('请输入 SYSTEM 提示词');
    return;
  }
  closeSystemModal();
};

onMounted(() => {
  fetchModels();
});


</script>

<style scoped>
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

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.modal-button {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px;
}

.modal-button-cancel {
  background-color: #ff4d4d;
}

.modal-button-cancel:hover {
  background-color: #ff1a1a;
}

.select-field {
  width: 100%;
  padding: 12px 36px 12px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  background-color: white;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  height: 50px;
  /* 设置固定高度 */
  overflow-y: auto;
  /* 启用垂直滚动条 */
}

.select-field option {
  padding: 8px 12px;
  /* 增加内边距 */
  font-size: 14px;
  /* 设置字体大小 */
  cursor: pointer;
  /* 鼠标悬停时显示指针 */
}

.select-field option:hover {
  background-color: #f0f0f0;
  /* 鼠标悬停时的背景色 */
}

.select-field:focus {
  border-color: #42b983;
  box-shadow: 0 0 5px rgba(66, 185, 131, 0.5);
  overflow-y: auto;
  /* 确保在聚焦时显示滚动条 */
}

.select-wrapper {
  position: relative;
  width: 100%;
  max-height: 150px;
  /* 设置最大高度 */
  overflow-y: auto;
  /* 启用垂直滚动条 */
}

.text-to-speech-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

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

.icon-image {
  width: 24px;
  height: 24px;
  margin-right: 8px;
}

.icon-text {
  font-size: 14px;
  color: white;
}

.model-avatar {
  text-align: center;
  margin-bottom: 20px;
}

.avatar-image {
  width: 150px;
  /* 设置宽度为 500px */
  height: 150px;
  /* 设置高度为 500px */
  border-radius: 20px;
  /* 设置圆角 */
  border: 2px solid #42b983;
  /* 添加边框 */
  object-fit: cover;
  /* 确保图片填充整个区域 */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  /* 添加阴影效果 */
}

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

.input-field {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 20px;
  resize: vertical;
  outline: none;
}

.input-field:focus {
  border-color: #42b983;
  box-shadow: 0 0 5px rgba(66, 185, 131, 0.5);
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #555;
  margin-bottom: 8px;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-field {
  width: 100%;
  padding: 12px 36px 12px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  background-color: white;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.select-field:focus {
  border-color: #42b983;
  box-shadow: 0 0 5px rgba(66, 185, 131, 0.5);
}

.dropdown-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #666;
  font-size: 12px;
  transition: transform 0.3s ease;
}

.select-field:focus+.dropdown-icon {
  transform: translateY(-50%) rotate(180deg);
}

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