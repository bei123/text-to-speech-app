<template>
  <div class="app-container">
    <h1 class="page-title">自定义音色</h1>
    <p class="page-description">上传参考音频文件，使用 v2ProPlus 模型生成自定义音色语音</p>

    <!-- 主要操作区域：预设选择 + 文本输入（一体化流程） -->
    <div class="main-action-section">
      <!-- 预设快速选择（更显眼） -->
      <div v-if="presets.length > 0" class="preset-quick-section">
        <label class="preset-quick-label">
          <i class="fas fa-star"></i> 快速使用预设（可选）
        </label>
        <div class="preset-quick-select-wrapper">
          <div class="select-wrapper">
            <select 
              id="preset-select" 
              v-model="selectedPresetId" 
              @change="handlePresetSelectChange"
              class="select-field preset-select-field"
            >
              <option value="">不使用预设，手动配置</option>
              <option v-for="preset in presets" :key="preset.id" :value="preset.id">
                {{ preset.name }}
              </option>
            </select>
            <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
          </div>
          <button v-if="selectedPresetId || isExternalPreset" @click="clearPreset" class="clear-preset-btn-small" type="button" title="清除预设">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div v-if="selectedPresetId || isExternalPreset" class="preset-active-badge">
          <i class="fas fa-check-circle"></i>
          <span>已选择: {{ selectedPresetId ? getPresetName(selectedPresetId) : '外部预设' }}</span>
        </div>
      </div>

      <!-- 文本输入区域（核心操作） -->
      <div class="text-input-section">
        <label for="input-text" class="form-label main-label">
          <i class="fas fa-edit"></i> 输入要生成的文本 <span class="required-mark">*</span>
        </label>
        <textarea 
          id="input-text"
          ref="inputTextRef"
          v-model="inputText" 
          placeholder="请输入要生成的文本..." 
          class="input-field main-textarea"
          rows="4"
        ></textarea>
        
        <div class="language-row">
          <label for="language-select" class="form-label inline-label">文本语言：</label>
          <div class="select-wrapper inline-select">
            <select id="language-select" v-model="selectedLanguage" class="select-field">
              <option v-for="language in languages" :key="language.value" :value="language.value">
                {{ language.label }}
              </option>
            </select>
            <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
          </div>
        </div>
      </div>

      <!-- 生成按钮（显眼位置） -->
      <button 
        @click="generateSpeechWithReference" 
        :disabled="isLoading || !canGenerate" 
        class="button button-primary generate-button-large"
      >
        <i class="fas" :class="isLoading ? 'fa-spinner fa-spin' : 'fa-magic'"></i>
        <span v-if="!isLoading">生成语音</span>
        <span v-else>生成中...</span>
      </button>
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

    <!-- 音色配置区域（可折叠，使用预设时自动隐藏） -->
    <div class="config-section" :class="{ 'section-collapsed': selectedPresetId || isExternalPreset, 'section-disabled': selectedPresetId || isExternalPreset }">
      <div class="section-header-toggle" @click="toggleConfigSection">
        <h3 class="section-title">
          <i class="fas fa-cog"></i> 音色配置
          <span v-if="selectedPresetId || isExternalPreset" class="preset-indicator">
            <i class="fas fa-lock"></i> 已通过预设自动填充（不可修改）
          </span>
        </h3>
        <i class="fas toggle-icon" :class="showConfigSection ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </div>
      
      <div v-if="showConfigSection" class="section-content" :class="{ 'content-disabled': selectedPresetId || isExternalPreset }">

      <!-- 参考音频上传区域 -->
      <div class="form-group">
        <label for="ref-audio-file" class="form-label">
          上传音色参考音频 <span class="required-mark">*</span>
          <span v-if="selectedPresetId || isExternalPreset" class="readonly-badge">只读</span>
        </label>
        <div class="help-text-group">
          <div class="help-text">
            <i class="fas fa-info-circle"></i>
            <div class="help-text-content">
              <div class="help-text-main">
                时长必须在 <strong>3-10秒</strong> 之间，支持格式：WAV/MP3/M4A/AAC/OGG/FLAC，最大 50MB
              </div>
              <div class="help-text-sub">
                <i class="fas fa-magic"></i>
                <span>非 WAV 格式将自动转换为 WAV</span>
              </div>
            </div>
          </div>
          <div class="help-text quality-tip">
            <i class="fas fa-microphone-alt"></i>
            <div class="help-text-content">
              <strong>质量要求：</strong>干净、无背景杂音、单人声音、清晰
            </div>
          </div>
        </div>
        <div 
          class="file-upload-wrapper" 
          :class="{ 'disabled': selectedPresetId || isExternalPreset, 'drag-over': isDragOver }"
          :key="`file-upload-${isExternalPreset}-${selectedPresetId}-${refAudioFile?.name || 'none'}`"
          @dragover.prevent="handleDragOver"
          @dragenter.prevent="handleDragEnter"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <input 
            type="file" 
            id="ref-audio-file" 
            ref="refAudioFileInput"
            @change="handleRefAudioFileChange" 
            accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac"
            class="file-input"
            :disabled="!!selectedPresetId || isExternalPreset"
          />
          <label for="ref-audio-file" class="file-upload-label" :class="{ 'disabled': selectedPresetId || isExternalPreset }">
            <i class="fas fa-upload"></i>
            <span v-if="!refAudioFile">点击选择音频文件或拖拽到此处</span>
            <span v-else class="file-name">{{ refAudioFile.name }}</span>
          </label>
          <button 
            v-if="refAudioFile && !selectedPresetId && !isExternalPreset" 
            @click="clearRefAudioFile" 
            class="clear-file-button" 
            type="button" 
            title="清除文件"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div v-if="refAudioFile" class="file-info" :key="`file-info-${refAudioFile?.name || 'none'}-${refAudioFile?.size || 0}`">
          <span class="file-info-item">文件大小: {{ formatFileSize(refAudioFile.size) }}</span>
          <span v-if="isCheckingDuration" class="duration-checking">正在检查音频时长...</span>
          <span v-else-if="audioDuration !== null" :class="['duration-info', getDurationClass()]">
            时长: {{ formatDuration(audioDuration) }}
            <span v-if="!isDurationValid()" class="duration-warning">(要求3-10秒)</span>
          </span>
        </div>
      </div>

      <!-- 提示文本和提示语言（并排显示） -->
      <div class="form-row">
        <div class="form-group form-group-half">
          <label for="prompt-text" class="form-label">
            提示文本 <span class="required-mark">*</span>
            <span v-if="selectedPresetId || isExternalPreset" class="readonly-badge">只读</span>
          </label>
          <div class="help-text-inline">
            <i class="fas fa-info-circle"></i>
            必须与参考音频内容完全一致
          </div>
          <textarea 
            id="prompt-text" 
            :value="promptText"
            @input="promptText = $event.target.value"
            :key="`prompt-text-${isExternalPreset}-${selectedPresetId}`"
            placeholder="请输入与音色参考音频内容完全一致的文本" 
            class="input-field prompt-text-field"
            :class="{ 'input-error': promptTextError, 'readonly': selectedPresetId }"
                      :readonly="!!selectedPresetId || isExternalPreset"
          ></textarea>
          <div v-if="promptTextError" class="error-message">{{ promptTextError }}</div>
        </div>

        <div class="form-group form-group-half">
          <label for="prompt-language-select" class="form-label">
            提示语言 <span class="required-mark">*</span>
            <span v-if="selectedPresetId || isExternalPreset" class="readonly-badge">只读</span>
          </label>
          <div class="select-wrapper">
            <select 
              id="prompt-language-select" 
              :value="promptLanguage"
              @change="promptLanguage = $event.target.value"
              :key="`prompt-language-${isExternalPreset}-${selectedPresetId}-${promptLanguage}`"
              class="select-field"
              :class="{ 'input-error': promptLanguageError, 'readonly': selectedPresetId }"
                      :disabled="!!selectedPresetId || isExternalPreset"
            >
              <option value="">请选择</option>
              <option v-for="language in languages" :key="language.value" :value="language.value">
                {{ language.label }}
              </option>
            </select>
            <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
          </div>
          <div v-if="promptLanguageError" class="error-message">{{ promptLanguageError }}</div>
        </div>
      </div>
      </div>
    </div>

    <!-- 预设管理区域（折叠式） -->
    <div class="preset-section preset-section-bottom">
      <div class="preset-header" @click="togglePresetList">
        <h3 class="preset-title">
          <i class="fas" :class="showPresetList ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          预设管理
        </h3>
        <div class="preset-actions" @click.stop>
          <button @click.stop="openPresetModal" class="button button-secondary" :disabled="!canSavePreset">
            <i class="fas fa-save"></i> 保存当前配置
          </button>
        </div>
      </div>
      
      <!-- 预设列表（可折叠） -->
      <div v-if="showPresetList" class="preset-list-container">
        <div v-if="presets.length > 0" class="preset-list">
          <div 
            v-for="preset in presets" 
            :key="preset.id" 
            class="preset-item"
            :class="{ 'preset-active': selectedPresetId == preset.id }"
          >
            <div class="preset-info" @click="selectPreset(preset)">
              <div class="preset-name">
                <i v-if="selectedPresetId == preset.id" class="fas fa-check-circle active-icon"></i>
                {{ preset.name }}
              </div>
              <div class="preset-meta">
                <span><i class="fas fa-language"></i> {{ getLanguageLabel(preset.prompt_language) }}</span>
                <span><i class="fas fa-clock"></i> {{ formatDate(preset.updated_at) }}</span>
              </div>
            </div>
            <div class="preset-item-actions" @click.stop>
              <button @click="selectPreset(preset)" class="preset-action-btn" :class="{ 'active': selectedPresetId == preset.id }">
                <i class="fas fa-check"></i> {{ selectedPresetId == preset.id ? '已使用' : '使用' }}
              </button>
              <button 
                @click="toggleSharePreset(preset)" 
                class="preset-action-btn share-btn" 
                :class="{ 'shared': preset.is_shared == 1 || preset.is_shared === true }"
                :title="(preset.is_shared == 1 || preset.is_shared === true) ? '取消分享' : '分享到圈子'"
              >
                <i class="fas" :class="(preset.is_shared == 1 || preset.is_shared === true) ? 'fa-share-alt' : 'fa-share'"></i>
                {{ (preset.is_shared == 1 || preset.is_shared === true) ? '已分享' : '分享' }}
              </button>
              <button @click="deletePreset(preset.id)" class="preset-action-btn delete-btn" title="删除预设">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="no-presets">
          <i class="fas fa-inbox"></i>
          <p>暂无预设，完成上方配置后点击"保存当前配置"按钮创建预设</p>
        </div>
      </div>
    </div>


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
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, onActivated, watch, watchEffect, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import CryptoJS from 'crypto-js';
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

