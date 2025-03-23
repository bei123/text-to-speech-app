<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>设置聊天模型人设</h2>
        <button class="close-button" @click="close" aria-label="关闭">
          <span class="close-icon">×</span>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="input-wrapper">
          <label for="system-prompt" class="input-label">系统提示词</label>
          <textarea
            id="system-prompt"
            v-model="localValue"
            placeholder="请输入 SYSTEM 提示词（例如：你是一个助手）"
            class="input-field"
            :class="{ 'input-error': error }"
            @input="handleInput"
          ></textarea>
          <div v-if="error" class="error-message">{{ error }}</div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="button button-cancel">取消</button>
        <button 
          @click="handleSave" 
          class="button button-primary"
          :disabled="!isValid"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
import { ref, watch, computed, onMounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'save', 'close']);
/* eslint-enable no-undef */

const localValue = ref('');
const error = ref('');

const isValid = computed(() => {
  return localValue.value.trim().length > 0 && !error.value;
});

const validateInput = (value) => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    error.value = '提示词不能为空';
    return false;
  } else if (trimmedValue.length > 1000) {
    error.value = '提示词不能超过1000个字符';
    return false;
  } else {
    error.value = '';
    return true;
  }
};

const handleInput = () => {
  validateInput(localValue.value);
  emit('update:modelValue', localValue.value);
};

const handleSave = () => {
  if (!isValid.value) return;
  try {
    emit('save');
  } catch (err) {
    error.value = '保存失败，请重试';
    console.error('保存失败:', err);
  }
};

const close = () => {
  try {
    emit('close');
  } catch (err) {
    console.error('关闭失败:', err);
  }
};

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localValue.value) {
    localValue.value = newValue;
    validateInput(newValue);
  }
}, { immediate: true });

// 组件挂载时初始化
onMounted(() => {
  localValue.value = props.modelValue;
  validateInput(props.modelValue);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background-color: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: #f5f5f5;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.input-wrapper {
  position: relative;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.input-field {
  width: 100%;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  resize: vertical;
  min-height: 120px;
  outline: none;
  background-color: #f8f9fa;
  color: #2c3e50;
  transition: all 0.3s ease;
}

.input-field:hover {
  border-color: #42b983;
  background-color: white;
}

.input-field:focus {
  border-color: #42b983;
  background-color: white;
  box-shadow: 0 0 0 4px rgba(66, 185, 131, 0.1);
}

.input-error {
  border-color: #ff4d4d;
}

.input-error:focus {
  border-color: #ff4d4d;
  box-shadow: 0 0 0 4px rgba(255, 77, 77, 0.1);
}

.error-message {
  color: #ff4d4d;
  font-size: 14px;
  margin-top: 8px;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-primary {
  background: linear-gradient(135deg, #42b983, #3aa876);
  color: white;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.2);
}

.button-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

.button-primary:active:not(:disabled) {
  transform: translateY(0);
}

.button-cancel {
  background: #f8f9fa;
  color: #666;
  border: 1px solid #e0e0e0;
}

.button-cancel:hover {
  background: #f1f1f1;
  color: #333;
}

.button-cancel:active {
  background: #e8e8e8;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .modal-header {
    padding: 16px;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .modal-footer {
    padding: 16px;
  }
  
  .button {
    padding: 10px 20px;
    font-size: 13px;
  }
}
</style>