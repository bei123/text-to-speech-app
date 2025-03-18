const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const speechRoutes = require('./routes/speechRoutes');
const userRoutes = require('./routes/userRoutes');
const redisClient = require('./services/redisService');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/api', authRoutes);
app.use('/api', speechRoutes);
app.use('/api', userRoutes);

app.get('/api/encryption-key', async (req, res) => {
    try {
        const encryptionKey = generateEncryptionKey();
        const username = req.query.username;

        await redisClient.set(`encryptionKey:${username}`, encryptionKey, 'EX', 300);

        res.json({ key: encryptionKey });
    } catch (error) {
        console.error('生成加密密钥失败:', error);
        res.status(500).json({ message: '生成加密密钥失败' });
    }
});

module.exports = app;