// 保存外部预设的原始数据，用于恢复
const externalPresetBackup = ref({
  refAudioFile: null,
  presetAudioUrl: null,
  promptText: '',
  promptLanguage: ''
});
const showPresetList = ref(false); // 是否显示预设列表
const showConfigSection = ref(true); // 是否显示配置区域
const isExternalPreset = ref(false); // 是否是外部预设（从圈子页面来的）
const inputTextRef = ref(null); // 文本输入框引用
const isDragOver = ref(false); // 是否正在拖拽

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
const route = useRoute();
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
  // 在计算前，先尝试恢复外部预设数据（如果值丢失了）
  // 这确保在 canGenerate 计算时，值已经被恢复
  if ((!refAudioFile.value || !currentPresetAudioUrl.value) && 
      (externalPresetBackup.value.refAudioFile || externalPresetBackup.value.presetAudioUrl)) {
    // 如果值丢失但备份存在，立即恢复
    restoreExternalPreset();
  }
  
  // 检查所有必填项
  // 注意：使用预设时，refAudioFile 可能为空，但 currentPresetAudioUrl 会有值
  const hasAudio = refAudioFile.value || currentPresetAudioUrl.value;
  const hasInputText = !!inputText.value.trim();
  const hasPromptText = !!promptText.value.trim();
  const hasPromptLanguage = !!promptLanguage.value;
  
  const result = hasInputText && hasAudio && hasPromptText && hasPromptLanguage;
  
  // 如果检查失败且备份存在，再次尝试恢复
  if (!result && (externalPresetBackup.value.refAudioFile || externalPresetBackup.value.presetAudioUrl) && !hasAudio) {
    restoreExternalPreset();
  }
  
  return result;
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

