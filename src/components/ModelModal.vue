<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <h2>选择模型</h2>
            <div class="model-list">
                <div v-for="model in sortedModels" :key="model.value" class="model-item" @click="selectModel(model)">
                    {{ model.label }}
                </div>
            </div>
            <div class="modal-buttons">
                <button @click="close" class="button button-cancel">关闭</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

/* eslint-disable no-undef */
const props = defineProps({
    models: {
        type: Array,
        required: true
    }
});

const emit = defineEmits(['select-model', 'close']);
/* eslint-enable no-undef */

// 按系列排序模型
const sortedModels = computed(() => {
    return [...props.models].sort((a, b) => {
        const seriesA = a.series || '其他';
        const seriesB = b.series || '其他';
        
        // "其他"系列排在最后
        if (seriesA === '其他' && seriesB !== '其他') {
            return 1;
        }
        if (seriesA !== '其他' && seriesB === '其他') {
            return -1;
        }
        
        // 首先按系列排序
        if (seriesA !== seriesB) {
            return seriesA.localeCompare(seriesB);
        }
        
        // 同一系列内按标签排序
        return a.label.localeCompare(b.label);
    });
});

const selectModel = (model) => {
    emit('select-model', model);
};

const close = () => {
    emit('close');
};
</script>

<style scoped>
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