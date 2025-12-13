<template>
  <v-app>
    <!-- 顶部导航栏（桌面端） -->
    <v-app-bar v-if="isAuthenticated && !isMobile" app color="primary" dark elevation="4">
      <v-toolbar-title class="font-weight-bold">Ai语音生命</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text to="/" class="mx-2">Home</v-btn>
      <v-btn text to="/reference-audio" class="mx-2">自定义音色</v-btn>
      <v-btn text to="/history" class="mx-2">生成记录</v-btn>
      <v-btn text to="/sponsors" class="mx-2">为爱发电的人们</v-btn>
      <v-btn color="error" @click="logout" class="mx-2">
        <v-icon left>mdi-logout</v-icon>
        退出登入
      </v-btn>
    </v-app-bar>

    <!-- 主要内容区域 -->
    <v-main app>
      <v-container fluid class="pa-6 main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <div class="component-wrapper">
              <component :is="Component" :key="$route.fullPath" />
            </div>
          </transition>
        </router-view>
      </v-container>
    </v-main>

    <!-- 底部页脚 -->
    <v-footer color="primary" dark app inset>
      <v-spacer></v-spacer>
      <span class="font-weight-bold">© 2025 Ai 语音生命</span>
      <v-spacer></v-spacer>
    </v-footer>

    <!-- 底部导航栏（移动端） -->
    <v-bottom-navigation v-if="isAuthenticated && isMobile" app color="primary" dark shift class="bottom-nav">
      <v-btn to="/" value="home">
        <v-icon>mdi-home</v-icon>
        <span>Home</span>
      </v-btn>
      <v-btn to="/reference-audio" value="reference">
        <v-icon>mdi-microphone</v-icon>
        <span>自定义音色</span>
      </v-btn>
      <v-btn to="/history" value="history">
        <v-icon>mdi-history</v-icon>
        <span>生成记录</span>
      </v-btn>
      <v-btn to="/sponsors" value="sponsors">
        <v-icon>mdi-heart</v-icon>
        <span>为爱发电</span>
      </v-btn>
      <v-btn color="error" @click="logout" value="logout">
        <v-icon>mdi-logout</v-icon>
        <span>退出登入</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<script setup>
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useStore } from 'vuex';
import router from './router';

const { mobile } = useDisplay();
const store = useStore();

// 使用 computed 优化性能
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

const isMobile = computed(() => mobile.value);

// 优化登出逻辑
const logout = async () => {
  try {
    await store.dispatch('auth/logout');
    // 等待一小段时间确保状态更新完成
    await new Promise(resolve => setTimeout(resolve, 100));
    // 使用 replace 而不是 push
    await router.replace('/login');
  } catch (error) {
    console.error('登出失败:', error);
  }
};

console.log('isAuthenticated:', isAuthenticated.value);
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  min-height: 5vh;
  display: flex;
  flex-direction: column;
}

/* 使用 CSS 变量优化样式管理 */
:root {
  --bottom-nav-height: 56px;
  --primary-color: #1976d2;
  --error-color: #f44336;
}

/* 主要内容区域底部内边距 */
.main-content {
  padding-bottom: var(--bottom-nav-height) !important;
  flex: 1;
}

/* 组件包装器样式 */
.component-wrapper {
  min-height: 100%;
  width: 100%;
}

/* 底部导航栏样式 */
.bottom-nav {
  height: var(--bottom-nav-height) !important;
  z-index: 2;
}

/* 添加过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>