// 将音频文件转换为 WAV 格式
const convertToWav = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 解码音频文件
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // 转换为 WAV
        const wavBuffer = audioBufferToWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        
        // 创建新的 File 对象
        const fileName = file.name.replace(/\.[^/.]+$/, '') + '.wav';
        const wavFile = new File([wavBlob], fileName, { type: 'audio/wav' });
        
        resolve(wavFile);
      } catch (error) {
        console.error('音频转换失败:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// 将 AudioBuffer 转换为 WAV 格式
const audioBufferToWav = (buffer) => {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // WAV 文件头
  const setUint16 = (data) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF 标识
  setUint32(0x46464952); // "RIFF"
  setUint32(length * numberOfChannels * 2 + 36); // 文件大小 - 8
  setUint32(0x45564157); // "WAVE"

  // fmt 子块
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // 子块大小
  setUint16(1); // 音频格式 (PCM)
  setUint16(numberOfChannels); // 声道数
  setUint32(sampleRate); // 采样率
  setUint32(sampleRate * numberOfChannels * 2); // 字节率
  setUint16(numberOfChannels * 2); // 块对齐
  setUint16(16); // 位深度

  // data 子块
  setUint32(0x61746164); // "data"
  setUint32(length * numberOfChannels * 2); // 数据大小

  // 写入 PCM 数据
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < arrayBuffer.byteLength) {
    for (let i = 0; i < numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return arrayBuffer;
};

// 处理参考音频文件选择
const handleRefAudioFileChange = async (event) => {
  // 如果使用预设，不允许修改
  if (selectedPresetId.value || isExternalPreset.value) {
    event.target.value = ''; // 清空选择
    showSnackbar('使用预设时不允许修改音色配置，请先清除预设');
    return;
  }
  
  const file = event.target.files[0];
  if (file) {
    await processAudioFile(file);
  }
};

// 统一的音频文件处理函数
const processAudioFile = async (file) => {
  // 验证文件类型
  const allowedTypes = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac'];
  const allowedExtensions = ['.wav', '.mp3', '.m4a', '.aac', '.ogg', '.flac'];
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    showSnackbar('请选择有效的音频文件 (WAV, MP3, M4A, AAC, OGG, FLAC)');
    if (refAudioFileInput.value) {
      refAudioFileInput.value.value = '';
    }
    return;
  }
  
  // 验证文件大小（50MB）
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    showSnackbar('文件大小不能超过 50MB');
    if (refAudioFileInput.value) {
      refAudioFileInput.value.value = '';
    }
    return;
  }
  
  // 检查是否需要转换（如果不是 WAV 格式）
  const isWav = file.type === 'audio/wav' || file.type === 'audio/wave' || file.type === 'audio/x-wav' || fileExtension === '.wav';
  let processedFile = file;
  
  if (!isWav) {
    // 显示转换提示
    showSnackbar('正在将音频转换为 WAV 格式...');
    try {
      processedFile = await convertToWav(file);
      showSnackbar('音频已转换为 WAV 格式');
    } catch (error) {
      console.error('音频转换失败:', error);
      showSnackbar('音频转换失败，将使用原文件');
      // 如果转换失败，继续使用原文件
    }
  }
  
  // 检查音频时长
  isCheckingDuration.value = true;
  audioDuration.value = null;
  
  try {
    const duration = await getAudioDuration(processedFile);
    audioDuration.value = duration;
    
    if (duration < 3) {
      showSnackbar(`音频时长过短（${formatDuration(duration)}），要求时长在3-10秒之间`);
    } else if (duration > 10) {
      showSnackbar(`音频时长过长（${formatDuration(duration)}），要求时长在3-10秒之间`);
    }
  } catch (error) {
    console.error('获取音频时长失败:', error);
    audioDuration.value = null;
    showSnackbar('无法读取音频时长，将在上传时验证');
  } finally {
    isCheckingDuration.value = false;
  }
  
  refAudioFile.value = processedFile;
};

// 拖拽上传相关函数
const handleDragOver = (event) => {
  if (selectedPresetId.value || isExternalPreset.value) {
    return;
  }
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragEnter = (event) => {
  if (selectedPresetId.value || isExternalPreset.value) {
    return;
  }
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  if (selectedPresetId.value || isExternalPreset.value) {
    return;
  }
  // 只有当离开整个上传区域时才取消高亮
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragOver.value = false;
  }
};

const handleDrop = async (event) => {
  if (selectedPresetId.value || isExternalPreset.value) {
    showSnackbar('使用预设时不允许修改音色配置，请先清除预设');
    isDragOver.value = false;
    return;
  }
  
  event.preventDefault();
  isDragOver.value = false;
  
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    await processAudioFile(file);
  }
};

