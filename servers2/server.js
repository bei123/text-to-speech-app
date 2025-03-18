const app = require('./app');
const PORT = 9005;

app.listen(PORT, () => {
    console.log(`服务器运行在 http://aittsssh.2000gallery.art:${PORT}`);
});