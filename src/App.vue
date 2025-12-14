<template>
  <v-app>
    <!-- 顶部导航栏（桌面端） -->
    <v-app-bar v-if="isAuthenticated && !isMobile" app color="primary" dark elevation="4">
      <v-toolbar-title class="font-weight-bold">Ai语音生命</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text to="/" class="mx-2">Home</v-btn>
      <v-btn text to="/custom-voice" class="mx-2">自定义音色</v-btn>
      <v-btn text to="/community" class="mx-2">音色圈子</v-btn>
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
        <span class="nav-label">首页</span>
      </v-btn>
      <v-btn to="/custom-voice" value="reference">
        <v-icon>mdi-microphone</v-icon>
        <span class="nav-label">音色</span>
      </v-btn>
      <v-btn to="/community" value="community">
        <v-icon>mdi-account-group</v-icon>
        <span class="nav-label">圈子</span>
      </v-btn>
      <v-btn to="/history" value="history">
        <v-icon>mdi-history</v-icon>
        <span class="nav-label">记录</span>
      </v-btn>
      <v-btn @click="showMoreMenu = true" value="more">
        <v-icon>mdi-dots-vertical</v-icon>
        <span class="nav-label">更多</span>
      </v-btn>
    </v-bottom-navigation>

    <!-- 更多菜单（移动端底部抽屉） -->
    <v-bottom-sheet v-if="isAuthenticated && isMobile" v-model="showMoreMenu">
      <v-list>
        <v-list-item to="/sponsors" @click="showMoreMenu = false">
          <v-list-item-icon>
            <v-icon>mdi-heart</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>为爱发电</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="handleLogout">
          <v-list-item-icon>
            <v-icon color="error">mdi-logout</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="error--text">退出登入</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-bottom-sheet>
  </v-app>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import { useStore } from 'vuex';
import router from './router';

const { mobile } = useDisplay();
const store = useStore();

// 使用 computed 优化性能
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

const isMobile = computed(() => mobile.value);

// 控制更多菜单显示
const showMoreMenu = ref(false);

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

// 处理登出（关闭菜单后登出）
const handleLogout = async () => {
  showMoreMenu.value = false;
  await logout();
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

/* 移动端导航栏标签样式 */
.bottom-nav .nav-label {
  font-size: 11px;
  line-height: 1.2;
  margin-top: 2px;
}

/* 移动端导航栏按钮样式优化 */
.bottom-nav .v-btn {
  min-width: 60px !important;
  padding: 4px 8px !important;
}

.bottom-nav .v-btn .v-icon {
  font-size: 20px !important;
}

/* 小屏幕设备进一步优化 */
@media (max-width: 360px) {
  .bottom-nav .nav-label {
    font-size: 10px;
  }
  
  .bottom-nav .v-btn {
    min-width: 50px !important;
    padding: 4px 4px !important;
  }
  
  .bottom-nav .v-btn .v-icon {
    font-size: 18px !important;
  }
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