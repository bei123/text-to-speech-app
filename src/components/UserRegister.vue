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
        <input type="password" id="password" v-model="form.password" required />
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

const form = ref({
  username: '',
  email: '',
  password: ''
});

const router = useRouter();
const isSubmitting = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarType = ref('');

// 表单验证
const isFormValid = computed(() => {
  const { username, email, password } = form.value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return username && email && password && emailRegex.test(email) && password.length >= 6;
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

// 注册逻辑
const register = async () => {
  if (isSubmitting.value || !isFormValid.value) return;
  isSubmitting.value = true;

  try {
    await axios.post('http://aidudio.2000gallery.art:5000/register', {
      username: form.value.username,
      email: form.value.email,
      password: form.value.password
    });

    showSnackbar('注册成功', 'success', 2000);

    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || '注册失败，请稍后重试';
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
</style>