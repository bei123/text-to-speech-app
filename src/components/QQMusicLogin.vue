<template>
  <div class="qq-music-login">
    <div class="login-container">
      <h2>QQ音乐登录</h2>
      
      <!-- 二维码显示区域 -->
      <div class="qr-container" v-if="!isLoggedIn">
        <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QQ音乐登录二维码" />
        <div v-else class="loading">加载二维码中...</div>
        
        <!-- 状态提示 -->
        <div class="status-message" :class="statusClass">
          {{ statusMessage }}
        </div>
      </div>

      <!-- 登录成功显示 -->
      <div v-else class="login-success">
        <div class="success-icon">✓</div>
        <p>登录成功！</p>
        <p class="user-info">QQ号：{{ userInfo.qqUin }}</p>
        <p class="expire-info">凭证有效期至：{{ formatDate(userInfo.expiresAt) }}</p>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <button 
          v-if="!isLoggedIn" 
          @click="refreshQRCode" 
          :disabled="isLoading"
          class="refresh-btn"
        >
          刷新二维码
        </button>
        <button 
          v-else 
          @click="logout" 
          class="logout-btn"
        >
          退出登录
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'QQMusicLogin',
  setup() {
    const store = useStore();
    const router = useRouter();
    const qrCodeUrl = ref(null);
    const qrIdentifier = ref(null);
    const qrData = ref(null);
    const qrMimeType = ref('image/png');
    const qrType = ref('qq');
    const status = ref('SCAN');
    const isLoggedIn = ref(false);
    const isLoading = ref(false);
    const userInfo = ref(null);
    let checkInterval = null;

    // 状态消息映射
    const statusMessages = {
      SCAN: '请使用QQ音乐APP扫描二维码登录',
      CONF: '已扫描，请在手机上确认登录',
      DONE: '登录成功！',
      TIMEOUT: '二维码已过期，请刷新',
      REFUSE: '已拒绝登录',
      OTHER: '未知状态'
    };

    // 状态样式映射
    const statusClasses = {
      SCAN: 'status-scan',
      CONF: 'status-confirm',
      DONE: 'status-done',
      TIMEOUT: 'status-timeout',
      REFUSE: 'status-refuse',
      OTHER: 'status-other'
    };

    // 计算属性
    const statusMessage = computed(() => statusMessages[status.value]);
    const statusClass = computed(() => statusClasses[status.value]);

    // 获取token
    const getToken = () => {
      const token = store.getters['auth/accessToken'];
      const currentUser = store.getters['auth/user'];
      
      if (!token || !currentUser) {
        console.error('未登录或token无效');
        return null;
      }
      return token;
    };

    // 获取二维码
    const getQRCode = async () => {
      try {
        isLoading.value = true;
        const token = getToken();
        if (!token) {
          showSnackbar('请先登录');
          router.replace('/login');
          return;
        }

        console.log('正在获取二维码...');
        
        const response = await axios.get('https://backend.2000gallery.art:5000/qqmusic/qrcode/identifier', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            login_type: 'QQ'  // 默认使用QQ登录
          }
        });

        if (response.data.code !== 200) {
          throw new Error(response.data.message || '获取二维码失败');
        }

        const { data, identifier, mimetype, qr_type } = response.data.data;
        console.log('获取到新的二维码标识符:', identifier);

        if (!identifier) {
          console.error('未获取到二维码标识符');
          showSnackbar('获取二维码失败，请重试');
          return;
        }

        // 如果标识符发生变化，更新并重新开始轮询
        if (qrIdentifier.value !== identifier) {
          qrIdentifier.value = identifier;
          qrData.value = data;  // 保存原始的 base64 数据
          qrMimeType.value = mimetype || 'image/png';
          qrType.value = qr_type || 'qq';  // 保存二维码类型
          
          if (qrCodeUrl.value) {
            URL.revokeObjectURL(qrCodeUrl.value);
          }
          // 将 base64 数据转换为 Blob
          const byteString = atob(data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: qrMimeType.value });
          qrCodeUrl.value = URL.createObjectURL(blob);
          status.value = 'SCAN';
          startCheckingStatus();
        }
      } catch (error) {
        console.error('获取二维码失败:', error);
        if (error.response?.status === 401) {
          try {
            await store.dispatch('auth/refreshToken');
            await getQRCode();
            return;
          } catch (refreshError) {
            await store.dispatch('auth/logout');
            showSnackbar('登录已过期，请重新登录');
            router.replace('/login');
            return;
          }
        }
        status.value = 'OTHER';
        showSnackbar(error.message || '获取二维码失败，请重试');
      } finally {
        isLoading.value = false;
      }
    };

    // 获取用户凭证
    const getUserCredentials = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error('未登录');
        }

        const response = await axios.get('https://backend.2000gallery.art:5000/qqmusic/credentials', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data.code !== 200) {
          throw new Error(response.data.message || '获取用户凭证失败');
        }

        console.log('获取到的用户凭证:', response.data.data);
        userInfo.value = response.data.data;
        isLoggedIn.value = true;
        status.value = 'DONE';
        showSnackbar('QQ音乐登录成功！');
      } catch (error) {
        console.error('获取用户凭证失败:', error);
        if (error.response?.status === 401) {
          try {
            await store.dispatch('auth/refreshToken');
            await getUserCredentials();
            return;
          } catch (refreshError) {
            await store.dispatch('auth/logout');
            showSnackbar('登录已过期，请重新登录');
            router.replace('/login');
            return;
          }
        }
        showSnackbar(error.message || '获取用户信息失败，请重试');
      }
    };

    // 检查二维码状态
    const checkStatus = async () => {
      if (!qrIdentifier.value || !qrData.value) {
        console.log('没有二维码标识符或数据，停止检查');
        stopCheckingStatus();
        return;
      }

      try {
        const token = getToken();
        if (!token) {
          console.log('未获取到token，停止检查');
          stopCheckingStatus();
          return;
        }

        console.log('正在检查二维码状态，标识符:', qrIdentifier.value);
        const response = await axios.get(`https://backend.2000gallery.art:5000/qqmusic/qrcode/${qrIdentifier.value}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            data: qrData.value,      // 二维码图像数据（base64）
            qr_type: qrType.value,   // 二维码类型
            mimetype: qrMimeType.value,  // 图片类型
            identifier: qrIdentifier.value  // 标识符
          }
        });

        if (response.data.code !== 200) {
          throw new Error(response.data.message || '检查二维码状态失败');
        }

        console.log('二维码状态响应:', response.data);
        const newStatus = response.data.data.status;
        
        // 只有在状态发生变化时才更新
        if (status.value !== newStatus) {
          console.log('状态发生变化:', status.value, '->', newStatus);
          status.value = newStatus;
        }

        if (newStatus === 'DONE') {
          stopCheckingStatus();
          await getUserCredentials();
        }
      } catch (error) {
        console.error('检查二维码状态失败:', error);
        if (error.response?.status === 401) {
          try {
            await store.dispatch('auth/refreshToken');
            await checkStatus();
            return;
          } catch (refreshError) {
            await store.dispatch('auth/logout');
            showSnackbar('登录已过期，请重新登录');
            router.replace('/login');
            return;
          }
        }
        showSnackbar(error.message || '检查二维码状态失败，请重试');
      }
    };

    // 显示提示信息
    const showSnackbar = (message) => {
      console.log('提示信息:', message);
    };

    // 开始轮询检查状态
    const startCheckingStatus = () => {
      console.log('开始轮询检查状态...');
      stopCheckingStatus(); // 确保先停止之前的轮询
      checkInterval = setInterval(async () => {
        console.log('执行状态检查...');
        await checkStatus();
      }, 3000); // 每3秒检查一次
    };

    // 停止轮询
    const stopCheckingStatus = () => {
      console.log('停止轮询检查...');
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    };

    // 刷新二维码
    const refreshQRCode = () => {
      if (qrCodeUrl.value) {
        URL.revokeObjectURL(qrCodeUrl.value);
      }
      getQRCode();
    };

    // 退出登录
    const logout = () => {
      isLoggedIn.value = false;
      userInfo.value = null;
      refreshQRCode();
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '未知';
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    onMounted(() => {
      console.log('组件挂载，开始获取二维码...');
      getQRCode();
    });

    onUnmounted(() => {
      console.log('组件卸载，清理资源...');
      stopCheckingStatus();
      if (qrCodeUrl.value) {
        URL.revokeObjectURL(qrCodeUrl.value);
      }
    });

    return {
      qrCodeUrl,
      status,
      isLoggedIn,
      isLoading,
      userInfo,
      statusMessage,
      statusClass,
      refreshQRCode,
      logout,
      formatDate
    };
  }
};
</script>

<style scoped>
.qq-music-login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

h2 {
  color: #333;
  margin-bottom: 1.5rem;
}

.qr-container {
  margin: 1rem 0;
}

.qr-container img {
  width: 200px;
  height: 200px;
  border: 1px solid #eee;
}

.loading {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  margin: 0 auto;
  border: 1px solid #eee;
}

.status-message {
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.status-scan {
  color: #666;
  background: #f5f5f5;
}

.status-confirm {
  color: #1890ff;
  background: #e6f7ff;
}

.status-done {
  color: #52c41a;
  background: #f6ffed;
}

.status-timeout {
  color: #faad14;
  background: #fffbe6;
}

.status-refuse {
  color: #ff4d4f;
  background: #fff2f0;
}

.status-other {
  color: #666;
  background: #f5f5f5;
}

.login-success {
  margin: 1rem 0;
}

.success-icon {
  font-size: 48px;
  color: #52c41a;
  margin-bottom: 1rem;
}

.user-info {
  font-size: 1.1rem;
  color: #333;
  margin: 0.5rem 0;
}

.expire-info {
  color: #666;
  font-size: 0.9rem;
}

.actions {
  margin-top: 1.5rem;
}

button {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.refresh-btn {
  background: #1890ff;
  color: white;
}

.refresh-btn:hover {
  background: #40a9ff;
}

.refresh-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.logout-btn {
  background: #ff4d4f;
  color: white;
}

.logout-btn:hover {
  background: #ff7875;
}
</style> 