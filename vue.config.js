const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      fallback: {
        constants: require.resolve('constants-browserify'),
      }
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 250000,
        cacheGroups: {
          vendors: {
            name: 'chunk-vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            chunks: 'initial'
          },
          common: {
            name: 'chunk-common',
            minChunks: 2,
            priority: -20,
            chunks: 'initial',
            reuseExistingChunk: true
          }
        }
      }
    }
  },
  chainWebpack: config => {
    // 图片加载优化
    config.module
      .rule('images')
      .use('url-loader')
      .loader('url-loader')
      .tap(options => {
        // 小于 4kb 的图片会被转为 base64
        options = options || {};
        options.limit = 4096;
        return options;
      });

    // 添加 webp 支持
    config.module
      .rule('webp')
      .test(/\.webp$/)
      .use('url-loader')
      .loader('url-loader')
      .options({
        limit: 4096,
        quality: 85,
        name: 'img/[name].[hash:8].[ext]'
      });
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  },
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Ai语音生命',
      chunks: ['chunk-vendors', 'chunk-common', 'index'],
      // 添加 DNS 预获取
      dns_prefetch: [
        'https://backend.2000gallery.art:5000',
        'https://2000gallery.art'
      ]
    }
  }
});