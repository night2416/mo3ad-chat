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

// عند اتصال مستخدم جديد بالسيرفر عبر السحابة
io.on('connection', (socket) => {
    console.log(`مستخدم متصل حالياً برقم معرف: ${socket.id}`);

    // 🚪 استقبال طلب التسجيل وفحص تكرار الاسم المستعار
    socket.on('joinChat', (userData) => {
        const nameExists = Object.values(activeUsers).some(user => user.name.toLowerCase() === userData.name.toLowerCase());

        if (nameExists) {
            // إذا كان الاسم مستخدماً، نرسل رد بالرفض مع رسالة تنبيه
            socket.emit('loginResponse', { success: false, message: "❌ هذا الاسم مستخدم حالياً في الغرفة، يرجى اختيار اسم مستعار آخر!" });
        } else {
            // إذا كان الاسم متاحاً، نحفظ بياناته كاملة ونربطها برقم اتصاله
            activeUsers[socket.id] = {
                id: socket.id,
                name: userData.name,
                gender: userData.gender,
                age: userData.age,
                location: userData.location,
                avatar: userData.avatar, // استقبال الصورة الشخصية المرفوعة
                premium: false // افتراضياً الحساب مجاني عند الدخول لأول مرة
            };

            // إرسال رد بالنجاح لإخفاء شاشة تسجيل الدخول وعرض الشات
            socket.emit('loginResponse', { success: true });

            // بث قائمة المستخدمين المحدثة فوراً لجميع المتواجدين بالشات
            io.emit('updateUsersList', Object.values(activeUsers));
            
            console.log(`✅ انضم ${userData.name} إلى الشات بنجاح.`);
        }
    });

        // 💬 استقبال الرسائل وبثها لجميع المتواجدين في الغرفة المحددة
    socket.on('sendMessage', (messageData) => {
        // بث الرسالة مع بيانات المرسل وحالة اشتراكه
        io.emit('receiveMessage', {
            text: messageData.text,
            sender: messageData.sender,
            premium: messageData.premium
        });
    });

    // ✨ ترقية العضو لحساب متميز فور محاكاة الدفع بنجاح
    socket.on('upgradeToPremium', () => {
        if (activeUsers[socket.id]) {
            activeUsers[socket.id].premium = true;
            // بث القائمة المحدثة بالتاج أو الشارة الجديدة للجميع فوراً
            io.emit('updateUsersList', Object.values(activeUsers));
            console.log(`👑 تم ترقية حساب العضو: ${activeUsers[socket.id].name} إلى باقة متميزة.`);
        }
    });

        // 🔒 1. استقبال الرسائل النصية الخاصة الثنائية وتوجيهها للشخص المستهدف فقط
    socket.on('sendPrivateMessage', (data) => {
        // البحث عن معرف اتصال الشخص المستهدف (target) في قائمة المشتركين النشطين
        const targetSocket = Object.values(activeUsers).find(user => user.name === data.target);
        
        if (targetSocket) {
            // إرسال الرسالة حصراً للشخص المستهدف دون بقية أعضاء الشات
            io.to(targetSocket.id).emit('receivePrivateMessage', {
                text: data.text,
                sender: data.sender
            });
        }
    });

    // 📎 2. استقبال الصور الخاصة الثنائية وتوجيهها للشخص المستهدف فقط
    socket.on('sendPrivateImage', (data) => {
        // البحث عن معرف اتصال الشخص المستهدف (target) في قائمة المشتركين النشطين
        const targetSocket = Object.values(activeUsers).find(user => user.name === data.target);
        
        if (targetSocket) {
            // إرسال ملف الصورة حصراً للشخص المستهدف لضمان الخصوصية التامة
            io.to(targetSocket.id).emit('receivePrivateImage', {
                image: data.image,
                sender: data.sender
            });
        }
    });

    // 🚪 معالجة خروج أو قطع اتصال المستخدم من الشات
    socket.on('disconnect', () => {
        if (activeUsers[socket.id]) {
            console.log(`❌ غادر ${activeUsers[socket.id].name} الشات.`);
            // مسح المستخدم من مصفوفة المتواجدين النشطين
            delete activeUsers[socket.id];
            // تحديث القائمة عند بقية الأعضاء فوراً لمنع بقاء أسماء وهمية
            io.emit('updateUsersList', Object.values(activeUsers));
        }
    });
});

// إعداد منفذ الخادم الديناميكي لبيئة الإنتاج السحابية
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 السيرفر المطور يعمل بنجاح على منفذ: ${PORT}`);
});
