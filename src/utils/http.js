import axios from 'axios';
import { API_BASE_URL } from '@/constants/constants';
import { attachApiSignInterceptor } from '@/utils/apiSign';

/** 带签名的基础客户端（无 Token 拦截，供 refresh-token 等使用） */
const http = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

attachApiSignInterceptor(http);

export default http;
