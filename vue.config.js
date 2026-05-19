const { defineConfig } = require('@vue/cli-service');

const isProd = process.env.NODE_ENV === 'production';
const enableObfuscate = process.env.OBFUSCATE === 'true';

function getObfuscateDomains() {
  const raw = process.env.VUE_APP_OBFUSCATE_DOMAINS || 'tts.2000gallery.art';
  return raw.split(',').map((d) => d.trim()).filter(Boolean);
}

module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  configureWebpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      constants: require.resolve('constants-browserify'),
    };

    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 250000,
        cacheGroups: {
          vendors: {
            name: 'chunk-vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            chunks: 'initial',
          },
          common: {
            name: 'chunk-common',
            minChunks: 2,
            priority: -20,
            chunks: 'initial',
            reuseExistingChunk: true,
          },
        },
      },
    };

    if (isProd && enableObfuscate) {
      const JavaScriptObfuscator = require('webpack-obfuscator');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new JavaScriptObfuscator(
          {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.5,
            deadCodeInjection: false,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            rotateStringArray: true,
            selfDefending: false,
            debugProtection: false,
            domainLock: getObfuscateDomains(),
            domainLockRedirectUrl: 'about:blank',
          },
          ['**/chunk-vendors*.js', '**/node_modules/**']
        )
      );
    }
  },
  chainWebpack: (config) => {
    if (isProd) {
      config.optimization.minimizer('terser').tap((args) => {
        const opts = args[0].terserOptions || {};
        opts.compress = { ...(opts.compress || {}), drop_console: true };
        opts.mangle = { ...(opts.mangle || {}), safari10: true };
        opts.format = { ...(opts.format || {}), comments: false };
        args[0].terserOptions = opts;
        return args;
      });
    }

    config.module
      .rule('images')
      .use('url-loader')
      .loader('url-loader')
      .tap((options) => {
        options = options || {};
        options.limit = 4096;
        return options;
      });

    config.module
      .rule('webp')
      .test(/\.webp$/)
      .use('url-loader')
      .loader('url-loader')
      .options({
        limit: 4096,
        quality: 85,
        name: 'img/[name].[hash:8].[ext]',
      });
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '',
        },
      },
    },
  },
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Ai语音生命',
      chunks: ['chunk-vendors', 'chunk-common', 'index'],
      dns_prefetch: [
        'https://backend.2000gallery.art',
        'https://2000gallery.art',
      ],
    },
  },
});
