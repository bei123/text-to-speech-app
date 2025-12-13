<template>
  <div class="app-container">
    <h1 class="page-title">自定义音色</h1>
    <p class="page-description">上传参考音频文件，使用 v2ProPlus 模型生成自定义音色语音</p>

    <!-- 文本输入框 -->
    <div class="form-group">
      <label for="input-text" class="form-label">输入要生成的文本：</label>
      <textarea 
        id="input-text"
        v-model="inputText" 
        placeholder="请输入要生成的文本" 
        class="input-field"
      ></textarea>
    </div>

    <!-- 语言选择 -->
    <div class="form-group">
      <label for="language-select" class="form-label">选择文本语言：</label>
      <div class="select-wrapper">
        <select id="language-select" v-model="selectedLanguage" class="select-field">
          <option v-for="language in languages" :key="language.value" :value="language.value">
            {{ language.label }}
          </option>
        </select>
        <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
      </div>
    </div>

    <!-- 参考音频上传区域 -->
    <div class="form-group">
      <label for="ref-audio-file" class="form-label">
        上传音色参考音频 (WAV/MP3，最大 50MB) <span class="required-mark">*</span>
      </label>
      <div class="help-text">
        <i class="fas fa-info-circle"></i>
        参考音频时长必须在 <strong>3-10秒</strong> 之间
      </div>
      <div class="help-text quality-tip">
        <i class="fas fa-microphone-alt"></i>
        <span>
          <strong>音频质量要求：</strong>
          最好要干净，无背景杂音，只有一个人的声音，清晰
        </span>
      </div>
      <div class="file-upload-wrapper">
        <input 
          type="file" 
          id="ref-audio-file" 
          ref="refAudioFileInput"
          @change="handleRefAudioFileChange" 
          accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3"
          class="file-input"
        />
        <label for="ref-audio-file" class="file-upload-label">
          <i class="fas fa-upload"></i>
          <span v-if="!refAudioFile">点击选择音频文件或拖拽文件到此处</span>
          <span v-else class="file-name">{{ refAudioFile.name }}</span>
        </label>
        <button v-if="refAudioFile" @click="clearRefAudioFile" class="clear-file-button" type="button">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div v-if="refAudioFile" class="file-info">
        <span>文件大小: {{ formatFileSize(refAudioFile.size) }}</span>
        <span v-if="isCheckingDuration" class="duration-checking">正在检查音频时长...</span>
        <span v-else-if="audioDuration !== null" :class="['duration-info', getDurationClass()]">
          时长: {{ formatDuration(audioDuration) }}
          <span v-if="!isDurationValid()" class="duration-warning">
            (要求3-10秒)
          </span>
        </span>
      </div>
    </div>

    <!-- 提示文本 -->
    <div class="form-group">
      <label for="prompt-text" class="form-label">
        提示文本 <span class="required-mark">*</span>
      </label>
      <div class="help-text">
        <i class="fas fa-info-circle"></i>
        提示文本必须与音色参考音频的内容完全一致
      </div>
      <textarea 
        id="prompt-text" 
        v-model="promptText" 
        placeholder="请输入与音色参考音频内容完全一致的文本" 
        class="input-field prompt-text-field"
        :class="{ 'input-error': promptTextError }"
      ></textarea>
      <div v-if="promptTextError" class="error-message">{{ promptTextError }}</div>
    </div>

    <!-- 提示语言 -->
    <div class="form-group">
      <label for="prompt-language-select" class="form-label">
        提示语言 <span class="required-mark">*</span>
      </label>
      <div class="select-wrapper">
        <select 
          id="prompt-language-select" 
          v-model="promptLanguage" 
          class="select-field"
          :class="{ 'input-error': promptLanguageError }"
        >
          <option value="">请选择提示语言</option>
          <option v-for="language in languages" :key="language.value" :value="language.value">
            {{ language.label }}
          </option>
        </select>
        <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
      </div>
      <div v-if="promptLanguageError" class="error-message">{{ promptLanguageError }}</div>
    </div>

    <!-- 预设管理区域 -->
    <div class="preset-section">
      <div class="preset-header">
        <h3 class="preset-title">音色预设</h3>
        <div class="preset-actions">
          <button @click="openPresetModal" class="button button-secondary" :disabled="!canSavePreset">
            <i class="fas fa-save"></i> 保存预设
          </button>
          <button @click="loadPresets" class="button button-secondary">
            <i class="fas fa-sync-alt"></i> 刷新
          </button>
        </div>
      </div>
      
      <!-- 预设选择 -->
      <div class="form-group">
        <label for="preset-select" class="form-label">选择预设（可选）：</label>
        <div class="select-wrapper">
          <select 
            id="preset-select" 
            v-model="selectedPresetId" 
            @change="loadPreset"
            class="select-field"
          >
            <option value="">不使用预设</option>
            <option v-for="preset in presets" :key="preset.id" :value="preset.id">
              {{ preset.name }} ({{ formatDate(preset.updated_at) }})
            </option>
          </select>
          <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
        </div>
      </div>

      <!-- 预设列表 -->
      <div v-if="presets.length > 0" class="preset-list">
        <div v-for="preset in presets" :key="preset.id" class="preset-item">
          <div class="preset-info">
            <div class="preset-name">{{ preset.name }}</div>
            <div class="preset-meta">
              <span>提示语言: {{ getLanguageLabel(preset.prompt_language) }}</span>
              <span>更新时间: {{ formatDate(preset.updated_at) }}</span>
            </div>
          </div>
          <div class="preset-item-actions">
            <button @click="selectPreset(preset)" class="preset-action-btn">
              <i class="fas fa-check"></i> 使用
            </button>
            <button @click="deletePreset(preset.id)" class="preset-action-btn delete-btn">
              <i class="fas fa-trash"></i> 删除
            </button>
          </div>
        </div>
      </div>
      <div v-else class="no-presets">
        <i class="fas fa-inbox"></i>
        <p>暂无预设，保存当前配置后可在此处快速使用</p>
      </div>
    </div>

    <!-- 生成语音按钮 -->
    <button 
      @click="generateSpeechWithReference" 
      :disabled="isLoading || !canGenerate" 
      class="button button-primary generate-button"
    >
      <span v-if="!isLoading">生成语音</span>
      <span v-else class="loading-spinner"></span>
    </button>

    <!-- 保存预设模态框 -->
    <div v-if="showPresetModal" class="modal-overlay" @click="closePresetModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>保存音色预设</h3>
          <button @click="closePresetModal" class="modal-close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="preset-name" class="form-label">预设名称 <span class="required-mark">*</span></label>
            <input 
              id="preset-name"
              v-model="presetName" 
              type="text" 
              placeholder="请输入预设名称"
              class="input-field"
              maxlength="50"
            />
          </div>
          <div class="preset-preview">
            <p><strong>将保存以下内容：</strong></p>
            <ul>
              <li>音色参考音频: {{ refAudioFile ? refAudioFile.name : '未选择' }}</li>
              <li>提示文本: {{ promptText || '未填写' }}</li>
              <li>提示语言: {{ getLanguageLabel(promptLanguage) || '未选择' }}</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closePresetModal" class="button button-cancel">取消</button>
          <button @click="savePreset" class="button button-primary" :disabled="!presetName.trim() || isSavingPreset">
            <span v-if="!isSavingPreset">保存</span>
            <span v-else class="loading-spinner"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- 语音预览 -->
    <div v-if="audioUrl" class="audio-preview">
      <h2 class="preview-title">预览</h2>
      <div class="waveform-container">
        <div ref="waveformRef" class="waveform"></div>
        <div class="waveform-controls">
          <button @click="togglePlay" class="play-button">
            <i :class="['fas', isPlaying ? 'fa-pause' : 'fa-play']"></i>
          </button>
          <div class="time-display">
            <span>{{ currentTime }}</span> / <span>{{ duration }}</span>
          </div>
        </div>
      </div>
      <button @click="handleDownload" class="button button-primary download-button">下载语音</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { API_URLS } from '@/constants/constants';
