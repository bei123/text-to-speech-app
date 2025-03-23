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
            <button type="submit" :disabled="loading">登录</button>
        </form>
        <p>还没有账号？<router-link to="/register">注册</router-link></p>
    </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { ElMessage } from 'element-plus';
import { API_URLS } from '@/constants/constants';

export default {
    name: 'UserLogin',
    setup() {
        const store = useStore();
        const router = useRouter();

        const username = ref('');
        const password = ref('');
        const loading = ref(false);
        const error = ref(null);

        const submitLogin = async () => {
            try {
                loading.value = true;
                error.value = null;

                // 获取加密密钥
                // 使用固定的初始密钥对用户名进行加密
                const initialKey = 'text-to-speech-initial-key';
                const encryptedUsernameForKey = CryptoJS.AES.encrypt(username.value, initialKey).toString();
                
                const keyResponse = await axios.get(API_URLS.ENCRYPTION_KEY, {
                    params: { encryptedUsername: encryptedUsernameForKey }
                });
                const secretKey = keyResponse.data.key;

                // 加密用户名和密码
                const encryptedUsername = CryptoJS.AES.encrypt(username.value, secretKey).toString();
                const encryptedPassword = CryptoJS.AES.encrypt(password.value, secretKey).toString();

                // 发送登录请求
                const response = await axios.post(API_URLS.LOGIN, {
                    encryptedUsername,
                    encryptedPassword,
                    key: secretKey
                });

                // 记录响应数据，方便调试
                console.log('登录响应：', response.data);

                // 调用 Vuex store 的 login action
                await store.dispatch('auth/login', {
                    accessToken: response.data.accessToken,
                    refreshToken: response.data.refreshToken,
                    user: response.data.user
                });

                // 登录成功后的提示
                ElMessage.success('登录成功');

                // 等待一小段时间确保状态更新完成
                await new Promise(resolve => setTimeout(resolve, 100));

                // 检查是否有重定向路径
                const redirect = router.currentRoute.value.query.redirect;
                if (redirect) {
                    await router.replace(redirect);
                } else {
                    await router.replace('/'); // 默认跳转到主页
                }
            } catch (err) {
                console.error('登录失败:', err);
                error.value = err.response?.data?.message || '登录失败，请重试';
                ElMessage.error(error.value);
            } finally {
                loading.value = false;
            }
        };

        return {
            username,
            password,
            loading,
            submitLogin,
        };
    },
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