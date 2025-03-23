<template>
  <div class="not-found">
    <v-container class="text-center">
      <h1 class="text-h1 mb-4">404</h1>
      <h2 class="text-h4 mb-4">页面未找到</h2>
      <p class="text-body-1 mb-6">抱歉，您访问的页面不存在。</p>
      <v-btn color="primary" to="/">
        <v-icon left>mdi-home</v-icon>
        返回首页
      </v-btn>
    </v-container>
  </div>
</template>

<script setup>
// 组件逻辑
</script>

<style scoped>
.not-found {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-h1 {
  font-size: 8rem;
  color: var(--primary-color);
  font-weight: bold;
}
</style> 