import WaveSurfer from 'wavesurfer.js';

const inputText = ref('');
const selectedLanguage = ref('all_zh');
const promptText = ref('');
const promptLanguage = ref('');
const refAudioFile = ref(null);
const refAudioFileInput = ref(null);
const audioUrl = ref('');
const isLoading = ref(false);
const audioDuration = ref(null); // 音频时长（秒）
const isCheckingDuration = ref(false); // 是否正在检查时长
const promptTextError = ref(''); // 提示文本错误信息
const promptLanguageError = ref(''); // 提示语言错误信息

// 预设相关
const presets = ref([]); // 预设列表
const selectedPresetId = ref(''); // 选中的预设ID
const showPresetModal = ref(false); // 显示保存预设模态框
const presetName = ref(''); // 预设名称
const isSavingPreset = ref(false); // 是否正在保存预设
const currentPresetAudioUrl = ref(null); // 当前使用的预设音频OSS URL（如果来自预设）

// 音频播放器相关
const waveformRef = ref(null);
const wavesurfer = ref(null);
const isPlaying = ref(false);
const currentTime = ref('0:00');
const duration = ref('0:00');

const languages = [
  { value: 'en', label: '英语' },
  { value: 'all_zh', label: '中文' },
  { value: 'all_yue', label: '粤语' },
  { value: 'all_ja', label: '日语' },
  { value: 'auto', label: '自动' }
];

