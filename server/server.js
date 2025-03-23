const app = require('./app');
const http = require('http');

// 获取端口号
const port = process.env.PORT || 3000;
app.set('port', port);

// 创建 HTTP 服务器
const server = http.createServer(app);

// 启动服务器
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// 错误处理函数
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // 处理特定的监听错误
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' 需要提升权限');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' 已被占用');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

// 监听开始处理函数
function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('服务器监听中: ' + bind);
    console.log(`服务器地址: http://localhost:${port}`);
} 