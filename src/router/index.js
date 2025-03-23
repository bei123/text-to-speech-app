import { createRouter, createWebHashHistory } from 'vue-router';
import store from '@/store';

// 路由配置
const routes = [
  {
    path: '/',
    name: 'TextToSpeech',
    component: () => import('@/components/TextToSpeech.vue'),
    meta: {
      requiresAuth: true,
      title: '首页 - Ai语音生命',
      keepAlive: true,
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/components/Login.vue'),
    meta: {
      title: '登入',
      guest: true,
    },
  },
  {
    path: '/sponsors',
    name: 'Sponsors',
    component: () => import('@/components/SponsorsPage.vue'),
    meta: {
      requiresAuth: true,
      title: '为爱发电的人们',
    },
  },
  {
    path: '/register',
    name: 'UserRegister',
    component: () => import('@/components/UserRegister.vue'),
    meta: {
      title: '注册',
      guest: true,
    },
  },
  {
    path: '/history',
    name: 'HistoryPage',
    component: () => import('@/components/HistoryPage.vue'),
    meta: {
      requiresAuth: true,
      title: '历史查询',
      keepAlive: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/NotFound.vue'),
    meta: {
      title: '404 - 页面未找到',
    },
  },
];

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// 动态设置页面标题
const setPageTitle = (to) => {
  document.title = to.meta.title || 'Ai语音生命';
};

// 检查用户是否已登录
const checkAuth = () => {
  return store.getters['auth/isAuthenticated'];
};

// 处理需要登录的路由
const handleAuthRequiredRoute = (to, next, isAuthenticated) => {
  if (isAuthenticated) {
    next();
  } else {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  }
};

// 处理仅允许未登录用户访问的路由
const handleGuestRoute = (to, next, isAuthenticated) => {
  if (!isAuthenticated) {
    next();
  } else {
    next({ name: 'TextToSpeech' });
  }
};

// 路由导航守卫
router.beforeEach(async (to, from, next) => {
  try {
    const isAuthenticated = checkAuth();

    // 动态设置页面标题
    setPageTitle(to);

    // 处理需要登录的路由
    if (to.matched.some((record) => record.meta.requiresAuth)) {
      handleAuthRequiredRoute(to, next, isAuthenticated);
      return;
    }

    // 处理仅允许未登录用户访问的路由
    if (to.matched.some((record) => record.meta.guest)) {
      handleGuestRoute(to, next, isAuthenticated);
      return;
    }

    next();
  } catch (error) {
    console.error('路由导航错误:', error);
    next({ name: 'Login' });
  }
});

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error);
});

export default router;