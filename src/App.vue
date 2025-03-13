<template>
  <div id="app">

    <router-view></router-view>

  </div>
</template>

<script setup>
// 不需要额外的逻辑时，可以省略 <script setup>
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

nav {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.nav-link {
  text-decoration: none;
  /* 去掉默认的下划线 */
  color: #2c3e50;
  /* 默认文字颜色 */
  padding: 8px 16px;
  /* 内边距 */
  border: 2px solid #2c3e50;
  /* 边框 */
  border-radius: 4px;
  /* 圆角 */
  transition: all 0.3s ease;
  /* 添加过渡效果 */
  margin: 0 5px;
  /* 链接之间的间距 */
}

.nav-link:hover {
  background-color: #2c3e50;
  /* 鼠标悬停时的背景颜色 */
  color: white;
  /* 鼠标悬停时的文字颜色 */
}

footer {
  margin-top: 40px;
  padding: 10px;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
}
</style>