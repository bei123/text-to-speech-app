<template>
    <div class="auth-container">
        <h1>登录</h1>
        <form @submit.prevent="submitLogin">
            <div class="form-group">
                <label for="username">用户名</label>
                <input type="text" id="username" v-model="username" required />
            </div>
            <div class="form-group">
                <label for="password">密码</label>
                <input type="password" id="password" v-model="password" autocomplete="current-password" required />
            </div>
            <button type="submit" :disabled="isSubmitting">登录</button>
        </form>
        <p>还没有账号？<router-link to="/register">注册</router-link></p>
    </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import axios from 'axios';

export default {
    name: 'UserLogin',
    setup() {
        const store = useStore();
        const router = useRouter();

        const username = ref('');
        const password = ref('');
        const isSubmitting = ref(false);

        const submitLogin = async () => {
  isSubmitting.value = true;
  try {
    const response = await axios.post('http://127.0.0.1:5000/login', {
      username: username.value,
      password: password.value
    });

   
    const { token, user } = response.data;

    // 调用 Vuex 的 login action，传递 token 和 user
    store.dispatch('login', { token, user });

    alert('登录成功');

    // 检查是否有重定向路径
    const redirect = router.currentRoute.value.query.redirect;
    if (redirect) {
      router.push(redirect); 
    } else {
      router.push('/'); // 默认跳转到主页
    }
  } catch (error) {
    let errorMessage = '登录失败，请稍后重试';
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    alert(errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

        return {
            username,
            password,
            isSubmitting,
            submitLogin
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