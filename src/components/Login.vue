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
        <div v-if="snackbar" :class="['snackbar', snackbarType]">
            {{ snackbarMessage }}
        </div>
    </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import axios from 'axios';
import CryptoJS from 'crypto-js';

export default {
    name: 'UserLogin',
    setup() {
        const store = useStore();
        const router = useRouter();

        const username = ref('');
        const password = ref('');
        const isSubmitting = ref(false);
        const snackbar = ref(false); // 控制 snackbar 显示
        const snackbarMessage = ref(''); // snackbar 提示信息
        const snackbarType = ref(''); // snackbar 类型（success/error）

        const showSnackbar = (message, type, duration = 3000) => {
            snackbarMessage.value = message;
            snackbarType.value = type;
            snackbar.value = true;

            // 自动关闭 snackbar
            setTimeout(() => {
                snackbar.value = false;
            }, duration);
        };

        const encryptPassword = (password, secretKey) => {
            return CryptoJS.AES.encrypt(password, secretKey).toString(); // 返回 Base64 编码的字符串
        };

        const submitLogin = async () => {
            isSubmitting.value = true;
            try {
                // 1. 从后端获取加密密钥
                const keyResponse = await axios.get('http://aidudio.2000gallery.art:5000/api/encryption-key', {
                    params: { username: username.value } // 传递用户名
                });
                const secretKey = keyResponse.data.key;

                // 2. 加密密码
                const encryptedPassword = encryptPassword(password.value, secretKey);
                // console.log('加密后的密码:', encryptedPassword);

                // 3. 发送登录请求
                const response = await axios.post('http://aidudio.2000gallery.art:5000/login', {
                    username: username.value,
                    encryptedPassword, // 发送加密后的密码
                });

                // 从响应中提取 accessToken、refreshToken 和 user
                const { accessToken, refreshToken, user } = response.data;

                // 调用 Vuex 的 login action，传递 accessToken、refreshToken 和 user
                store.dispatch('login', { accessToken, refreshToken, user });

                // 显示成功提示
                showSnackbar('登录成功', 'success', 2000);

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

                // 显示错误提示
                showSnackbar(errorMessage, 'error', 3000);
            } finally {
                isSubmitting.value = false;
            }
        };

        return {
            username,
            password,
            isSubmitting,
            snackbar,
            snackbarMessage,
            snackbarType,
            submitLogin,
        };
    },
};
</script>

<style scoped>
.snackbar {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 30px;
    border-radius: 8px;
    color: #fff;
    z-index: 1000;
    animation: fadeInOut 3s ease-in-out;
}

.snackbar.success {
    background-color: #4caf50;
    /* 成功提示背景色 */
}

.snackbar.error {
    background-color: #f44336;
    /* 错误提示背景色 */
}

@keyframes fadeInOut {
    0% {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
    }

    10% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }

    90% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }

    100% {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
    }
}

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