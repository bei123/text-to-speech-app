import api from '@/utils/axios';
import { API_PATHS } from '@/constants/constants';

/**
 * 经后端代理拉取 OSS 音频（避免浏览器 fetch 直连 OSS 触发 CORS）
 * @param {string} ossUrl
 * @returns {Promise<Blob>}
 */
export async function fetchAudioBlob(ossUrl) {
    const response = await api.get(API_PATHS.AUDIO_PROXY, {
        params: { url: ossUrl },
        responseType: 'blob',
        timeout: 120000,
    });
    return response.data;
}

/**
 * 经后端代理拉取 OSS 音频并转为 File
 * @param {string} ossUrl
 * @param {string} fileName
 * @returns {Promise<File>}
 */
export async function fetchAudioFile(ossUrl, fileName = 'audio.wav') {
    const blob = await fetchAudioBlob(ossUrl);
    const type = blob.type || 'audio/wav';
    return new File([blob], fileName, { type });
}
