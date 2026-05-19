// constants.js

/** 春节主题开关：设为 false 即可恢复平日样式 */
export const SPRING_FESTIVAL_THEME = false;
/** 生肖年文案（如：马年、龙年），用于春节主题展示 */
export const SPRING_FESTIVAL_ZODIAC = '马年';

export const API_BASE_URL = 'https://backend.2000gallery.art';

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
    PRESET_SAVE: `${API_BASE_URL}/presets/save`,
    PRESET_LIST: `${API_BASE_URL}/presets/list`,
    PRESET_PUBLIC: `${API_BASE_URL}/presets/public`,
    PRESET_USE: `${API_BASE_URL}/presets`, // POST /presets/:id/use
    PRESET_SHARE: `${API_BASE_URL}/presets`, // PUT /presets/:id/share
    PRESET_DELETE: `${API_BASE_URL}/presets`,
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