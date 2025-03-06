import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'TextToSpeech',
      component: () => import('@/components/TextToSpeech.vue'), // 直接使用 import()
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/components/Login.vue') // 直接使用 import()
    },
    {
      path: '/sponsors', // 新增路由
      name: 'Sponsors',
      component: () => import('@/components/SponsorsPage.vue'), // 动态导入组件
      // meta: { requiresAuth: false } // 如果需要登录才能访问，可以加上这个 meta 字段
    },
    {
      path: '/register',
      name: 'UserRegister',
      component: () => import('@/components/UserRegister.vue'),
    }
  ]
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = checkAuth();

  // 如果用户已经登录，尝试访问登录页面，则重定向到主页
  if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'TextToSpeech' });
    return;
  }

  // 检查是否需要登录
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      // 保存目标路径到 query 参数中
      next({ name: 'Login', query: { redirect: to.fullPath } });
    } else {
      next();
    }
  } else {
    next();
  }
});

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    return false;
  }

  // 如果需要验证 token 是否过期，可以在这里添加逻辑
  // const decodedToken = decodeToken(token);
  // if (decodedToken.exp < Date.now() / 1000) {
  //   localStorage.removeItem('token');
  //   return false;
  // }

  return true;
}

export default router;