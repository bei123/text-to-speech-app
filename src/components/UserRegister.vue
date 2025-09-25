<template>
  <div class="auth-container">
    <h1>注册</h1>
    <form @submit.prevent="register">
      <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" v-model="form.username" required />
      </div>
      <div class="form-group">
        <label for="email">邮箱</label>
        <input type="email" id="email" v-model="form.email" required />
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" v-model="form.password" required @focus="showPasswordTips = true"
          @blur="handlePasswordBlur" />
        <div class="password-tips" v-show="showPasswordTips">
          <div class="tips-content">
            <div class="tips-title">密码要求：</div>
            <div class="tips-list">
              <div class="tip-item" :class="{ 'met': form.password.length >= 6 }">
                <span class="tip-icon">{{ form.password.length >= 6 ? '✓' : '×' }}</span>
                <span class="tip-text">至少6个字符</span>
              </div>
              <div class="tip-item" :class="{ 'met': /[a-zA-Z]/.test(form.password) }">
                <span class="tip-icon">{{ /[a-zA-Z]/.test(form.password) ? '✓' : '×' }}</span>
                <span class="tip-text">包含字母</span>
              </div>
              <div class="tip-item" :class="{ 'met': /[0-9]/.test(form.password) }">
                <span class="tip-icon">{{ /[0-9]/.test(form.password) ? '✓' : '×' }}</span>
                <span class="tip-text">包含数字</span>
              </div>
            </div>
          </div>
          <div class="password-strength" v-if="form.password">
            <div class="strength-bar">
              <div class="strength-progress" :style="{ width: passwordStrength + '%', backgroundColor: strengthColor }">
              </div>
            </div>
            <span class="strength-text">{{ strengthText }}</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="confirmPassword">确认密码</label>
        <input type="password" id="confirmPassword" v-model="form.confirmPassword" required />
        <div class="password-match" v-if="form.confirmPassword">
          <span class="match-icon" :class="{ 'met': form.password === form.confirmPassword }">
            {{ form.password === form.confirmPassword ? '✓' : '×' }}
          </span>
          <span class="match-text">{{ form.password === form.confirmPassword ? '密码匹配' : '密码不匹配' }}</span>
        </div>
      </div>
      <button type="submit" :disabled="isSubmitting || !isFormValid">
        {{ isSubmitting ? '注册中...' : '注册' }}
      </button>
    </form>
    <p>已有账号？<router-link to="/login">登录</router-link></p>
    <Snackbar v-if="snackbar" :message="snackbarMessage" :type="snackbarType" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Snackbar from './MySnackbar.vue';
import CryptoJS from 'crypto-js';

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

const router = useRouter();
const isSubmitting = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarType = ref('');
const showPasswordTips = ref(false);

// 表单验证
const isFormValid = computed(() => {
  const { username, email, password, confirmPassword } = form.value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // 密码验证：至少6个字符，包含字母和数字
  const isPasswordValid = password.length >= 6 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password);
  
  return username &&
    email &&
    password &&
    confirmPassword &&
    emailRegex.test(email) &&
    isPasswordValid &&
    password === confirmPassword;
});

// 显示提示信息
const showSnackbar = (message, type, duration = 3000) => {
  snackbarMessage.value = message;
  snackbarType.value = type;
  snackbar.value = true;

  setTimeout(() => {
    snackbar.value = false;
  }, duration);
};

// 计算密码强度
const passwordStrength = computed(() => {
  let strength = 0;
  const password = form.value.password;

  if (password.length >= 6) strength += 33;
  if (/[a-zA-Z]/.test(password)) strength += 33;
  if (/[0-9]/.test(password)) strength += 34;

  return strength;
});

// 密码强度颜色
const strengthColor = computed(() => {
  const strength = passwordStrength.value;
  if (strength <= 20) return '#ff4d4f';
  if (strength <= 40) return '#faad14';
  if (strength <= 60) return '#1890ff';
  if (strength <= 80) return '#52c41a';
  return '#52c41a';
});

// 密码强度文本
const strengthText = computed(() => {
  const strength = passwordStrength.value;
  if (strength <= 20) return '非常弱';
  if (strength <= 40) return '弱';
  if (strength <= 60) return '中等';
  if (strength <= 80) return '强';
  return '非常强';
});

