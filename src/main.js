import { createApp } from 'vue'; // Vue 3 的语法
import App from './App.vue';
import vuetify from './plugins/vuetify'; // 引入 Vuetify 插件
import router from './router'; // 引入路由
import store from './store'; // 引入 Vuex 状态管理
import '@fortawesome/fontawesome-free/css/all.css'; // 引入 FontAwesome 样式
import api from './utils/axios'; // 引入 Axios 实例
import '@mdi/font/css/materialdesignicons.min.css';
// ARMS 含 rrweb，异步加载避免阻塞首屏；失败时不影响主应用
import('./plugins/armsRum')
  .then(({ initArmsRum, syncArmsRumUser }) => {
    initArmsRum();
    syncArmsRumUser(store.getters['auth/user']);
  })
  .catch(() => {});

// 创建 Vue 应用
const app = createApp(App);

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('全局错误:', err);
  console.error('组件:', vm);
  console.error('错误信息:', info);
};

// 挂载全局工具
app.config.globalProperties.$api = api;

// 使用插件
app.use(vuetify)
  .use(router)
  .use(store)
  .mount('#app');