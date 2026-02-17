<template>
  <v-app :class="{ 'spring-festival': springFestivalTheme }">
    <!-- 顶部导航栏（桌面端） -->
    <v-app-bar v-if="isAuthenticated && !isMobile" app color="primary" dark elevation="4">
      <v-toolbar-title class="font-weight-bold">
        {{ springFestivalTheme ? `Ai语音生命 · ${SPRING_FESTIVAL_ZODIAC}大吉` : 'Ai语音生命' }}
      </v-toolbar-title>
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
    <v-main app class="main-with-festival">
      <!-- 春节装饰：灯笼 + 福字（仅主题开启时显示） -->
      <template v-if="springFestivalTheme">
        <div class="festival-lanterns">
          <span v-for="i in 5" :key="i" class="lantern"></span>
        </div>
        <span class="fu-char fu-tl">福</span>
        <span class="fu-char fu-tr">福</span>
        <span class="fu-char fu-bl">福</span>
        <span class="fu-char fu-br">福</span>
      </template>
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
    <v-footer color="primary" dark app inset class="app-footer">
      <v-spacer></v-spacer>
      <div class="footer-inner">
        <span v-if="springFestivalTheme" class="footer-blessing">祝各位新年快乐，万事如意！</span>
        <span class="font-weight-bold">{{ springFestivalTheme ? `© 2025 Ai 语音生命 · ${SPRING_FESTIVAL_ZODIAC}大吉` : '© 2025 Ai 语音生命' }}</span>
      </div>
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
        <span class="nav-label">自定义音色</span>
      </v-btn>
      <v-btn to="/community" value="community">
        <v-icon>mdi-account-group</v-icon>
        <span class="nav-label">音色圈子</span>
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
import { computed, ref, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import { useStore } from 'vuex';
import router from './router';
import { SPRING_FESTIVAL_THEME, SPRING_FESTIVAL_ZODIAC } from '@/constants/constants';

const springFestivalTheme = ref(SPRING_FESTIVAL_THEME);
const { mobile } = useDisplay();
const store = useStore();

onMounted(() => {
  if (SPRING_FESTIVAL_THEME) {
    document.title = `Ai语音生命 · ${SPRING_FESTIVAL_ZODIAC}大吉`;
  }
});

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

/* 春节主题样式（SPRING_FESTIVAL_THEME 为 true 时生效） */
.spring-festival .main-content {
  background: linear-gradient(180deg, #fffbf5 0%, #fff5eb 50%, #fffbf5 100%);
  min-height: 100%;
}
.spring-festival .v-app-bar {
  background: linear-gradient(90deg, #c41e3a 0%, #a01830 100%) !important;
}
.spring-festival .v-footer {
  background: linear-gradient(90deg, #a01830 0%, #c41e3a 100%) !important;
}
.spring-festival .bottom-nav {
  background: linear-gradient(0deg, #c41e3a 0%, #a01830 100%) !important;
}
.spring-festival #app {
  color: #2c3e50;
}

/* 春节装饰：灯笼 */
.main-with-festival {
  position: relative;
}
.festival-lanterns {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 24px;
  z-index: 1;
  pointer-events: none;
}
.lantern {
  display: inline-block;
  position: relative;
  width: 32px;
  height: 44px;
  border-radius: 50% 50% 48% 48%;
  background: linear-gradient(145deg, #e63946 0%, #c41e3a 40%, #8b1538 100%);
  box-shadow: 0 2px 8px rgba(139, 21, 56, 0.4), inset -4px -4px 12px rgba(0,0,0,0.2), inset 4px 2px 12px rgba(255,220,180,0.35);
  border: 1px solid rgba(212, 175, 55, 0.5);
  transform-origin: top center;
  animation: lantern-sway 2.5s ease-in-out infinite, lantern-glow 2s ease-in-out infinite;
}
.lantern:nth-child(1) { animation-delay: 0s, 0s; }
.lantern:nth-child(2) { animation-delay: 0.2s, 0.4s; }
.lantern:nth-child(3) { animation-delay: 0.4s, 0.8s; }
.lantern:nth-child(4) { animation-delay: 0.2s, 0.4s; }
.lantern:nth-child(5) { animation-delay: 0s, 0s; }
.lantern::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 6px;
  background: #d4af37;
  border-radius: 2px;
}
.lantern::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 8px;
  background: linear-gradient(180deg, #d4af37, #8b7355);
}
@keyframes lantern-sway {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
}
@keyframes lantern-glow {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(139, 21, 56, 0.4), inset -4px -4px 12px rgba(0,0,0,0.2), inset 4px 2px 12px rgba(255,220,180,0.35), 0 0 12px rgba(212, 175, 55, 0.2);
  }
  50% {
    box-shadow: 0 2px 12px rgba(139, 21, 56, 0.5), inset -4px -4px 12px rgba(0,0,0,0.2), inset 4px 2px 12px rgba(255,220,180,0.4), 0 0 20px rgba(212, 175, 55, 0.45);
  }
}

/* 春节装饰：福字 */
.fu-char {
  position: absolute;
  font-size: 42px;
  font-weight: bold;
  color: #c41e3a;
  text-shadow: 1px 1px 0 #d4af37, 2px 2px 4px rgba(0,0,0,0.2);
  opacity: 0.9;
  pointer-events: none;
  z-index: 1;
  font-family: 'KaiTi', 'STKaiti', '楷体', serif;
}
.fu-tl { top: 56px;  left: 12px;  animation: fu-float 4s ease-in-out infinite, fu-glow 2.5s ease-in-out infinite; }
.fu-tr { top: 56px;  right: 12px; animation: fu-float 4s ease-in-out infinite 0.5s, fu-glow 2.5s ease-in-out infinite 0.3s; }
.fu-bl { bottom: 72px; left: 12px;  animation: fu-float-bl 4s ease-in-out infinite 0.3s, fu-glow 2.5s ease-in-out infinite 0.6s; }
.fu-br { bottom: 72px; right: 12px; animation: fu-float-br 4s ease-in-out infinite 0.7s, fu-glow 2.5s ease-in-out infinite 0.2s; }
@keyframes fu-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes fu-float-bl {
  0%, 100% { transform: translateY(0) rotate(-8deg); }
  50% { transform: translateY(-10px) rotate(-8deg); }
}
@keyframes fu-float-br {
  0%, 100% { transform: translateY(0) rotate(180deg); }
  50% { transform: translateY(-10px) rotate(180deg); }
}
@keyframes fu-glow {
  0%, 100% {
    text-shadow: 1px 1px 0 #d4af37, 2px 2px 4px rgba(0,0,0,0.2), 0 0 8px rgba(212, 175, 55, 0.3);
  }
  50% {
    text-shadow: 1px 1px 0 #d4af37, 2px 2px 6px rgba(0,0,0,0.25), 0 0 16px rgba(212, 175, 55, 0.6), 0 0 24px rgba(196, 30, 58, 0.25);
  }
}
@media (max-width: 600px) {
  .fu-char { font-size: 28px; }
  .fu-tl, .fu-tr { top: 48px; }
  .festival-lanterns { gap: 12px; top: 4px; }
  .lantern { width: 24px; height: 34px; }
}

/* 页脚祝福语 */
.app-footer .footer-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.app-footer .footer-blessing {
  font-size: 1rem;
  letter-spacing: 0.05em;
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