// 处理密码输入框失焦事件
const handlePasswordBlur = () => {
  // 如果密码确认框有焦点，保持显示提示
  if (document.activeElement.id === 'confirmPassword') {
    return;
  }
  // 延迟隐藏提示，以便用户能看到验证结果
  setTimeout(() => {
    showPasswordTips.value = false;
  }, 1000);
};

// 注册逻辑
const register = async () => {
  if (isSubmitting.value || !isFormValid.value) return;
  isSubmitting.value = true;

  try {
    // 获取加密密钥
    // 使用固定的初始密钥对用户名进行加密
    const initialKey = 'text-to-speech-initial-key';
    const encryptedUsernameForKey = CryptoJS.AES.encrypt(form.value.username, initialKey).toString();

    const keyResponse = await axios.get('https://backend.2000gallery.art:5000/encryption-key', {
      params: { encryptedUsername: encryptedUsernameForKey }
    });
    const secretKey = keyResponse.data.key;

    // 加密用户名、邮箱和密码
    const encryptedUsername = CryptoJS.AES.encrypt(form.value.username, secretKey).toString();
    const encryptedEmail = CryptoJS.AES.encrypt(form.value.email, secretKey).toString();
    const encryptedPassword = CryptoJS.AES.encrypt(form.value.password, secretKey).toString();

    await axios.post('https://backend.2000gallery.art:5000/register', {
      encryptedUsername,
      encryptedEmail,
      encryptedPassword,
      key: secretKey
    });

    showSnackbar('注册成功', 'success', 2000);

    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (error) {
    let errorMessage = '注册失败，请稍后重试';

    if (error.response?.data?.code) {
      switch (error.response.data.code) {
        case 'BOTH_EXIST':
          errorMessage = '用户名和邮箱都已被注册，请更换其他用户名和邮箱';
          break;
        case 'USERNAME_EXISTS':
          errorMessage = '该用户名已被使用，请选择其他用户名';
          break;
        case 'EMAIL_EXISTS':
          errorMessage = '该邮箱已被注册，请使用其他邮箱';
          break;
        case 'PASSWORD_TOO_SHORT':
          errorMessage = '密码长度至少为6个字符';
          break;
        case 'PASSWORD_NO_LETTER':
          errorMessage = '密码必须包含至少一个字母';
          break;
        case 'PASSWORD_NO_NUMBER':
          errorMessage = '密码必须包含至少一个数字';
          break;
        default:
          errorMessage = error.response?.data?.message || errorMessage;
      }
    }

    showSnackbar(errorMessage, 'error');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* 样式保持不变 */
.auth-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #333;
}

.form-group {
  position: relative;
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  color: #555;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

input:focus {
  border-color: #42b983;
  outline: none;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

button:hover {
  background-color: #3aa876;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button:disabled:hover {
  background-color: #ccc;
}

p {
  text-align: center;
  margin-top: 20px;
}

a {
  color: #42b983;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.password-requirements {
  margin: 16px 0;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.requirements-title {
  font-size: 14px;
  color: #495057;
  margin-bottom: 8px;
  font-weight: 500;
}

.requirements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.requirement-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #e9ecef;
  color: #adb5bd;
  font-size: 12px;
  transition: all 0.2s ease;
}

.requirement-icon.met {
  background-color: #d4edda;
  color: #28a745;
}

.requirement-text {
  color: #6c757d;
}

.password-strength {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background-color: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.strength-progress {
  height: 100%;
  transition: all 0.3s ease;
}

.strength-text {
  font-size: 12px;
  color: #6c757d;
  min-width: 60px;
}

.password-match {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.match-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #e9ecef;
  color: #adb5bd;
  font-size: 12px;
  transition: all 0.2s ease;
}

.match-icon.met {
  background-color: #d4edda;
  color: #28a745;
}

.match-text {
  color: #6c757d;
}

.password-tips {
  margin-top: 8px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.tips-content {
  margin-bottom: 8px;
}

.tips-title {
  font-size: 13px;
  color: #495057;
  margin-bottom: 8px;
  font-weight: 500;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6c757d;
  transition: all 0.2s ease;
}

.tip-item.met {
  color: #28a745;
}

.tip-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #e9ecef;
  color: #adb5bd;
  font-size: 12px;
  transition: all 0.2s ease;
}

.tip-item.met .tip-icon {
  background-color: #d4edda;
  color: #28a745;
}

.tip-text {
  flex: 1;
}

.password-strength {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>