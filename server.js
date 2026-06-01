const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// مصفوفة ذكية لتخزين بيانات المستخدمين النشطين في الشات حالياً
let activeUsers = {};

// تقديم الملفات الثابتة من مجلد الواجهة
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log(`مستخدم متصل حالياً برقم معرف: ${socket.id}`);

    // 🚪 استقبال طلب التسجيل وفحص تكرار الاسم المستعار
    socket.on('joinChat', (userData) => {
        const nameExists = Object.values(activeUsers).some(user => user.name.toLowerCase() === userData.name.toLowerCase());

        if (nameExists) {
            socket.emit('loginResponse', { success: false, message: "❌ هذا الاسم مستخدم حالياً في الغرفة، يرجى اختيار اسم مستعار آخر!" });
        } else {
            activeUsers[socket.id] = {
                id: socket.id,
                name: userData.name,
                gender: userData.gender,
                age: userData.age,
                location: userData.location,
                avatar: userData.avatar,
                premium: false
            };

            socket.emit('loginResponse', { success: true });
            io.emit('updateUsersList', Object.values(activeUsers));
            console.log(`✅ انضم ${userData.name} إلى الشات بنجاح.`);
        }
    });

    // 💬 استقبال الرسائل وبثها لجميع المتواجدين في الغرفة العامة
    socket.on('sendMessage', (messageData) => {
        io.emit('receiveMessage', {
            text: messageData.text,
            sender: messageData.sender,
            premium: messageData.premium
        });
    });

    // 🔒 استقبال الرسائل النصية الخاصة الثنائية وتوجيهها للشخص المستهدف فقط
    socket.on('sendPrivateMessage', (data) => {
        const targetSocket = Object.values(activeUsers).find(user => user.name === data.target);
        if (targetSocket) {
            io.to(targetSocket.id).emit('receivePrivateMessage', {
                text: data.text,
                sender: data.sender
            });
        }
    });

    // 📎 استقبال الصور الخاصة الثنائية وتوجيهها للشخص المستهدف فقط
    socket.on('sendPrivateImage', (data) => {
        const targetSocket = Object.values(activeUsers).find(user => user.name === data.target);
        if (targetSocket) {
            io.to(targetSocket.id).emit('receivePrivateImage', {
                image: data.image,
                sender: data.sender
            });
        }
    });

    // ✨ ترقية العضو لحساب متميز فور محاكاة الدفع بنجاح
    socket.on('upgradeToPremium', () => {
        if (activeUsers[socket.id]) {
            activeUsers[socket.id].premium = true;
            io.emit('updateUsersList', Object.values(activeUsers));
            console.log(`👑 تم ترقية حساب العضو: ${activeUsers[socket.id].name} إلى باقة متميزة.`);
        }
    });

    // 🚪 معالجة خروج أو قطع اتصال المستخدم من الشات
    socket.on('disconnect', () => {
        if (activeUsers[socket.id]) {
            console.log(`❌ غادر ${activeUsers[socket.id].name} الشات.`);
            delete activeUsers[socket.id];
            io.emit('updateUsersList', Object.values(activeUsers));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 السيرفر المطور يعمل بنجاح على منفذ: ${PORT}`);
});
