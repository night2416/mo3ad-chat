const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
    console.log('👤 مستخدم جديد اتصل بالشات الآن!');

    socket.on('sendMessage', (data) => {
        io.emit('receiveMessage', data);
    });

    socket.on('disconnect', () => {
        console.log('❌ مستخدم غادر الشات');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`تم تشغيل السيرفر بنجاح على منفذ: ${PORT}`);
});

