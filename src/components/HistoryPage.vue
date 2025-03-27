<template>
    <div id="app">
        <!-- <nav class="navbar">
            <div class="nav-links">
                <router-link to="/" class="nav-link">Home</router-link>
                <router-link to="/history" class="nav-link">生成记录</router-link>
            </div>
        </nav>
        <router-view></router-view> -->

    </div>
    <div class="history-container">
        <div class="history-header">
            <h1 class="history-title">历史语音记录</h1>
            <div class="header-actions">
                <div class="search-container">
                    <input 
                        v-model="searchKeyword" 
                        type="text" 
                        placeholder="输入关键词搜索" 
                        class="search-input"
                        @input="handleSearch"
                    />
                    <button @click="handleSearch" class="search-button">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <button @click="handleRefresh" class="refresh-button">
                    <i class="fas fa-sync-alt"></i>
                    刷新记录
                </button>
            </div>
            
            <!-- 筛选条件 -->
            <div class="filter-container">
                <div class="filter-group">
                    <label>日期：</label>
                    <v-text-field
                        v-model="dateRangeText"
                        readonly
                        placeholder="选择日期"
                        @click="showDatePicker = true"
                        class="date-input"
                        prepend-inner-icon="mdi-calendar"
                        variant="outlined"
                        density="compact"
                        hide-details
                    >
                        <template v-slot:append>
                            <v-icon
                                color="primary"
                                @click="showDatePicker = true"
                            >
                                mdi-calendar
                            </v-icon>
                        </template>
                    </v-text-field>
                    <v-dialog
                        v-model="showDatePicker"
                        max-width="400"
                        transition="dialog-bottom-transition"
                    >
                        <v-card class="date-picker-dialog">
                            <v-card-title class="text-h6">
                                选择日期
                            </v-card-title>
                            <v-card-text>
                                <v-date-picker
                                    v-model="selectedDate"
                                    @update:model-value="handleDateChange"
                                    :max="new Date()"
                                    class="date-picker"
                                    color="primary"
                                    elevation="0"
                                />
                            </v-card-text>
                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn
                                    color="primary"
                                    variant="text"
                                    @click="showDatePicker = false"
                                >
                                    确定
                                </v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                </div>
                <div class="filter-group">
                    <label>模型：</label>
                    <v-select
                        v-model="selectedModel"
                        :items="modelOptions"
                        item-title="label"
                        item-value="value"
                        placeholder="选择模型"
                        @update:model-value="handleFilterChange"
                        class="model-select"
                        variant="outlined"
                        density="compact"
                    />
                </div>
                <div class="filter-group">
                    <label>状态：</label>
                    <v-select
                        v-model="selectedStatus"
                        :items="statusOptions"
                        item-title="label"
                        item-value="value"
                        placeholder="选择状态"
                        @update:model-value="handleFilterChange"
                        class="status-select"
                        variant="outlined"
                        density="compact"
                    />
                </div>
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
        </div>

        <!-- 历史记录列表 -->
        <div v-else-if="historyList.length > 0" class="history-list">
            <div v-for="record in historyList" :key="record.id" class="history-item">
                <div class="record-main">
                    <div class="model-info">
                        <span class="model-name">{{ record.model_name }}</span>
                        <span :class="['status-badge', record.status]">
                            {{ mapStatusToChinese(record.status) }}
                        </span>
                    </div>
                    
                    <div class="record-content">
                        <p class="record-text">
                            {{ record.isExpanded ? record.text : record.text.slice(0, maxTextLength) + (record.text.length > maxTextLength ? '...' : '') }}
                            <button 
                                v-if="record.text.length > maxTextLength" 
                                @click="toggleExpand(record)"
                                class="expand-button"
                            >
                                {{ record.isExpanded ? '收起' : '展开' }}
                            </button>
                        </p>
                        <span class="record-date">{{ formatDate(record.createdAt) }}</span>
                    </div>
                </div>

                <div class="record-actions">
                    <button 
                        v-if="record.status === 'completed'" 
                        @click="handleDownload(record)"
                        class="download-button"
                    >
                        <i class="fas fa-download"></i>
                        下载音频
                    </button>
                    <button 
                        v-else 
                        class="download-button disabled"
                        disabled
                    >
                        <i class="fas fa-clock"></i>
                        等待中
                    </button>
                </div>
            </div>
        </div>

        <!-- 无记录提示 -->
        <div v-else class="no-records">
            <i class="fas fa-history"></i>
            <p>暂无历史语音记录</p>
        </div>

        <!-- 分页控件 -->
        <div class="pagination">
            <button 
                @click="prevPage" 
                :disabled="currentPage === 1 || isLoading"
                class="page-button"
            >
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
            <button 
                @click="nextPage" 
                :disabled="currentPage === totalPages || isLoading"
                class="page-button"
            >
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    </div>
    <footer>
        <!-- 页脚内容 -->
        <!-- <p>© 2025 Ai 语音生命</p> -->
    </footer>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { debounce } from 'lodash';
import CryptoJS from 'crypto-js';

const store = useStore();
const isLoading = ref(false);
const maxTextLength = 100;
const searchKeyword = ref('');
const expandedRecords = ref(new Set());

