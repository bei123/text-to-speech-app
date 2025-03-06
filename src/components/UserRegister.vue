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
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? '注册中...' : '注册' }}
      </button>
    </form>
    <p>已有账号？<router-link to="/login">登录</router-link></p>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

export default {
  name: 'UserRegister',
  setup() {
    const form = ref({
      username: '',
      email: '',
      password: ''
    });

    const router = useRouter();
    const isSubmitting = ref(false);

    const register = async () => {
      if (isSubmitting.value) return;
      isSubmitting.value = true;

      // 前端验证
      if (!form.value.username || !form.value.email || !form.value.password) {
        alert('请填写所有字段');
        isSubmitting.value = false;
        return;
      }

      // 邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.value.email)) {
        alert('请输入有效的邮箱地址');
        isSubmitting.value = false;
        return;
      }

      // 密码长度验证
      if (form.value.password.length < 6) {
        alert('密码长度至少为6位');
        isSubmitting.value = false;
        return;
      }

      try {
        await axios.post('http://127.0.0.1:5000/register', {
          username: form.value.username,
          email: form.value.email,
          password: form.value.password
        });
        alert('注册成功');
        router.push('/login'); // 跳转到登录页
      } catch (error) {
        let errorMessage = '注册失败，请稍后重试';
        if (error.response && error.response.data) {
          errorMessage = error.response.data.message || JSON.stringify(error.response.data);
        } else if (error.message) {
          errorMessage = error.message;
        }
        alert(errorMessage);
      } finally {
        isSubmitting.value = false;
      }
    };

    return {
      form,
      register,
      isSubmitting
    };
  }
};
</script>

<style scoped>

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