<template>
  <v-app>
    <!-- 顶部导航栏（桌面端） -->
    <v-app-bar v-if="isAuthenticated && !isMobile" app color="primary" dark elevation="4">
      <v-toolbar-title class="font-weight-bold">Ai语音生命</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text to="/" class="mx-2">Home</v-btn>
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
        <router-view></router-view>
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
import { useStore } from 'vuex'; // 引入 useStore
import router from './router';

const { mobile } = useDisplay();
const store = useStore(); // 获取 Vuex store

// 使用 isAuthenticated getter 判断用户是否已登录
const isAuthenticated = computed(() => store.getters.isAuthenticated);

// 判断是否为移动端
const isMobile = computed(() => mobile.value);

// 登出逻辑
const logout = () => {
  store.dispatch('logout'); // 调用 Vuex 的 logout action
  router.push('/login'); // 跳转到登录页面
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

/* 主要内容区域底部内边距 */
.main-content {
  padding-bottom: 56px !important; /* 确保优先级 */
}

/* 底部导航栏样式 */
.bottom-nav {
  height: 56px !important; /* 显式设置高度 */
  z-index: 2;
}
</style>