// 筛选条件
const selectedDate = ref(null);
const selectedModel = ref('');
const selectedStatus = ref('');
const showDatePicker = ref(false);

// 模型选项
const modelOptions = ref([
    { label: '全部', value: '' },
    { label: '模型1', value: 'model1' },
    { label: '模型2', value: 'model2' },
    // 这里需要根据实际模型列表动态生成
]);

// 状态选项
const statusOptions = [
    { label: '全部', value: '' },
    { label: '等待中', value: 'pending' },
    { label: '处理中', value: 'processing' },
    { label: '已完成', value: 'completed' },
    { label: '失败', value: 'failed' }
];

// 计算属性
const currentPage = computed(() => store.state.history.currentPage);
const totalPages = computed(() => store.getters['history/totalPages']);
const historyList = computed(() => {
    return store.state.history.historyList.map(record => ({
        ...record,
        isExpanded: expandedRecords.value.has(record.id),
        status: record.status || 'pending',
        proxyAudioUrl: record.audioUrl ? getProxyAudioUrl(record.audioUrl) : ''
    }));
});

// 状态映射
const mapStatusToChinese = (status) => {
    const statusMap = {
        pending: '等待中',
        processing: '处理中',
        completed: '已完成',
        failed: '失败'
    };
    return statusMap[status] || '未知状态';
};

// 格式化日期
const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (error) {
        console.error('日期格式化错误:', error);
        return '';
    }
};

// 获取模型列表
const fetchModels = async () => {
    try {
        const response = await fetch('https://backend.2000gallery.art:5000/models');
        const data = await response.json();
        
        // 解密响应数据
        const decryptedData = CryptoJS.AES.decrypt(data.encryptedData, data.key);
        const models = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
        
        modelOptions.value = [
            { label: '全部', value: '' },
            ...models.map(model => ({
                label: model.label,
                value: model.value
            }))
        ];
    } catch (error) {
        console.error('获取模型列表失败:', error);
    }
};

// 获取历史记录
const fetchHistory = async () => {
    try {
        isLoading.value = true;
        const filters = {
            keyword: searchKeyword.value.trim(),
            page: Number(currentPage.value),
            itemsPerPage: Number(store.state.history.itemsPerPage),
            startDate: selectedDate.value ? new Date(selectedDate.value).toISOString().split('T')[0] : null,
            endDate: selectedDate.value ? new Date(selectedDate.value).toISOString().split('T')[0] : null,
            model: selectedModel.value,
            status: selectedStatus.value
        };
        console.log('发送筛选参数:', filters);
        await store.dispatch('history/fetchHistory', filters);
    } catch (error) {
        console.error('获取历史记录失败:', error);
        if (error.message === '未登录' || error.message === '登录已过期，请重新登录') {
            // 这些错误已经在 historyModule 中处理了重定向
            return;
        }
        // 显示其他错误信息
        alert('获取历史记录失败，请稍后重试');
    } finally {
        isLoading.value = false;
    }
};

// 筛选条件变化处理
const handleFilterChange = () => {
    console.log('筛选条件变化:', {
        selectedDate: selectedDate.value,
        selectedModel: selectedModel.value,
        selectedStatus: selectedStatus.value
    });
    store.commit('history/SET_CURRENT_PAGE', 1);
    fetchHistory();
};

// 搜索处理
const handleSearch = debounce(() => {
    store.commit('history/SET_CURRENT_PAGE', 1);
    fetchHistory();
}, 300);

// 刷新处理
const handleRefresh = () => {
    // 重置所有筛选条件
    selectedDate.value = null;
    selectedModel.value = '';
    selectedStatus.value = '';
    searchKeyword.value = '';
    store.commit('history/SET_CURRENT_PAGE', 1);
    fetchHistory();
};

// 分页处理
const prevPage = () => {
    if (currentPage.value > 1 && !isLoading.value) {
        store.commit('history/SET_CURRENT_PAGE', currentPage.value - 1);
        fetchHistory();
    }
};

const nextPage = () => {
    if (currentPage.value < totalPages.value && !isLoading.value) {
        store.commit('history/SET_CURRENT_PAGE', currentPage.value + 1);
        fetchHistory();
    }
};

// 展开/收起文本
const toggleExpand = (record) => {
    if (expandedRecords.value.has(record.id)) {
        expandedRecords.value.delete(record.id);
    } else {
        expandedRecords.value.add(record.id);
    }
};

// 获取代理后的音频URL
const getProxyAudioUrl = (audioUrl) => {
    try {
        const url = new URL(audioUrl);
        const pathParts = url.pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        const username = pathParts[pathParts.length - 2];
        return `https://backend.2000gallery.art:5000/download/${username}/${filename}`;
    } catch (error) {
        console.error('解析音频URL失败:', error);
        return audioUrl;
    }
};

