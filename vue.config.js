const { defineConfig } = require('@vue/cli-service');

const isProd = process.env.NODE_ENV === 'production';
const enableObfuscate = process.env.OBFUSCATE === 'true';

/**
 * rrweb（ARMS 录屏依赖）经 Webpack 打包后常见问题：
 * 1. 残留的 core-js 副作用 import 无法解析；
 * 2. 末尾仍为 module.exports=xxx，浏览器无 module 全局变量。
 */
class FixRrwebBundlePlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('FixRrwebBundlePlugin', (compilation) => {
      const { webpack: wp } = compiler;
      compilation.hooks.afterProcessAssets.tap('FixRrwebBundlePlugin', () => {
        const coreJsSideEffect =
          /,?n\("core-js\/modules\/[^"]+"\)|,?require\("core-js\/modules\/[^"]+"\)/g;
        Object.keys(compilation.assets).forEach((filename) => {
          if (!filename.endsWith('.js')) {
            return;
          }
          const asset = compilation.getAsset(filename);
          if (!asset) {
            return;
          }
          const source = asset.source.source().toString();
          const isRrwebChunk =
            source.includes('__rrweb_original__') || source.includes('module.exports=');
          if (!isRrwebChunk && !source.includes('core-js/modules')) {
            return;
          }
          let fixed = source.replace(coreJsSideEffect, '');
          // 92103:function(e,t,n){ ... } 中 e 为 webpack module，t 为 exports
          fixed = fixed.replace(/module\.exports=/g, 'e.exports=');
          if (fixed === source) {
            return;
          }
          compilation.updateAsset(
            filename,
            new wp.sources.RawSource(fixed),
            { minimized: asset.info.minimized }
          );
        });
      });
    });
  }
}

function getObfuscateDomains() {
  const raw = process.env.VUE_APP_OBFUSCATE_DOMAINS || 'tts.2000gallery.art';
  return raw.split(',').map((d) => d.trim()).filter(Boolean);
}

module.exports = defineConfig({
  transpileDependencies: [
    '@arms/rum-browser',
    '@arms/rum-core',
    'rrweb',
  ],
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

    if (isProd) {
      config.plugins = config.plugins || [];
      config.plugins.push(new FixRrwebBundlePlugin());
    }

    if (isProd && enableObfuscate) {
      const JavaScriptObfuscator = require('webpack-obfuscator');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new JavaScriptObfuscator(
          {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            rotateStringArray: true,
            renameGlobals: false,
            selfDefending: false,
            debugProtection: false,
            domainLock: getObfuscateDomains(),
            domainLockRedirectUrl: 'about:blank',
            reservedNames: [
              '^require$',
              '__webpack_require__',
              '__webpack_exports__',
              '__webpack_module_cache__',
            ],
          },
          [
            '**/chunk-vendors*.js',
            '**/index.*.js',
            '**/chunk-common*.js',
          ]
        )
      );
    }
  },
  chainWebpack: (config) => {
    config.module
      .rule('rrweb-lib')
      .test(/node_modules[\\/]rrweb[\\/]lib[\\/]/)
      .type('javascript/auto');

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
