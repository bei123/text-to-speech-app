import app from './src/app.js';
import './src/jobs/speechQueueProcessor.js'; // 初始化队列处理器

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});