// 下载处理函数
const handleDownload = async (record) => {
    try {
        // 从 URL 中提取文件名和用户名
        const url = new URL(record.audioUrl);
        const pathParts = url.pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        const username = pathParts[pathParts.length - 2];
        
        // 使用后端代理下载
        const response = await fetch(`https://backend.2000gallery.art:5000/download/${username}/${filename}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${store.getters['auth/accessToken']}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('下载失败:', error);
        alert('下载失败，请稍后重试');
    }
};

// 监听搜索关键词变化
watch(searchKeyword, handleSearch);

// 监听筛选条件变化
watch([selectedModel, selectedStatus], (newValues) => {
    console.log('模型或状态变化:', newValues);
    handleFilterChange();
});

// 监听日期变化
watch(selectedDate, (newValue) => {
    console.log('日期变化:', newValue);
    if (newValue) {
        handleFilterChange();
    }
});

// 组件挂载时获取历史记录和模型列表
onMounted(() => {
    fetchModels();
    fetchHistory();
});

// 日期范围文本
const dateRangeText = computed(() => {
    if (!selectedDate.value) {
        return '';
    }
    return formatDate(selectedDate.value);
});

// 处理日期变化
const handleDateChange = (value) => {
    if (value) {
        showDatePicker.value = false;
        selectedDate.value = value;
        handleFilterChange();
    }
};
</script>

<style scoped>
.history-container {
    max-width: 800px;
    margin: 20px auto;
    padding: 24px;
    background-color: #fff;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.history-header {
    margin-bottom: 24px;
}

.history-title {
    font-size: 24px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 20px;
    text-align: center;
}

.header-actions {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
}

.search-container {
    flex: 1;
    display: flex;
    gap: 8px;
}

.search-input {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.3s ease;
}

.search-input:focus {
    border-color: #42b983;
    box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
    outline: none;
}

.search-button, .refresh-button {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.search-button {
    background-color: #42b983;
    color: white;
}

.refresh-button {
    background-color: #f8f9fa;
    color: #2c3e50;
    border: 1px solid #e0e0e0;
}

.search-button:hover {
    background-color: #3aa876;
    transform: translateY(-1px);
}

.refresh-button:hover {
    background-color: #f1f1f1;
    transform: translateY(-1px);
}

.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #666;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #42b983;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.history-item {
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;
}

.history-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transform: translateY(-2px);
}

.record-main {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.model-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.model-name {
    font-size: 14px;
    color: #666;
    background-color: #f8f9fa;
    padding: 4px 8px;
    border-radius: 4px;
}

.status-badge {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 500;
}

.status-badge.pending {
    background-color: #fff3cd;
    color: #856404;
}

.status-badge.processing {
    background-color: #cce5ff;
    color: #004085;
}

.status-badge.completed {
    background-color: #d4edda;
    color: #155724;
}

.status-badge.failed {
    background-color: #f8d7da;
    color: #721c24;
}

.record-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.record-text {
    font-size: 14px;
    color: #2c3e50;
    line-height: 1.6;
    margin: 0;
}

.record-date {
    font-size: 12px;
    color: #999;
}

.expand-button {
    background: none;
    border: none;
    color: #42b983;
    cursor: pointer;
    padding: 0;
    margin-left: 8px;
    font-size: 14px;
}

.expand-button:hover {
    text-decoration: underline;
}

.record-actions {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
}

.download-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: #42b983;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.3s ease;
}

.download-button:hover {
    background-color: #3aa876;
    transform: translateY(-1px);
}

.download-button.disabled {
    background-color: #e0e0e0;
    cursor: not-allowed;
    transform: none;
}

.no-records {
    text-align: center;
    padding: 40px;
    color: #666;
}

.no-records i {
    font-size: 48px;
    margin-bottom: 16px;
    color: #ddd;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 32px;
}

.page-button {
    background: none;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.page-button:not(:disabled):hover {
    border-color: #42b983;
    color: #42b983;
}

.page-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-info {
    font-size: 14px;
    color: #666;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
    .history-container {
        margin: 10px;
        padding: 16px;
    }

    .header-actions {
        flex-direction: column;
    }

    .history-item {
        padding: 16px;
    }

    .model-info {
        flex-direction: column;
        align-items: flex-start;
    }

    .record-actions {
        margin-top: 12px;
    }

    .download-button {
        width: 100%;
        justify-content: center;
    }
}

/* 添加筛选相关样式 */
.filter-container {
    display: flex;
    gap: 20px;
    margin-top: 20px;
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
    flex-wrap: wrap;
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 200px;
}

.filter-group label {
    font-size: 14px;
    color: #666;
    white-space: nowrap;
}

.date-input,
.model-select,
.status-select {
    flex: 1;
    max-width: 300px;
}

.date-picker-dialog {
    border-radius: 12px;
}

.date-picker {
    width: 100%;
}

.date-picker :deep(.v-date-picker-header) {
    padding: 8px;
}

.date-picker :deep(.v-date-picker-month) {
    padding: 8px;
}

.date-picker :deep(.v-date-picker-month__day) {
    height: 36px;
    width: 36px;
}

@media (max-width: 768px) {
    .filter-container {
        flex-direction: column;
        gap: 12px;
    }

    .filter-group {
        width: 100%;
    }

    .date-input,
    .model-select,
    .status-select {
        width: 100%;
        max-width: none;
    }
}
</style>