// 清除参考音频文件
const clearRefAudioFile = () => {
  // 如果使用预设，不允许清除
  if (selectedPresetId.value || isExternalPreset.value) {
    showSnackbar('使用预设时不允许修改音色配置，请先清除预设');
    return;
  }
  refAudioFile.value = null;
  audioDuration.value = null;
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

// 监听外部预设状态，防止 refAudioFile 和 currentPresetAudioUrl 被意外清空
// 使用 watchEffect 持续监控，确保值不会被清空
let isRestoring = false; // 防止无限循环
let restoreTimeout = null; // 恢复定时器

// 恢复函数，可以在多个地方调用
const restoreExternalPreset = () => {
  if (isRestoring) {
    return; // 正在恢复中，避免重复
  }
  
  // 首先检查是否有全局恢复函数（从 router.replace 后设置的）
  if (typeof window !== 'undefined' && window._restorePresetValues) {
    try {
      window._restorePresetValues();
      // 恢复后清除全局函数，避免重复调用
      delete window._restorePresetValues;
      return;
    } catch (error) {
      console.error('执行全局恢复函数失败:', error);
    }
  }
  
  // 如果 externalPresetBackup 有值，即使 isExternalPreset 为 false，也尝试恢复
  // 这样可以处理用户预设列表加载后，预设被识别为用户预设但值丢失的情况
  const hasBackup = externalPresetBackup.value.refAudioFile || externalPresetBackup.value.presetAudioUrl;
  
  if (hasBackup) {
    // 检查是否需要恢复（即使 isExternalPreset 为 false，只要有备份就恢复）
    const needsRestore = 
      (!refAudioFile.value && externalPresetBackup.value.refAudioFile) ||
      (!currentPresetAudioUrl.value && externalPresetBackup.value.presetAudioUrl) ||
      (!promptText.value && externalPresetBackup.value.promptText) ||
      (!promptLanguage.value && externalPresetBackup.value.promptLanguage);
    
    if (needsRestore) {
      // 清除之前的定时器
      if (restoreTimeout) {
        clearTimeout(restoreTimeout);
      }
      
      isRestoring = true;
      // 注意：不要强制设置 isExternalPreset，因为预设可能是用户预设
      // 只要恢复值即可
      
      // 立即恢复，不等待 nextTick
      if (!refAudioFile.value && externalPresetBackup.value.refAudioFile) {
        refAudioFile.value = externalPresetBackup.value.refAudioFile;
      }
      if (!currentPresetAudioUrl.value && externalPresetBackup.value.presetAudioUrl) {
        currentPresetAudioUrl.value = externalPresetBackup.value.presetAudioUrl;
      }
      if (!promptText.value && externalPresetBackup.value.promptText) {
        promptText.value = externalPresetBackup.value.promptText;
      }
      if (!promptLanguage.value && externalPresetBackup.value.promptLanguage) {
        promptLanguage.value = externalPresetBackup.value.promptLanguage;
      }
      
      // 延迟重置标志，确保恢复完成
      restoreTimeout = setTimeout(() => {
        isRestoring = false;
        restoreTimeout = null;
      }, 50);
    }
  }
};

// 使用 watchEffect 持续监控
watchEffect(() => {
  // 访问这些值以建立依赖关系（使用 void 避免 ESLint 警告）
  void refAudioFile.value;
  void currentPresetAudioUrl.value;
  void isExternalPreset.value;
  void promptText.value;
  void promptLanguage.value;
  
  // 调用恢复函数
  restoreExternalPreset();
});

// 也监听 canGenerate 计算属性的变化，在计算时检查并恢复
watch(() => canGenerate.value, () => {
  // 当 canGenerate 重新计算时，检查并恢复外部预设数据
  restoreExternalPreset();
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
  
  // 检查音频文件（可以是上传的文件或预设的OSS URL）
  if (!refAudioFile.value && !currentPresetAudioUrl.value) {
    showSnackbar('请上传音色参考音频文件或选择预设');
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
    // 获取加密密钥
    const initialKey = 'text-to-speech-initial-key';
    const encryptedUsernameForKey = CryptoJS.AES.encrypt(currentUser.username, initialKey).toString();

    const keyResponse = await axios.get(API_URLS.ENCRYPTION_KEY, {
      params: { encryptedUsername: encryptedUsernameForKey }
    });
    const secretKey = keyResponse.data.key;

    // 准备要加密的文本数据
    const textData = {
      text: inputText.value,
      text_language: selectedLanguage.value,
      prompt_text: promptText.value || '',
      prompt_language: promptLanguage.value || '',
      username: currentUser.username
    };

    // 如果使用预设，也包含 ref_audio_url
    if (currentPresetAudioUrl.value) {
      textData.ref_audio_url = currentPresetAudioUrl.value;
    }

    // 加密文本数据
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(textData),
      secretKey
    ).toString();

    // 创建 FormData
    const formData = new FormData();
    formData.append('encryptedData', encryptedData);
    formData.append('key', secretKey);
    
    // 如果使用预设，不发送文件；否则上传文件
    if (!currentPresetAudioUrl.value) {
      formData.append('ref_wav_file', refAudioFile.value);
    }

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

// 获取预设名称
const getPresetName = (presetId) => {
  const preset = presets.value.find(p => p.id === parseInt(presetId));
  return preset ? preset.name : '';
};

// 切换预设列表显示
const togglePresetList = () => {
  showPresetList.value = !showPresetList.value;
};

// 切换配置区域显示
const toggleConfigSection = () => {
  showConfigSection.value = !showConfigSection.value;
};

// 清除预设选择（包括用户预设和外部预设）
const clearPreset = () => {
  // 清除用户预设
  selectedPresetId.value = '';
  
  // 清除外部预设标志
  isExternalPreset.value = false;
  
  // 清除所有预设相关的URL（确保完全清除）
  currentPresetAudioUrl.value = null;
  
  // 清除外部预设备份（包括URL）
  externalPresetBackup.value = {
    refAudioFile: null,
    presetAudioUrl: null, // 确保外部预设的URL被清除
    promptText: '',
    promptLanguage: ''
  };
  
  // 清除音频文件和时长
  clearRefAudioFile();
  
  // 清除提示文本和语言
  promptText.value = '';
  promptLanguage.value = '';
  
  // 清除预览音频
  audioUrl.value = '';
  
  // 展开配置区域，允许手动配置
  showConfigSection.value = true;
  
  // 清除地址栏中的预设URL参数
  if (route.query.presetId || route.query.presetName || route.query.refAudioUrl || route.query.promptText || route.query.promptLanguage) {
    router.replace({ path: '/custom-voice', query: {} });
  }
  
  showSnackbar('已清除预设选择，可以手动配置');
};

// ========== 预设管理功能 ==========

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

    // 发送加密请求
    const response = await axios.get(API_URLS.PRESET_LIST, {
      params: { key: secretKey },
      headers: {
        Authorization: `Bearer ${store.getters['auth/accessToken']}`
      }
    });

    // 解密响应数据
    if (response.data.encryptedData) {
      const decryptedBytes = CryptoJS.AES.decrypt(
        response.data.encryptedData,
        response.data.key || secretKey
      );
      const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
      presets.value = (decryptedData.presets || []).map(p => ({
        ...p,
        is_shared: p.is_shared || 0 // 确保 is_shared 有默认值
      }));
    } else {
      // 兼容未加密的响应
      presets.value = (response.data.presets || []).map(p => ({
        ...p,
        is_shared: p.is_shared || 0 // 确保 is_shared 有默认值
      }));
    }
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

  const currentUser = store.getters['auth/user'];
  if (!currentUser || !currentUser.username) {
    showSnackbar('请先登入');
    router.replace('/login');
    return;
  }

  isSavingPreset.value = true;

  try {
    // 获取加密密钥
    const initialKey = 'text-to-speech-initial-key';
    const encryptedUsernameForKey = CryptoJS.AES.encrypt(currentUser.username, initialKey).toString();

    const keyResponse = await axios.get(API_URLS.ENCRYPTION_KEY, {
      params: { encryptedUsername: encryptedUsernameForKey }
    });
    const secretKey = keyResponse.data.key;

    // 准备要加密的文本数据
    const textData = {
      name: presetName.value.trim(),
      prompt_text: promptText.value,
      prompt_language: promptLanguage.value,
      username: currentUser.username
    };

    // 加密文本数据
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(textData),
      secretKey
    ).toString();

    // 创建 FormData
    const formData = new FormData();
    formData.append('encryptedData', encryptedData);
    formData.append('key', secretKey);
    formData.append('ref_wav_file', refAudioFile.value);

    await axios.post(API_URLS.PRESET_SAVE, formData, {
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
const selectPreset = async (preset) => {
  try {
    // 切换预设时，清除之前的预览音频
    audioUrl.value = '';
    
    // 如果之前是外部预设，现在选择用户自己的预设，清除外部预设状态和URL
    if (isExternalPreset.value && preset.id && presets.value.find(p => p.id === preset.id)) {
      // 保存外部预设的URL，用于后续清除
      const externalPresetUrl = externalPresetBackup.value.presetAudioUrl || currentPresetAudioUrl.value;
      
      isExternalPreset.value = false;
      
      // 清除外部预设的URL（无论是否匹配，只要之前是外部预设就清除）
      if (externalPresetUrl && currentPresetAudioUrl.value === externalPresetUrl) {
        currentPresetAudioUrl.value = null;
      }
      
      // 清除外部预设备份（包括URL）
      externalPresetBackup.value = {
        refAudioFile: null,
        presetAudioUrl: null, // 确保外部预设的URL被清除
        promptText: '',
        promptLanguage: ''
      };
      
      // 清除地址栏中的预设URL参数
      if (route.query.presetId || route.query.presetName || route.query.refAudioUrl || route.query.promptText || route.query.promptLanguage) {
        router.replace({ path: '/custom-voice', query: {} });
      }
    }
    
    // 保存预设的OSS URL，这样生成语音时可以直接使用，无需重新上传
    currentPresetAudioUrl.value = preset.ref_audio_url;
    
    // 从 OSS URL 下载音频文件用于前端预览和时长检查
    const response = await fetch(preset.ref_audio_url);
    if (!response.ok) {
      throw new Error(`下载音频失败: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], `preset_${preset.id || 'external'}.wav`, { type: 'audio/wav' });
    refAudioFile.value = file;
    
    // 关键：先设置值，再设置 disabled 状态
    // 这样可以确保 v-model 在 disabled 之前正确绑定
    
    // 更新提示文本和提示语言（确保值被正确设置）
    if (preset.prompt_text) {
      promptText.value = String(preset.prompt_text).trim();
    }
    if (preset.prompt_language) {
      promptLanguage.value = String(preset.prompt_language).trim();
    }
    
    // 清除文件输入的错误状态
    promptTextError.value = '';
    promptLanguageError.value = '';
    
    // 等待一个tick，确保值已经设置到DOM
    await nextTick();
    
    // 保存预设数据，防止在后续操作中丢失（在音频下载之前就保存）
    const savedPromptText = String(preset.prompt_text || '').trim();
    const savedPromptLanguage = String(preset.prompt_language || '').trim();
    
    // 再次等待，确保值已经渲染到DOM
    await nextTick();
    await nextTick();
    
    // 现在才设置 disabled 状态（在值已经设置并渲染之后）
    // 关键：即使预设ID在用户预设列表中找到，也保留 externalPresetBackup 作为备份
    // 这样可以防止在 router.replace 后值丢失
    if (preset.id && presets.value.find(p => p.id === preset.id)) {
      selectedPresetId.value = preset.id;
      isExternalPreset.value = false;
      
      // 如果之前是外部预设，清除外部预设的URL和备份
      // 无论URL是否匹配，只要之前是外部预设，就清除所有外部预设数据
      if (externalPresetBackup.value.presetAudioUrl) {
        // 如果当前URL是外部预设的URL，先清除它（用户预设的URL会在后面设置）
        if (currentPresetAudioUrl.value === externalPresetBackup.value.presetAudioUrl) {
          currentPresetAudioUrl.value = null;
        }
        // 清除外部预设备份（包括URL）
      externalPresetBackup.value = {
        refAudioFile: null,
          presetAudioUrl: null, // 确保外部预设的URL被清除
        promptText: '',
        promptLanguage: ''
      };
      } else if (!externalPresetBackup.value.refAudioFile && !externalPresetBackup.value.presetAudioUrl) {
        // 只有在 externalPresetBackup 为空时才设置，避免覆盖已有的备份
        externalPresetBackup.value = {
          refAudioFile: file,
          presetAudioUrl: preset.ref_audio_url,
          promptText: savedPromptText,
          promptLanguage: savedPromptLanguage
        };
      }
    } else {
      // 从圈子页面来的预设可能不在用户列表中，标记为外部预设
      selectedPresetId.value = '';
      isExternalPreset.value = true;
      // 保存外部预设的备份数据
      externalPresetBackup.value = {
        refAudioFile: file,
        presetAudioUrl: preset.ref_audio_url,
        promptText: savedPromptText,
        promptLanguage: savedPromptLanguage
      };
    }
    
    // 等待状态更新
    await nextTick();
    
    // 关键：在设置 disabled 状态后，立即重新设置值，确保值不会被清空
    // 这是因为设置 disabled 可能会触发某些响应式更新
    promptText.value = savedPromptText;
    promptLanguage.value = savedPromptLanguage;
    if (!refAudioFile.value && file) {
      refAudioFile.value = file;
    }
    
    // 再次等待确保所有响应式更新完成
    await nextTick();
    await nextTick();
    
    // 检查音频时长（异步执行，不阻塞UI更新）
    getAudioDuration(file).then((duration) => {
      audioDuration.value = duration;
      if (!isDurationValid()) {
        showSnackbar(`预设音频时长${duration.toFixed(2)}秒，不在3-10秒范围内`);
      }
      // 在音频时长检查完成后，再次确保值没有被清空
      if (!promptText.value && savedPromptText) {
        promptText.value = savedPromptText;
      }
      if (!promptLanguage.value && savedPromptLanguage) {
        promptLanguage.value = savedPromptLanguage;
      }
    }).catch(() => {
      // 如果无法读取时长，继续使用
    });
    
    // 保存预设音频URL和文件，防止被意外清空
    const savedPresetAudioUrl = preset.ref_audio_url;
    const savedPresetFile = file;
    
    // 设置一个定时器，持续检查并修复值（防止值被意外清空）
    const checkInterval = setInterval(() => {
      if (isExternalPreset.value || selectedPresetId.value) {
        // 如果使用预设，但值丢失了，强制重新设置
        if (!promptText.value && savedPromptText) {
          promptText.value = savedPromptText;
        }
        if (!promptLanguage.value && savedPromptLanguage) {
          promptLanguage.value = savedPromptLanguage;
        }
        if (!refAudioFile.value && savedPresetFile) {
          refAudioFile.value = savedPresetFile;
        }
        if (!currentPresetAudioUrl.value && savedPresetAudioUrl) {
          currentPresetAudioUrl.value = savedPresetAudioUrl;
        }
      } else {
        // 如果不再使用预设，清除定时器
        clearInterval(checkInterval);
      }
    }, 500);
    
    // 5秒后清除定时器（避免内存泄漏）
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);
    
    // 如果数据丢失，强制重新设置
    if (!promptText.value && savedPromptText) {
      promptText.value = savedPromptText;
    }
    if (!promptLanguage.value && savedPromptLanguage) {
      promptLanguage.value = savedPromptLanguage;
    }
    if (!refAudioFile.value && file) {
      refAudioFile.value = file;
    }
    
    // 设置配置区域显示状态
    // 选择预设时，默认折叠配置区域（无论是外部预设还是用户自己的预设）
    showConfigSection.value = false;
    
    // 最终验证所有数据
    await nextTick();
    await nextTick();
    
    // 最后一次强制设置值，确保UI更新
    if (promptText.value !== savedPromptText) {
      promptText.value = savedPromptText;
    }
    if (promptLanguage.value !== savedPromptLanguage) {
      promptLanguage.value = savedPromptLanguage;
    }
    
    // 直接操作DOM，强制更新（作为最后的保障）
    await nextTick();
    const textareaEl = document.getElementById('prompt-text');
    const selectEl = document.getElementById('prompt-language-select');
    if (textareaEl && textareaEl.value !== promptText.value) {
      textareaEl.value = promptText.value;
      // 触发input事件，确保Vue知道值已更改
      textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (selectEl && selectEl.value !== promptLanguage.value) {
      selectEl.value = promptLanguage.value;
      // 触发change事件，确保Vue知道值已更改
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // 再次等待确保DOM更新
    await nextTick();
    
    showSnackbar(`已加载预设: ${preset.name || '外部预设'}`);
    
    // 自动聚焦到文本输入框
    await nextTick();
    if (inputTextRef.value) {
      inputTextRef.value.focus();
    }
  } catch (error) {
    console.error('加载预设音频失败:', error);
    showSnackbar('加载预设音频失败: ' + (error.message || '未知错误'));
    throw error; // 重新抛出错误，让调用者可以处理
  }
};

// 加载预设（从下拉框选择）
// 处理预设选择变化
const handlePresetSelectChange = () => {
  // 如果用户选择了"不使用预设，手动配置"
  if (!selectedPresetId.value) {
    // 展开配置区域，允许手动配置
    showConfigSection.value = true;
    // 清除预设相关状态
    clearPreset();
    return;
  }
  
  // 切换预设时，清除之前的预览音频
  audioUrl.value = '';
  
  // 如果用户选择了自己的预设，清除外部预设状态和URL
  if (isExternalPreset.value && selectedPresetId.value) {
    // 保存外部预设的URL，用于后续清除
    const externalPresetUrl = externalPresetBackup.value.presetAudioUrl || currentPresetAudioUrl.value;
    
    // 用户选择了自己的预设，清除外部预设状态
    isExternalPreset.value = false;
    
    // 清除外部预设的URL（无论是否匹配，只要之前是外部预设就清除）
    if (externalPresetUrl && currentPresetAudioUrl.value === externalPresetUrl) {
      currentPresetAudioUrl.value = null;
    }
    
    // 清除外部预设备份（包括URL）
    externalPresetBackup.value = {
      refAudioFile: null,
      presetAudioUrl: null, // 确保外部预设的URL被清除
      promptText: '',
      promptLanguage: ''
    };
    
    // 清除地址栏中的预设URL参数
    if (route.query.presetId || route.query.presetName || route.query.refAudioUrl || route.query.promptText || route.query.promptLanguage) {
      router.replace({ path: '/custom-voice', query: {} });
    }
  }
  
  // 如果没有选择预设，但之前是外部预设，保持外部预设状态
  if (isExternalPreset.value && !selectedPresetId.value) {
    return;
  }
  
  // 调用原来的 loadPreset 逻辑（选择预设时会自动折叠配置区域）
  loadPreset();
};

const loadPreset = () => {
  if (!selectedPresetId.value) {
    return;
  }
  const preset = presets.value.find(p => p.id === parseInt(selectedPresetId.value));
  if (preset) {
    selectPreset(preset);
  }
};

// 分享/取消分享预设
const toggleSharePreset = async (preset) => {
  const currentUser = store.getters['auth/user'];
  if (!currentUser || !currentUser.username) {
    showSnackbar('请先登入');
    router.replace('/login');
    return;
  }

  try {
    const currentShared = preset.is_shared == 1 || preset.is_shared === true;
    const isShared = !currentShared;
    
    const response = await axios.put(
      `${API_URLS.PRESET_SHARE}/${preset.id}/share`,
      { is_shared: isShared },
      {
        headers: {
          Authorization: `Bearer ${store.getters['auth/accessToken']}`
        }
      }
    );

    // 更新本地预设列表
    const presetIndex = presets.value.findIndex(p => p.id === preset.id);
    if (presetIndex !== -1) {
      presets.value[presetIndex].is_shared = response.data.is_shared;
    }

    showSnackbar(response.data.message);
  } catch (error) {
    console.error('更新预设分享状态失败:', error);
    if (error.response?.status === 401) {
      try {
        await store.dispatch('auth/refreshToken');
        await toggleSharePreset(preset);
        return;
      } catch (refreshError) {
        showSnackbar('登录已过期，请重新登录');
        router.replace('/login');
        return; 
      }
    }
    const errorMessage = error.response?.data?.message || '更新分享状态失败';
    showSnackbar(errorMessage);
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

// 从URL参数加载预设（从圈子页面跳转过来）
const loadPresetFromQuery = async () => {
  if (!route.query.presetId) {
    return;
  }

  try {
    // Vue Router 会自动解码 URL 参数，但如果参数是字符串，可能需要手动处理
    const getQueryParam = (value) => {
      if (!value) return '';
      // 如果已经是字符串，直接返回；如果是编码的，尝试解码
      if (typeof value === 'string') {
        try {
          // 尝试解码，如果已经是解码的，decodeURIComponent 不会报错
          return decodeURIComponent(value);
        } catch (e) {
          // 如果解码失败，说明可能已经是解码的，直接返回
          return value;
        }
      }
      return String(value);
    };
    
    const presetData = {
      id: parseInt(route.query.presetId),
      name: getQueryParam(route.query.presetName),
      ref_audio_url: getQueryParam(route.query.refAudioUrl),
      prompt_text: getQueryParam(route.query.promptText),
      prompt_language: getQueryParam(route.query.promptLanguage)
    };

    // 验证必要参数
    if (!presetData.ref_audio_url || !presetData.prompt_text || !presetData.prompt_language) {
      showSnackbar('预设参数不完整，无法加载');
      router.replace({ path: '/custom-voice', query: {} });
      return;
    }

    // 直接加载预设，不依赖预设列表
    await selectPreset(presetData);
    
    // 等待多个 nextTick 确保所有响应式更新完成
    await nextTick();
    await nextTick();
    
    // 验证预设是否真的加载成功
    if (!refAudioFile.value || !promptText.value || !promptLanguage.value) {
      showSnackbar('预设加载不完整，请重试');
      return;
    }
    
    // 再次验证并强制设置（防止响应式更新问题）
    await nextTick();
    if (!promptText.value && presetData.prompt_text) {
      promptText.value = String(presetData.prompt_text).trim();
    }
    if (!promptLanguage.value && presetData.prompt_language) {
      promptLanguage.value = String(presetData.prompt_language).trim();
    }
  } catch (error) {
    showSnackbar('加载预设失败: ' + (error.message || '未知错误'));
    router.replace({ path: '/custom-voice', query: {} });
  }
};

// 处理从URL加载预设（用于 keepAlive 组件）
const handlePresetFromQuery = async () => {
  // 先处理从圈子页面跳转过来的预设（必须在加载用户预设列表之前）
  if (route.query.presetId) {
    try {
      await loadPresetFromQuery();
    } catch (error) {
      console.error('加载外部预设失败:', error);
      // 即使失败也继续加载用户预设列表
    }
  }
};

// 组件挂载时加载预设列表
onMounted(async () => {
  await handlePresetFromQuery();
  
  // 然后加载用户的预设列表（如果已登录）
  try {
    await loadPresets();
    
    // 加载预设列表后，检查并恢复值（防止预设列表加载后值被清空）
    // 如果值丢失但备份存在，立即恢复
    const hasBackup = externalPresetBackup.value.refAudioFile || externalPresetBackup.value.presetAudioUrl;
    const needsRestore = hasBackup && (
      (!refAudioFile.value && externalPresetBackup.value.refAudioFile) ||
      (!currentPresetAudioUrl.value && externalPresetBackup.value.presetAudioUrl) ||
      (!promptText.value && externalPresetBackup.value.promptText) ||
      (!promptLanguage.value && externalPresetBackup.value.promptLanguage)
    );
    
    if (needsRestore) {
      restoreExternalPreset();
      
      // 等待一个 tick，确保恢复完成
      await nextTick();
    }
  } catch (error) {
    // 如果未登录，不影响外部预设的使用
  }
});

// 组件激活时（keepAlive 场景）也检查URL参数
onActivated(async () => {
  // 如果组件被 keepAlive 缓存，激活时也需要检查URL参数
  if (route.query.presetId) {
    // 检查是否已经加载过这个预设（避免重复加载）
    const expectedPromptText = route.query.promptText ? decodeURIComponent(route.query.promptText) : '';
    
    // 如果数据不匹配，说明需要重新加载
    if (promptText.value !== expectedPromptText || !refAudioFile.value) {
      await handlePresetFromQuery();
    }
    } else {
    // URL 参数已被清除，但可能值还在，检查并恢复
    // 如果值丢失但备份存在，立即恢复
    const hasBackup = externalPresetBackup.value.refAudioFile || externalPresetBackup.value.presetAudioUrl;
    const needsRestore = hasBackup && (
      (!refAudioFile.value && externalPresetBackup.value.refAudioFile) ||
      (!currentPresetAudioUrl.value && externalPresetBackup.value.presetAudioUrl) ||
      (!promptText.value && externalPresetBackup.value.promptText) ||
      (!promptLanguage.value && externalPresetBackup.value.promptLanguage)
    );
    
    if (needsRestore) {
      restoreExternalPreset();
      
      // 再次等待一个 tick，确保恢复完成
      await nextTick();
    }
  }
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
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.6;
  padding: 10px 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #42b983;
}

.help-text i {
  color: #42b983;
  font-size: 14px;
  margin-top: 2px;
  flex-shrink: 0;
}

.help-text-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.help-text-main {
  word-break: break-word;
  line-height: 1.6;
}

.help-text-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #42b983;
  margin-top: 2px;
}

.help-text-sub i {
  font-size: 11px;
  color: #42b983;
  margin-top: 0;
  flex-shrink: 0;
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
  margin-top: 2px;
}

.quality-tip strong {
  color: #ff9800;
}

.quality-tip .help-text-content {
  line-height: 1.6;
  word-break: break-word;
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

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .form-group-half {
    margin-bottom: 24px;
  }

  .preset-actions {
    flex-direction: column;
    gap: 8px;
  }

  .preset-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .preset-item-actions {
    width: 100%;
    justify-content: flex-end;
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

/* 主要操作区域 */
.main-action-section {
  margin-top: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #f0f7ff, #ffffff);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.1);
  border: 2px solid rgba(66, 185, 131, 0.2);
}

.preset-quick-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px dashed rgba(66, 185, 131, 0.2);
}

.preset-quick-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-quick-label i {
  color: #ff9800;
}

.preset-quick-select-wrapper {
  display: flex;
  gap: 10px;
  align-items: center;
}

.preset-quick-select-wrapper .select-wrapper {
  flex: 1;
}

.preset-select-field {
  font-weight: 500;
  font-size: 15px;
  padding: 12px 16px;
}

.clear-preset-btn-small {
  padding: 10px 12px;
  background: #ff4d4d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.clear-preset-btn-small:hover {
  background: #ff1a1a;
  transform: scale(1.05);
}

.preset-active-badge {
  margin-top: 10px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
  border-radius: 8px;
  border-left: 3px solid #42b983;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #2c3e50;
}

.preset-active-badge i {
  color: #42b983;
  font-size: 16px;
}

/* 文本输入区域 */
.text-input-section {
  margin-bottom: 20px;
}

.main-label {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-label i {
  color: #42b983;
}

.main-textarea {
  font-size: 15px;
  padding: 14px 16px;
  min-height: 120px;
  resize: vertical;
  border: 2px solid #e0e0e0;
  transition: all 0.3s ease;
}

.main-textarea:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 4px rgba(66, 185, 131, 0.1);
  outline: none;
}

.language-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.inline-label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin: 0;
  white-space: nowrap;
}

.inline-select {
  min-width: 150px;
}

.generate-button-large {
  width: 100%;
  padding: 16px 24px;
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #42b983, #3aa876);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 15px rgba(66, 185, 131, 0.3);
  margin-top: 20px;
}

.generate-button-large:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(66, 185, 131, 0.4);
}

.generate-button-large:active:not(:disabled) {
  transform: translateY(0);
}

.generate-button-large:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.generate-button-large i {
  font-size: 20px;
}

/* 配置区域样式 */
.config-section {
  margin-top: 24px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.config-section.section-collapsed {
  opacity: 0.7;
}

.config-section.section-disabled {
  background: #f8f9fa;
}

.content-disabled {
  position: relative;
}

.content-disabled::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  z-index: 1;
  pointer-events: none;
  border-radius: 8px;
}

.readonly-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #ff9800;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.file-upload-wrapper.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-upload-wrapper.drag-over {
  border-color: #42b983 !important;
  background: linear-gradient(135deg, rgba(66, 185, 131, 0.1), rgba(66, 185, 131, 0.05)) !important;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.2) !important;
  transform: scale(1.02);
}

.file-upload-wrapper.drag-over .file-upload-label {
  background: linear-gradient(135deg, #42b983, #3aa876) !important;
  color: white !important;
  border-color: #42b983 !important;
}

.file-upload-wrapper.drag-over .file-upload-label i {
  color: white !important;
  transform: scale(1.2);
}

.file-upload-label.disabled {
  cursor: not-allowed;
  background: #f5f5f5;
}

.file-upload-label.disabled:hover {
  background: #f5f5f5;
}

.input-field.readonly,
.select-field.readonly {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.8;
}

.input-field.readonly:focus,
.select-field.readonly:focus {
  border-color: #e0e0e0;
  box-shadow: none;
  outline: none;
}

.preset-indicator i {
  margin-right: 4px;
  color: #ff9800;
}

.section-header-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 8px 0;
  margin-bottom: 16px;
  border-bottom: 2px solid rgba(66, 185, 131, 0.1);
}

.section-header-toggle:hover {
  opacity: 0.8;
}

.section-header-toggle .section-title {
  margin: 0;
  border: none;
  padding: 0;
}

.preset-indicator {
  font-size: 13px;
  font-weight: normal;
  color: #42b983;
  margin-left: 8px;
}

.toggle-icon {
  color: #666;
  font-size: 14px;
  transition: transform 0.3s ease;
}

.section-content {
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(66, 185, 131, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title i {
  color: #42b983;
}

/* 表单行（并排显示） */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 0;
}

.form-group-half {
  margin-bottom: 0;
}

.help-text-group {
  margin-bottom: 12px;
}

/* 移动端优化 - help-text */
@media (max-width: 768px) {
  .help-text {
    font-size: 11px;
    padding: 8px 10px;
    gap: 6px;
    margin-bottom: 8px;
  }

  .help-text i {
    font-size: 12px;
  }

  .help-text-content {
    gap: 4px;
  }

  .help-text-main {
    font-size: 11px;
    line-height: 1.5;
  }

  .help-text-sub {
    font-size: 10px;
    gap: 3px;
  }

  .help-text-sub i {
    font-size: 10px;
  }

  .quality-tip {
    margin-top: 6px;
  }

  .help-text-group {
    margin-bottom: 10px;
  }
}

@media (max-width: 480px) {
  .help-text {
    font-size: 10px;
    padding: 6px 8px;
    gap: 5px;
  }

  .help-text i {
    font-size: 11px;
  }

  .help-text-main {
    font-size: 10px;
  }

  .help-text-sub {
    font-size: 9px;
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .help-text {
    font-size: 11px;
    padding: 8px 10px;
    gap: 6px;
    margin-bottom: 8px;
  }

  .help-text i {
    font-size: 12px;
  }

  .help-text-content {
    gap: 4px;
  }

  .help-text-main {
    font-size: 11px;
    line-height: 1.5;
  }

  .help-text-sub {
    font-size: 10px;
    gap: 3px;
  }

  .help-text-sub i {
    font-size: 10px;
  }

  .quality-tip {
    margin-top: 6px;
  }

  .help-text-group {
    margin-bottom: 10px;
  }
}

@media (max-width: 480px) {
  .help-text {
    font-size: 10px;
    padding: 6px 8px;
    gap: 5px;
  }

  .help-text i {
    font-size: 11px;
  }

  .help-text-main {
    font-size: 10px;
  }

  .help-text-sub {
    font-size: 9px;
  }
}

.help-text-inline {
  font-size: 11px;
  color: #666;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.help-text-inline i {
  color: #42b983;
  font-size: 12px;
}

.file-info-item {
  display: inline-block;
  margin-right: 12px;
}

/* 预设管理样式 */
.preset-section {
  margin-top: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e0e0;
}

.preset-section-top {
  background: linear-gradient(135deg, #f0f7ff, #ffffff);
  border: 2px solid rgba(66, 185, 131, 0.3);
}

.preset-section-bottom {
  background: #f8f9fa;
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(66, 185, 131, 0.1);
  cursor: pointer;
  user-select: none;
}

.preset-section-top .preset-header {
  cursor: default;
}

.preset-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-title i {
  color: #42b983;
  font-size: 14px;
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
  white-space: nowrap;
}

.refresh-btn {
  padding: 8px 12px;
  min-width: auto;
}

.button-secondary:hover:not(:disabled) {
  background-color: #42b983;
  color: white;
}

.button-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preset-quick-select {
  margin-top: 12px;
}

.preset-select-field {
  font-weight: 500;
}

.preset-active-info {
  margin-top: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
  border-radius: 8px;
  border-left: 3px solid #42b983;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #2c3e50;
}

.preset-active-info i {
  color: #42b983;
  font-size: 16px;
}

.clear-preset-btn {
  margin-left: auto;
  padding: 4px 8px;
  background: #ff4d4d;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-preset-btn:hover {
  background: #ff1a1a;
}

.no-presets-hint {
  margin-top: 12px;
  padding: 12px;
  background: #f0f7ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.no-presets-hint i {
  color: #42b983;
}

.preset-list-container {
  margin-top: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.preset-list {
  margin-top: 0;
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
  cursor: pointer;
}

.preset-item:hover {
  border-color: #42b983;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.1);
  transform: translateY(-1px);
}

.preset-item.preset-active {
  border-color: #42b983;
  background: linear-gradient(135deg, #f0f7ff, #ffffff);
  box-shadow: 0 2px 12px rgba(66, 185, 131, 0.15);
}

.preset-info {
  flex: 1;
}

.preset-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.active-icon {
  color: #42b983;
  font-size: 16px;
}

.preset-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
  flex-wrap: wrap;
}

.preset-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.preset-meta i {
  font-size: 11px;
  opacity: 0.7;
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
  white-space: nowrap;
}

.preset-action-btn:hover {
  background-color: #3aa876;
  transform: translateY(-1px);
}

.preset-action-btn.active {
  background-color: #2c8d63;
  cursor: default;
}

.preset-action-btn.delete-btn {
  background-color: #ff4d4d;
}

.preset-action-btn.delete-btn:hover {
  background-color: #ff1a1a;
}

.preset-action-btn.share-btn {
  background-color: #6c757d;
}

.preset-action-btn.share-btn:hover {
  background-color: #5a6268;
}

.preset-action-btn.share-btn.shared {
  background-color: #42b983;
}

.preset-action-btn.share-btn.shared:hover {
  background-color: #3aa876;
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

