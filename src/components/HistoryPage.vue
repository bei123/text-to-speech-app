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
    <div class="history-container">
        <h1 class="history-title">历史语音记录</h1>

        <!-- 关键词查询 -->
        <div class="search-container">
            <input v-model="searchKeyword" type="text" placeholder="输入关键词" class="search-input" />
            <button @click="fetchHistory" class="search-button">查询</button>
        </div>

        <button @click="fetchHistory" class="refresh-button">刷新历史记录</button>

        <!-- 历史记录列表 -->
        <ul v-show="historyList.length > 0" class="history-list">
            <li v-for="record in historyList" :key="record.id" class="history-item">
                <!-- 左侧固定模型名称 -->
                <div class="model-name">
                    <span>模型: {{ record.model_name }}</span>
                </div>

                <!-- 中间内容区域 -->
                <div class="record-info">
                    <span class="record-date">{{ formatDate(record.createdAt) }}</span>
                    <span class="record-text">
                        {{ record.isExpanded ? record.text : record.text.slice(0, maxTextLength) + (record.text.length >
                            maxTextLength ? '...' : '') }}
                        <button v-if="record.text.length > maxTextLength" @click="toggleExpand(record)"
                            class="expand-button">
                            {{ record.isExpanded ? '收起' : '更多' }}
                        </button>
                    </span>
                </div>

                <!-- 右侧固定下载按钮 -->
                <a :href="record.audioUrl" download class="download-button">下载音频</a>
            </li>
        </ul>

        <!-- 无记录提示 -->
        <p v-show="historyList.length === 0" class="no-records">暂无历史语音记录</p>
    </div>
    <footer>
        <!-- 页脚内容 -->
        <p>© 2025 Ai 语音生命</p>
    </footer>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { debounce } from 'lodash';

const store = useStore();

// 最大显示文本长度
const maxTextLength = 100;

// 关键词输入
const searchKeyword = ref('');

// 获取历史记录
const fetchHistory = async () => {
    await store.dispatch('history/fetchHistory', searchKeyword.value.trim());
};

// 从 Vuex 中获取历史记录
const historyList = computed(() => {
    return store.state.history.historyList.map((record) => ({
        ...record,
        isExpanded: record.isExpanded || false, // 直接使用 record 的 isExpanded 属性
    }));
});

// 切换文本展开状态
const toggleExpand = (record) => {
    record.isExpanded = !record.isExpanded;
};

// 格式化日期
const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
};

// 使用 debounce 优化搜索性能
const debouncedFetchHistory = debounce(fetchHistory, 300);

// 监听 searchKeyword 的变化
watch(searchKeyword, () => {
    debouncedFetchHistory();
});

// 页面加载时获取历史记录
onMounted(() => {
    fetchHistory();
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

/* 样式保持不变 */
.history-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.history-title {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
}

.search-container {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.search-input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
}

.search-button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
}

.search-button:hover {
    background-color: #0056b3;
}

.refresh-button {
    display: block;
    width: 100%;
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 20px;
}

.refresh-button:hover {
    background-color: #0056b3;
}

.history-list {
    list-style: none;
    padding: 0;
}

.history-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 5px;
    margin-bottom: 10px;
    background-color: white;
    transition: box-shadow 0.3s ease;
}

@media (min-width: 768px) {
    .history-item {
        flex-direction: row;
        align-items: center;
    }
}

.history-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.model-name {
    width: 120px;
    font-size: 12px;
    color: #888;
    margin-right: 20px;
}

@media (max-width: 768px) {
    .model-name {
        width: 100%;
        margin-bottom: 10px;
    }
}

.record-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.record-date {
    font-size: 12px;
    color: #666;
}

.record-text {
    font-size: 14px;
    color: #333;
    font-weight: bold;
    word-break: break-word;
}

.expand-button {
    background: none;
    border: none;
    color: #007bff;
    cursor: pointer;
    padding: 0;
    margin-left: 5px;
    font-size: 12px;
}

.expand-button:hover {
    text-decoration: underline;
}

.download-button {
    padding: 8px 12px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 5px;
    text-decoration: none;
    font-size: 14px;
    cursor: pointer;
    width: 100px;
    text-align: center;
    white-space: nowrap;
}

@media (max-width: 768px) {
    .download-button {
        width: auto;
        margin-top: 10px;
    }
}

.download-button:hover {
    background-color: #218838;
}

.no-records {
    text-align: center;
    color: #666;
    font-size: 14px;
}
</style>