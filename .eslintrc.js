module.exports = {
    parser: 'vue-eslint-parser',
    parserOptions: {
      parser: '@babel/eslint-parser', // 使用 @babel/eslint-parser 替代 babel-eslint
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    plugins: ['vue'],
    extends: [
      'plugin:vue/vue3-recommended', // 使用 Vue 3 推荐的 ESLint 规则
      'eslint:recommended', // 使用 ESLint 推荐的规则
    ],
    rules: {
      // 其他规则
    },
  };