const router = useRouter();
const store = useStore();

// 计算是否可以生成
const canGenerate = computed(() => {
  // 如果文件已选择但时长还没检查完，禁用按钮
  if (refAudioFile.value && isCheckingDuration.value) {
    return false;
  }
  // 如果时长已检查且无效，禁用按钮
  if (refAudioFile.value && audioDuration.value !== null && !isDurationValid()) {
    return false;
  }
  // 检查所有必填项
  return inputText.value.trim() && 
         refAudioFile.value && 
         promptText.value.trim() && 
         promptLanguage.value;
});

// 检查时长是否有效（3-10秒）
const isDurationValid = () => {
  if (audioDuration.value === null) return true; // 如果还没检查，先允许
  return audioDuration.value >= 3 && audioDuration.value <= 10;
};

// 获取时长样式类
const getDurationClass = () => {
  if (audioDuration.value === null) return '';
  if (isDurationValid()) return 'duration-valid';
  return 'duration-invalid';
};

// 格式化时长显示
const formatDuration = (seconds) => {
  if (!seconds) return '0秒';
  return `${seconds.toFixed(2)}秒`;
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

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
};

// 获取音频时长
const getAudioDuration = (file) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取音频文件'));
    });
    
    audio.src = url;
  });
};

// 处理参考音频文件选择
const handleRefAudioFileChange = async (event) => {
  const file = event.target.files[0];
  if (file) {
    // 验证文件类型
    const allowedTypes = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'];
    const allowedExtensions = ['.wav', '.mp3'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      showSnackbar('请选择有效的音频文件 (WAV 或 MP3)');
      event.target.value = '';
      return;
    }
    
    // 验证文件大小（50MB）
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showSnackbar('文件大小不能超过 50MB');
      event.target.value = '';
      return;
    }
    
    // 检查音频时长
    isCheckingDuration.value = true;
    audioDuration.value = null;
    
    try {
      const duration = await getAudioDuration(file);
      audioDuration.value = duration;
      
      if (duration < 3) {
        showSnackbar(`音频时长过短（${duration.toFixed(2)}秒），要求时长在3-10秒之间`);
      } else if (duration > 10) {
        showSnackbar(`音频时长过长（${duration.toFixed(2)}秒），要求时长在3-10秒之间`);
      }
    } catch (error) {
      console.error('获取音频时长失败:', error);
      // 即使获取时长失败，也允许上传，让后端验证
      audioDuration.value = null;
      showSnackbar('无法读取音频时长，将在上传时验证');
    } finally {
      isCheckingDuration.value = false;
    }
    
    refAudioFile.value = file;
  }
};

