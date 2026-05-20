// constants.js

/** 春节主题开关：设为 false 即可恢复平日样式 */
export const SPRING_FESTIVAL_THEME = false;
/** 生肖年文案（如：马年、龙年），用于春节主题展示 */
export const SPRING_FESTIVAL_ZODIAC = '马年';

export const API_BASE_URL = 'https://backend.2000gallery.art';

/** 相对路径，配合 @/utils/axios 的 baseURL 使用 */
export const API_PATHS = {
    LOGIN: '/login',
    REGISTER: '/register',
    REFRESH_TOKEN: '/refresh-token',
    ENCRYPTION_KEY: '/encryption-key',
    GENERATE_SPEECH: '/generate-speech',
    GENERATE_SPEECH_WITH_REFERENCE: '/v2proplus',
    HISTORY: '/history',
    HISTORY_AUDIO_DOWNLOAD: '/history/audio/download',
    MODELS: '/models',
    CALL_DEEPSEEK: '/call-deepseek',
    MODEL_PROMPT: '/models/model-prompt',
    PRESET_SAVE: '/presets/save',
    PRESET_LIST: '/presets/list',
    PRESET_PUBLIC: '/presets/public',
    PRESET_USE: '/presets',
    PRESET_SHARE: '/presets',
    PRESET_DELETE: '/presets',
    QQMUSIC_QR_IDENTIFIER: '/qqmusic/qrcode/identifier',
    QQMUSIC_CREDENTIALS: '/qqmusic/credentials',
};

export const API_URLS = {
    API_BASE_URL,
    LOGIN: `${API_BASE_URL}${API_PATHS.LOGIN}`,
    REGISTER: `${API_BASE_URL}${API_PATHS.REGISTER}`,
    REFRESH_TOKEN: `${API_BASE_URL}${API_PATHS.REFRESH_TOKEN}`,
    ENCRYPTION_KEY: `${API_BASE_URL}${API_PATHS.ENCRYPTION_KEY}`,
    GENERATE_SPEECH: `${API_BASE_URL}${API_PATHS.GENERATE_SPEECH}`,
    GENERATE_SPEECH_WITH_REFERENCE: `${API_BASE_URL}${API_PATHS.GENERATE_SPEECH_WITH_REFERENCE}`,
    HISTORY: `${API_BASE_URL}${API_PATHS.HISTORY}`,
    HISTORY_AUDIO_DOWNLOAD: `${API_BASE_URL}${API_PATHS.HISTORY_AUDIO_DOWNLOAD}`,
    MODELS: `${API_BASE_URL}${API_PATHS.MODELS}`,
    CALL_DEEPSEEK: `${API_BASE_URL}${API_PATHS.CALL_DEEPSEEK}`,
    MODEL_PROMPT: `${API_BASE_URL}${API_PATHS.MODEL_PROMPT}`,
    PRESET_SAVE: `${API_BASE_URL}${API_PATHS.PRESET_SAVE}`,
    PRESET_LIST: `${API_BASE_URL}${API_PATHS.PRESET_LIST}`,
    PRESET_PUBLIC: `${API_BASE_URL}${API_PATHS.PRESET_PUBLIC}`,
    PRESET_USE: `${API_BASE_URL}${API_PATHS.PRESET_USE}`,
    PRESET_SHARE: `${API_BASE_URL}${API_PATHS.PRESET_SHARE}`,
    PRESET_DELETE: `${API_BASE_URL}${API_PATHS.PRESET_DELETE}`,
};

export const LOCAL_STORAGE_KEYS = {
    TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
};

export const HTTP_STATUS_UNAUTHORIZED = 401;

export default {
    API_URLS,
    API_PATHS,
};
