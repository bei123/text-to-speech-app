// constants.js
export const API_BASE_URL = 'https://backend.2000gallery.art:5000';

export const API_URLS = {
    API_BASE_URL,
    LOGIN: `${API_BASE_URL}/login`,
    REGISTER: `${API_BASE_URL}/register`,
    REFRESH_TOKEN: `${API_BASE_URL}/refresh-token`,
    ENCRYPTION_KEY: `${API_BASE_URL}/encryption-key`,
    GENERATE_SPEECH: `${API_BASE_URL}/generate-speech`,
    GENERATE_SPEECH_WITH_REFERENCE: `${API_BASE_URL}/v2proplus`,
    HISTORY: `${API_BASE_URL}/history`,
    MODELS: `${API_BASE_URL}/models`,
    CALL_DEEPSEEK: `${API_BASE_URL}/call-deepseek`,
    MODEL_PROMPT: `${API_BASE_URL}/models/model-prompt`,
};

export const LOCAL_STORAGE_KEYS = {
    TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
};

export const HTTP_STATUS_UNAUTHORIZED = 401;

export default {
    API_URLS
};