// 清除参考音频文件
const clearRefAudioFile = () => {
  refAudioFile.value = null;
  audioDuration.value = null;
  currentPresetAudioUrl.value = null; // 清除预设URL
  selectedPresetId.value = ''; // 清除预设选择
  if (refAudioFileInput.value) {
    refAudioFileInput.value.value = '';
  }
};

// 监听提示文本变化，清除错误信息
watch(promptText, () => {
  if (promptText.value.trim()) {
    promptTextError.value = '';
  }
});

// 监听提示语言变化，清除错误信息
watch(promptLanguage, () => {
  if (promptLanguage.value) {
    promptLanguageError.value = '';
  }
});

// 验证表单
const validateForm = () => {
  promptTextError.value = '';
  promptLanguageError.value = '';
  
  let isValid = true;
  
  if (!inputText.value.trim()) {
    showSnackbar('请输入要生成的文本');
    isValid = false;
  }
  
  if (!refAudioFile.value) {
    showSnackbar('请上传音色参考音频文件');
    isValid = false;
  }
  
  if (!promptText.value.trim()) {
    promptTextError.value = '提示文本为必填项';
    isValid = false;
  }
  
  if (!promptLanguage.value) {
    promptLanguageError.value = '提示语言为必选项';
    isValid = false;
  }
  
  // 验证音频时长
  if (refAudioFile.value && audioDuration.value !== null) {
    if (!isDurationValid()) {
      showSnackbar('参考音频时长必须在3-10秒之间');
      isValid = false;
    }
  }
  
  return isValid;
};

