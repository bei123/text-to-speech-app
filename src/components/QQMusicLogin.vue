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
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

export default {
  name: 'QQMusicLogin',
  setup() {
    const qrCodeUrl = ref(null);
    const qrIdentifier = ref(null);
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

    // 获取二维码
    const getQRCode = async () => {
      try {
        isLoading.value = true;
        const response = await axios.get('/api/auth/qq-music/qrcode', {
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        qrIdentifier.value = response.headers['x-qr-identifier'];
        qrCodeUrl.value = URL.createObjectURL(response.data);
        status.value = 'SCAN';
        
        // 开始轮询检查状态
        startCheckingStatus();
      } catch (error) {
        console.error('获取二维码失败:', error);
        status.value = 'OTHER';
      } finally {
        isLoading.value = false;
      }
    };

    // 检查二维码状态
    const checkStatus = async () => {
      if (!qrIdentifier.value) return;

      try {
        const response = await axios.get(`/api/auth/qq-music/qrcode/${qrIdentifier.value}/status`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        status.value = response.data.status;

        if (status.value === 'DONE') {
          await getUserCredentials();
          stopCheckingStatus();
        } else if (status.value === 'TIMEOUT' || status.value === 'REFUSE') {
          stopCheckingStatus();
        }
      } catch (error) {
        console.error('检查状态失败:', error);
        status.value = 'OTHER';
        stopCheckingStatus();
      }
    };

    // 获取用户凭证
    const getUserCredentials = async () => {
      try {
        const response = await axios.get('/api/auth/qq-music/credentials', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        userInfo.value = response.data;
        isLoggedIn.value = true;
      } catch (error) {
        console.error('获取用户凭证失败:', error);
      }
    };

    // 开始轮询检查状态
    const startCheckingStatus = () => {
      stopCheckingStatus();
      checkInterval = setInterval(checkStatus, 2000);
    };

    // 停止轮询
    const stopCheckingStatus = () => {
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
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    onMounted(() => {
      getQRCode();
    });

    onUnmounted(() => {
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
      statusMessage: computed(() => statusMessages[status.value]),
      statusClass: computed(() => statusClasses[status.value]),
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