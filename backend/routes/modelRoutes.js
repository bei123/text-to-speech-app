const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');

// 获取模型数据
router.get('/', modelController.getModels);

// 获取模型提示词
router.post('/model-prompt', modelController.getModelPrompt);

module.exports = router; 