// 使用参考音频生成语音
const generateSpeechWithReference = async () => {
  // 验证表单
  if (!validateForm()) {
    return;
  }

  const currentUser = store.getters['auth/user'];

  if (!currentUser || !currentUser.username) {
    showSnackbar('请先登入');
    router.replace('/login');
    return;
  }

  // 开始生成新语音时，先隐藏之前的预览界面
  audioUrl.value = '';
  isLoading.value = true;

  try {
    // 创建 FormData
    const formData = new FormData();
    formData.append('text', inputText.value);
    formData.append('text_language', selectedLanguage.value);
    
    // 如果使用预设，直接发送OSS URL；否则上传文件
    if (currentPresetAudioUrl.value) {
      formData.append('ref_audio_url', currentPresetAudioUrl.value);
    } else {
      formData.append('ref_wav_file', refAudioFile.value);
    }
    
    formData.append('prompt_text', promptText.value || '');
    formData.append('prompt_language', promptLanguage.value || '');
    formData.append('model_name', 'v2ProPlus');

    // 发送请求
    const speechResponse = await axios.post(
      API_URLS.GENERATE_SPEECH_WITH_REFERENCE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${store.getters['auth/accessToken']}`
        }
      }
    );

    audioUrl.value = speechResponse.data.downloadLink;
    showSnackbar('语音生成成功');
  } catch (error) {
    console.error('生成语音失败:', error);

    // 处理401错误
    if (error.response?.status === 401) {
      try {
        // 尝试刷新token
        await store.dispatch('auth/refreshToken');
        // 刷新成功后重试请求
        await generateSpeechWithReference();
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

    const errorMessage = error.response?.data?.message || error.message || '生成语音失败，请稍后重试';
    showSnackbar(errorMessage);
  } finally {
    isLoading.value = false;
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

// 格式化时间
const formatTime = (seconds) => {
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// 初始化波形图
const initWaveform = () => {
  if (wavesurfer.value) {
    wavesurfer.value.destroy();
  }

  wavesurfer.value = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: '#42b983',
    progressColor: '#2c8d63',
    cursorColor: '#333',
    barWidth: 2,
    barRadius: 3,
    cursorWidth: 1,
    height: 80,
    barGap: 3,
    responsive: true,
    normalize: true,
    partialRender: true,
  });

  // 加载音频
  wavesurfer.value.load(audioUrl.value);

  // 事件监听
  wavesurfer.value.on('ready', () => {
    duration.value = formatTime(wavesurfer.value.getDuration());
  });

  wavesurfer.value.on('audioprocess', () => {
    currentTime.value = formatTime(wavesurfer.value.getCurrentTime());
  });

  wavesurfer.value.on('finish', () => {
    isPlaying.value = false;
  });
};

// 播放/暂停
const togglePlay = () => {
  if (wavesurfer.value) {
    wavesurfer.value.playPause();
    isPlaying.value = wavesurfer.value.isPlaying();
  }
};

// 监听音频URL变化
watch(audioUrl, (newUrl) => {
  if (newUrl) {
    nextTick(() => {
      initWaveform();
    });
  }
});

// 组件销毁时清理
onBeforeUnmount(() => {
  if (wavesurfer.value) {
    wavesurfer.value.destroy();
  }
});

// ========== 预设管理功能 ==========

// 获取语言标签
const getLanguageLabel = (value) => {
  const language = languages.find(lang => lang.value === value);
  return language ? language.label : value;
};

// 格式化日期
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

// 计算是否可以保存预设
const canSavePreset = computed(() => {
  return refAudioFile.value && promptText.value.trim() && promptLanguage.value;
});

// 加载预设列表
const loadPresets = async () => {
  try {
    const response = await axios.get(API_URLS.PRESET_LIST, {
      headers: {
        Authorization: `Bearer ${store.getters['auth/accessToken']}`
      }
    });
    presets.value = response.data.presets || [];
  } catch (error) {
    console.error('加载预设列表失败:', error);
    if (error.response?.status === 401) {
      try {
        await store.dispatch('auth/refreshToken');
        await loadPresets();
      } catch (refreshError) {
        showSnackbar('登录已过期，请重新登录');
        router.replace('/login');
      }
    } else {
      showSnackbar('加载预设列表失败');
    }
  }
};

// 打开保存预设模态框
const openPresetModal = () => {
  if (!canSavePreset.value) {
    showSnackbar('请先完成音色参考音频、提示文本和提示语言的设置');
    return;
  }
  presetName.value = '';
  showPresetModal.value = true;
};

// 关闭保存预设模态框
const closePresetModal = () => {
  showPresetModal.value = false;
  presetName.value = '';
};

// 保存预设
const savePreset = async () => {
  if (!presetName.value.trim()) {
    showSnackbar('请输入预设名称');
    return;
  }

  if (!refAudioFile.value) {
    showSnackbar('请先上传音色参考音频');
    return;
  }

  isSavingPreset.value = true;

  try {
    const formData = new FormData();
    formData.append('name', presetName.value.trim());
    formData.append('prompt_text', promptText.value);
    formData.append('prompt_language', promptLanguage.value);
    formData.append('ref_wav_file', refAudioFile.value);

    const response = await axios.post(API_URLS.PRESET_SAVE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${store.getters['auth/accessToken']}`
      }
    });

    showSnackbar('预设保存成功');
    closePresetModal();
    await loadPresets(); // 重新加载预设列表
  } catch (error) {
    console.error('保存预设失败:', error);
    if (error.response?.status === 401) {
      try {
        await store.dispatch('auth/refreshToken');
        await savePreset();
        return;
      } catch (refreshError) {
        showSnackbar('登录已过期，请重新登录');
        router.replace('/login');
        return;
      }
    }
    const errorMessage = error.response?.data?.message || '保存预设失败';
    showSnackbar(errorMessage);
  } finally {
    isSavingPreset.value = false;
  }
};

