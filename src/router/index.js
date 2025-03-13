import { createRouter, createWebHashHistory } from 'vue-router';

// 路由配置
const routes = [
  {
    path: '/',
    name: 'TextToSpeech',
    component: () => import('@/components/TextToSpeech.vue'),
    meta: {
      requiresAuth: true, // 需要登录
      title: '首页 - Ai语音生命', // 设置标题
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/components/Login.vue'),
    meta: {
      title: '登入', // 设置标题
    },
  },
  {
    path: '/sponsors',
    name: 'Sponsors',
    component: () => import('@/components/SponsorsPage.vue'),
    meta: {
      title: '为爱发电', // 设置标题
    },
  },
  {
    path: '/register',
    name: 'UserRegister',
    component: () => import('@/components/UserRegister.vue'),
    meta: {
      title: '注册', // 设置标题
    },
  },
  {
    path: '/history',
    name: 'HistoryPage',
    component: () => import('@/components/HistoryPage.vue'),
    meta: {
      requiresAuth: true, // 需要登录
      title: '历史查询', // 设置标题
    },
  },
];

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(), // 使用 Hash 模式
  routes,
});

// 检查用户是否已登录
function checkAuth() {
  const token = localStorage.getItem('token');
  return !!token; // 如果 token 存在，返回 true；否则返回 false
}

// 动态设置页面标题
function setPageTitle(to) {
  if (to.meta.title) {
    document.title = to.meta.title;
  }
}

// 处理需要登录的路由
function handleAuthRequiredRoute(to, next, isAuthenticated) {
  if (isAuthenticated) {
    next();
  } else {
    // 保存目标路径到 query 参数中
    next({ name: 'Login', query: { redirect: to.fullPath } });
  }
}

// 路由导航守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = checkAuth();

  // 动态设置页面标题
  setPageTitle(to);

  // 如果用户已经登录，尝试访问登录页面，则重定向到主页
  if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'TextToSpeech' });
    return;
  }

  // 检查是否需要登录
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    handleAuthRequiredRoute(to, next, isAuthenticated);
  } else {
    next();
  }
});

export default router;