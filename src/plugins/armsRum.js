/* eslint-env node */
import armsRum from '@arms/rum-browser';

let initialized = false;

const VUETIFY_LOADING_SELECTORS = [
    '.v-skeleton-loader',
    '.v-overlay',
    '.v-progress-circular',
    '.v-progress-linear',
    '.v-progress',
];

function getWhiteScreenDelay() {
    const raw = process.env.VUE_APP_ARMS_WHITE_SCREEN_DELAY;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 4000;
}

function buildWhiteScreenConfig() {
    const delay = getWhiteScreenDelay();
    const sampleOptions = {
        sampleMethod: 2,
        checkPoints: 10,
        threshold: 0.85,
        whiteBoxElements: VUETIFY_LOADING_SELECTORS,
    };

    return {
        detectionRules: [
            {
                target: '#app',
                test_when: ['ERROR'],
                delay: 0,
                tester: 'SAMPLE',
                configOptions: sampleOptions,
            },
            {
                target: '#app',
                test_when: ['LOAD', 'ROUTE_CHANGE'],
                delay,
                tester: 'SAMPLE',
                ignoreUrlList: ['#/login'],
                configOptions: sampleOptions,
            },
        ],
    };
}

function sanitizeApiOptions(options) {
    if (!options?.headers) {
        return options;
    }
    const headers = { ...options.headers };
    delete headers.Authorization;
    delete headers.authorization;
    delete headers['X-Client-Sign'];
    delete headers['x-client-sign'];
    delete headers['X-Client-Timestamp'];
    delete headers['x-client-timestamp'];
    return { ...options, headers };
}

/**
 * 阿里云 ARMS 用户体验监控（RUM）— 仅运行在用户浏览器中，与 Node 后端无关。
 * @see https://help.aliyun.com/zh/arms/user-experience-monitoring/access-web-h5-applications
 * @see https://help.aliyun.com/zh/arms/user-experience-monitoring/web-h5-sdk-configuration-reference
 */
export function initArmsRum() {
    const endpoint = process.env.VUE_APP_ARMS_RUM_ENDPOINT;
    if (!endpoint || initialized) {
        return null;
    }

    const env = process.env.VUE_APP_ARMS_RUM_ENV
        || (process.env.NODE_ENV === 'production' ? 'prod' : 'local');

    armsRum.init({
        endpoint,
        env,
        version: process.env.VUE_APP_VERSION || '0.1.0',
        spaMode: 'hash',
        parseViewName: (url) => {
            try {
                const hash = new URL(url).hash || '#/';
                const path = hash.replace(/^#\/?/, '/').split('?')[0];
                return path || '/';
            } catch {
                return url;
            }
        },
        filters: {
            resource: [
                '/encryption-key',
                (url) => url.includes('/encryption-key'),
            ],
            exception: [
                /^Script error\.?$/i,
            ],
        },
        whiteScreen: buildWhiteScreenConfig(),
        evaluateApi: (options) => sanitizeApiOptions(options),
    });

    initialized = true;
    return armsRum;
}

/** 关联业务用户（勿覆盖 SDK 自动生成的 user.id，使用 name/tags） */
export function syncArmsRumUser(user) {
    if (!initialized) {
        return;
    }

    if (!user) {
        armsRum.setConfig('user', { name: '', tags: '' });
        return;
    }

    const name = user.username || user.name || user.email || '';
    const tags = user.id != null ? `uid:${user.id}` : '';

    armsRum.setConfig('user', { name, tags });
}

export { armsRum };