// 选择预设
const selectPreset = (preset) => {
  // 保存预设的OSS URL，这样生成语音时可以直接使用，无需重新上传
  currentPresetAudioUrl.value = preset.ref_audio_url;
  
  // 从 OSS URL 下载音频文件用于前端预览和时长检查
  fetch(preset.ref_audio_url)
    .then(response => response.blob())
    .then(blob => {
      const file = new File([blob], `preset_${preset.id}.wav`, { type: 'audio/wav' });
      refAudioFile.value = file;
      
      // 更新提示文本和提示语言
      promptText.value = preset.prompt_text;
      promptLanguage.value = preset.prompt_language;
      
      // 清除文件输入的错误状态
      promptTextError.value = '';
      promptLanguageError.value = '';
      
      // 检查音频时长
      getAudioDuration(file).then(duration => {
        audioDuration.value = duration;
        if (!isDurationValid()) {
          showSnackbar(`预设音频时长${duration.toFixed(2)}秒，不在3-10秒范围内`);
        }
      }).catch(() => {
        // 如果无法读取时长，继续使用
      });
      
      selectedPresetId.value = preset.id;
      showSnackbar(`已加载预设: ${preset.name}`);
    })
    .catch(error => {
      console.error('加载预设音频失败:', error);
      showSnackbar('加载预设音频失败');
    });
};

// 加载预设（从下拉框选择）
const loadPreset = () => {
  if (!selectedPresetId.value) {
    return;
  }
  const preset = presets.value.find(p => p.id === parseInt(selectedPresetId.value));
  if (preset) {
    selectPreset(preset);
  }
};

// 删除预设
const deletePreset = async (presetId) => {
  if (!confirm('确定要删除这个预设吗？')) {
    return;
  }

  try {
    await axios.delete(`${API_URLS.PRESET_DELETE}/${presetId}`, {
      headers: {
        Authorization: `Bearer ${store.getters['auth/accessToken']}`
      }
    });

    showSnackbar('预设删除成功');
    await loadPresets(); // 重新加载预设列表
    
    // 如果删除的是当前选中的预设，清除选择
    if (selectedPresetId.value == presetId) {
      selectedPresetId.value = '';
    }
  } catch (error) {
    console.error('删除预设失败:', error);
    if (error.response?.status === 401) {
      try {
        await store.dispatch('auth/refreshToken');
        await deletePreset(presetId);
        return;
      } catch (refreshError) {
        showSnackbar('登录已过期，请重新登录');
        router.replace('/login');
        return;
      }
    }
    showSnackbar('删除预设失败');
  }
};

// 组件挂载时加载预设列表
onMounted(() => {
  loadPresets();
});
</script>

<style scoped>
/* 通用样式 */
.app-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  color: #333;
  margin-bottom: 10px;
}

