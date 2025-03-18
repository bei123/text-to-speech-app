const express = require('express');
const speechController = require('../controllers/speechController');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/generate-speech', authenticateToken, speechController.generateSpeech);
router.get('/download/:fileName', speechController.downloadAudio);
router.get('/history', authenticateToken, speechController.getHistory);

module.exports = router;