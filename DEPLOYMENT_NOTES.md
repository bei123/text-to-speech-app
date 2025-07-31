# 模型系列排序功能部署说明

## 概述
本次更新为模型选择功能添加了按系列排序的功能，模型将按照系列分组显示，提供更好的用户体验。

## 更改内容

### 1. 后端更改
- **文件**: `backend/controllers/modelController.js`
- **更改**: 修改了 `getModels` 函数，添加了 `series` 字段到查询中，并按照 `series` 和 `label` 进行排序

### 2. 前端更改
- **文件**: `src/components/ModelModal.vue`
- **更改**: 
  - 添加了按系列分组的显示逻辑
  - 添加了系列标题样式
  - 模型现在按系列分组显示

### 3. 数据库更改
- **文件**: `update_models_table.sql`
- **更改**: 为 `models` 表添加了 `series` 字段

## 部署步骤

### 1. 更新数据库
```sql
-- 执行以下SQL命令来更新数据库结构
ALTER TABLE models ADD COLUMN series VARCHAR(100) DEFAULT '其他' AFTER label;

-- 更新现有模型数据
UPDATE models SET series = '标准系列' WHERE value IN ('model1', 'model2');
UPDATE models SET series = '英语系列' WHERE value IN ('model3', 'model4');
```

### 2. 重启后端服务
```bash
# 如果使用 PM2
pm2 restart text-to-speech-backend

# 或者直接重启
node server.js
```

### 3. 重新构建前端
```bash
# 重新构建前端应用
npm run build
```

## 功能说明

### 模型分组显示
- 模型现在按照系列分组显示
- 每个系列都有清晰的标题
- 没有系列信息的模型会显示在"其他"分组中

### 排序规则
1. 首先按系列名称字母顺序排序
2. 同一系列内按模型标签字母顺序排序

### 样式特点
- 系列标题使用绿色主题色
- 系列标题有左侧边框装饰
- 模型项目有适当的缩进

## 注意事项
- 确保数据库中的模型数据包含 `series` 字段
- 如果模型没有 `series` 字段，将显示在"其他"分组中
- 建议为所有模型设置合适的系列名称

## 测试建议
1. 检查模型选择模态框是否正确显示分组
2. 验证模型选择功能是否正常工作
3. 确认历史记录页面的模型筛选功能不受影响 