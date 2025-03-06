import { createApp } from 'vue'; // Vue 3 的语法
import App from './App.vue';
import vuetify from './plugins/vuetify'; // 引入 Vuetify 插件
import router from './router'; // 引入路由
import store from './store'; // 引入 Vuex 状态管理
import '@fortawesome/fontawesome-free/css/all.css'; // 引入 FontAwesome 样式

// 创建 Vue 应用
const app = createApp(App);

// 使用插件
app.use(vuetify); // 使用 Vuetify
app.use(router);  // 使用路由
app.use(store);   // 使用 Vuex


// 挂载应用
app.mount('#app');