.page-description {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
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

.button-primary:hover:not(:disabled) {
  background-color: #3aa876;
}

.button-primary:disabled {
  background-color: #e0e0e0;
  cursor: not-allowed;
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
  box-sizing: border-box;
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

.prompt-text-field {
  min-height: 80px;
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
  box-sizing: border-box;
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

/* 表单组样式 */
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

/* 文件上传样式 */
.file-upload-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}

.file-upload-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #42b983, #3aa876);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  min-height: 48px;
}

.file-upload-label:hover {
  background: linear-gradient(135deg, #3aa876, #2c8d63);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

.file-upload-label i {
  font-size: 16px;
}

.file-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-file-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #ff4d4d;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 14px;
}

.clear-file-button:hover {
  background: #ff1a1a;
  transform: scale(1.1);
}

.file-info {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.duration-checking {
  color: #42b983;
  font-style: italic;
}

.duration-info {
  display: inline-block;
}

.duration-valid {
  color: #42b983;
  font-weight: 500;
}

.duration-invalid {
  color: #ff4d4d;
  font-weight: 500;
}

.duration-warning {
  color: #ff9800;
  margin-left: 4px;
}

.required-mark {
  color: #ff4d4d;
  margin-left: 4px;
}

.help-text {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: #f0f7ff;
  border-left: 3px solid #42b983;
  border-radius: 4px;
}

.help-text i {
  color: #42b983;
  font-size: 14px;
}

.help-text strong {
  color: #42b983;
  font-weight: 600;
}

.quality-tip {
  background-color: #fff7e6;
  border-left-color: #ff9800;
  margin-top: 8px;
}

.quality-tip i {
  color: #ff9800;
}

.quality-tip strong {
  color: #ff9800;
}

.input-error {
  border-color: #ff4d4d !important;
  box-shadow: 0 0 0 3px rgba(255, 77, 77, 0.1) !important;
}

.error-message {
  color: #ff4d4d;
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-message::before {
  content: '⚠';
  font-size: 14px;
}

/* 生成语音按钮样式 */
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
  margin-top: 10px;
}

.generate-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

.generate-button:active:not(:disabled) {
  transform: translateY(0);
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 音频预览样式 */
.audio-preview {
  margin-top: 32px;
  padding: 24px;
  background: linear-gradient(145deg, #ffffff, #f5f5f5);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(66, 185, 131, 0.1);
  border: 1px solid rgba(66, 185, 131, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.audio-preview:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(66, 185, 131, 0.15);
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(66, 185, 131, 0.1);
}

.preview-title::before {
  content: '';
  width: 4px;
  height: 20px;
  background: linear-gradient(to bottom, #42b983, #3aa876);
  border-radius: 4px;
}

.waveform-container {
  background: rgba(255, 255, 255, 0.8);
  padding: 24px;
  border-radius: 12px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
  border: 1px solid rgba(66, 185, 131, 0.1);
}

.waveform {
  width: 100%;
  background: rgba(66, 185, 131, 0.03);
  border-radius: 12px;
  padding: 15px;
  transition: all 0.3s ease;
}

.waveform:hover {
  background: rgba(66, 185, 131, 0.05);
}

.waveform-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
  padding: 0 10px;
}

.play-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(145deg, #42b983, #3aa876);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(66, 185, 131, 0.2);
}

.play-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(66, 185, 131, 0.3);
}

.play-button:active {
  transform: scale(0.98);
}

.play-button i {
  font-size: 18px;
  margin-left: 2px;
}

.time-display {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 15px;
  color: #42b983;
  background: rgba(66, 185, 131, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.download-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(145deg, #42b983, #3aa876);
  color: white;
  border-radius: 12px;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(66, 185, 131, 0.2);
  border: none;
  cursor: pointer;
}

.download-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(66, 185, 131, 0.3);
}

.download-button:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .app-container {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .audio-preview {
    padding: 16px;
  }

  .waveform-container {
    padding: 16px;
  }

  .play-button {
    width: 40px;
    height: 40px;
  }

  .time-display {
    font-size: 13px;
    padding: 6px 12px;
  }

  .download-button {
    padding: 12px 24px;
    font-size: 14px;
  }
}

/* 预设管理样式 */
.preset-section {
  margin-top: 30px;
  padding: 20px;
  background: linear-gradient(145deg, #ffffff, #f5f5f5);
  border-radius: 12px;
  border: 1px solid rgba(66, 185, 131, 0.2);
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(66, 185, 131, 0.1);
}

.preset-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.preset-actions {
  display: flex;
  gap: 10px;
}

.button-secondary {
  background-color: #f0f0f0;
  color: #42b983;
  border: 1px solid #42b983;
  padding: 8px 16px;
  font-size: 14px;
}

.button-secondary:hover:not(:disabled) {
  background-color: #42b983;
  color: white;
}

.button-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preset-list {
  margin-top: 15px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.preset-item:hover {
  border-color: #42b983;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.1);
}

.preset-info {
  flex: 1;
}

.preset-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
}

.preset-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
}

.preset-item-actions {
  display: flex;
  gap: 8px;
}

.preset-action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #42b983;
  color: white;
}

.preset-action-btn:hover {
  background-color: #3aa876;
  transform: translateY(-1px);
}

.preset-action-btn.delete-btn {
  background-color: #ff4d4d;
}

.preset-action-btn.delete-btn:hover {
  background-color: #ff1a1a;
}

.no-presets {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.no-presets i {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
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
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close-btn:hover {
  background-color: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.preset-preview {
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #42b983;
}

.preset-preview p {
  margin: 0 0 10px 0;
  font-weight: 600;
  color: #2c3e50;
}

.preset-preview ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.preset-preview li {
  margin-bottom: 5px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.button-cancel {
  background-color: #f0f0f0;
  color: #666;
  border: 1px solid #ddd;
}

.button-cancel:hover {
  background-color: #e0e0e0;
}
</style>

