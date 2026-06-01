// ربط الشات بالسيرفر الفوري عبر مكتبة Socket.io
const socket = io(); 

// المتغيرات الأساسية للمشترك
let isSubscribed = false; 
let currentRoom = 'public';
let myProfile = { name: '', gender: '', age: '', location: '', avatar: '' };

// استدعاء عناصر واجهة الشات والرسائل
const messagesContainer = document.getElementById('chat-messages');
const messageInput = document.getElementById('msg-input');
const paywall = document.getElementById('paywall');
const statusBadge = document.getElementById('user-status-badge');
const tabPublic = document.getElementById('tab-public');
const tabPrivate = document.getElementById('tab-private');
const activeUsersList = document.getElementById('active-users-list');

// استدعاء عناصر شاشة تسجيل الدخول الجديدة
const loginScreen = document.getElementById('login-screen');
const loginError = document.getElementById('login-error');
const regName = document.getElementById('reg-name');
const regAge = document.getElementById('reg-age');
const regLocation = document.getElementById('reg-location');
const userAvatarInput = document.getElementById('user-avatar');
const avatarPlaceholder = document.getElementById('avatar-placeholder');
const avatarImg = document.getElementById('avatar-img');

// دالة اختيار الجنس وتلوين الخانات بشكل مرئي جذاب
function selectGender(gender) {
    myProfile.gender = gender;
    const maleBtn = document.getElementById('gender-male');
    const femaleBtn = document.getElementById('gender-female');
    
    if (gender === 'ذكر') {
        maleBtn.classList.add('selected-male');
        femaleBtn.classList.remove('selected-female');
    } else {
        femaleBtn.classList.add('selected-female');
        maleBtn.classList.remove('selected-male');
    }
}

// التقاط صورة العرض وتحويلها لقراءة محلية فورية (Base64)
userAvatarInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            myProfile.avatar = event.target.result;
            avatarPlaceholder.style.display = 'none';
            avatarImg.src = event.target.result;
            avatarImg.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// دالة إرسال بيانات التسجيل وفحص الاسم المكرر بالسيرفر
function submitLogin() {
    const name = regName.value.trim();
    const age = regAge.value.trim();
    const location = regLocation.value;

    if (name === "" || age === "" || !myProfile.gender) {
        alert("يرجى ملء جميع البيانات الأساسية واختيار الجنس قبل الدخول!");
        return;
    }

    myProfile.name = name;
    myProfile.age = age;
    myProfile.location = location;

    // إرسال طلب الدخول والهوية الكاملة للسيرفر لفحص تكرار الاسم
    socket.emit('joinChat', myProfile);
}

// استقبال رد السيرفر بعد فحص الاسم
socket.on('loginResponse', (response) => {
    if (response.success) {
        loginScreen.style.display = 'none';
        loginError.style.display = 'none';
    } else {
        loginError.textContent = response.message;
        loginError.style.display = 'block';
        loginScreen.scrollTop = 0;
    }
});

// دالة إرسال الرسالة إلى السيرفر المحدثة
function handleSend() {
    const text = messageInput.value.trim();
    if (text !== "") {
        socket.emit('sendMessage', {
            text: text,
            sender: myProfile.name,
            premium: isSubscribed
        });
        messageInput.value = "";
    }
}

// استقبال الرسالة القادمة من السيرفر وعرضها فوراً في الشاشة
socket.on('receiveMessage', (data) => {
    const newMsg = document.createElement('div');
    
    // فحص إذا كانت الرسالة مرسلة مني أو من شخص آخر لتنسيق الاتجاه
    if (data.sender === myProfile.name) {
        newMsg.className = 'msg msg-me';
        newMsg.innerHTML = `<span>${data.text}</span><span class="msg-time">الآن</span>`;
    } else {
        newMsg.className = 'msg msg-other';
        const senderTag = data.premium ? `${data.sender} (مشترك ✨)` : data.sender;
        newMsg.innerHTML = `<span class="msg-sender">${senderTag}</span><span>${data.text}</span><span class="msg-time">الآن</span>`;
    }
    
    messagesContainer.appendChild(newMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

// استقبال قائمة المتواجدين الحية وتحديث كروت الأعضاء ديناميكياً مع العداد السفلي
socket.on('updateUsersList', (users) => {
    // 1. تحديث عداد المتواجدين في الزر السفلي تلقائياً
    const usersCountSpan = document.getElementById('users-count');
    if (usersCountSpan) {
        usersCountSpan.textContent = users.length;
    }

    // 2. تحديث قائمة الأعضاء داخل الحاوية الجديدة في السايدبار
    const activeUsersList = document.getElementById('active-users-list');
    if (!activeUsersList) return;
    
    activeUsersList.innerHTML = ''; // تنظيف القائمة القديمة
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = user.premium ? 'user-card premium' : 'user-card';
        
        // إعداد صورة الملف الشخصي أو الصورة الافتراضية
        const avatarSrc = user.avatar ? user.avatar : 'https://flaticon.com';
        
               userCard.innerHTML = `
            <div class="user-header" style="cursor: pointer;" onclick="showUserProfile('${user.name}', '${avatarSrc}', '${user.location}')">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${avatarSrc}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                    <span class="user-name ${user.premium ? 'premium-text' : ''}">${user.name}</span>
                </div>
                <span class="badge ${user.premium ? 'premium-badge' : ''}">${user.premium ? '👑 متميز' : 'عضو'}</span>
            </div>
            <div class="user-info">
                <span>${user.gender === 'ذكر' ? '👨 ذكر' : '👩 أنثى'}</span> • 
                <span>🎂 ${user.age} سنة</span> • 
                <span>📍 ${user.location}</span>
            </div>
            <button class="private-btn" onclick="showUserProfile('${user.name}', '${avatarSrc}', '${user.location}')">👁️ عرض الملف الشخصي</button>
        `;

        activeUsersList.appendChild(userCard);
    });
});

function switchRoom(room) {
    if (room === 'private' && !isSubscribed) {
        paywall.style.display = 'flex';
        return;
    }
    currentRoom = room;
    if (room === 'public') {
        tabPublic.classList.add('active');
        tabPrivate.classList.remove('active');
        messagesContainer.innerHTML = `
            <div class="msg msg-other">
                <span class="msg-sender">نظام شات موعد</span>
                <span>لقد انتقلت إلى الغرفة العامة الآن.</span>
            </div>`;
    } else {
        tabPrivate.classList.add('active');
        tabPublic.classList.remove('active');
        messagesContainer.innerHTML = `
            <div class="msg msg-other" style="background-color: #fffbeb; border: 1px solid #fef3c7;">
                <span class="msg-sender" style="color: #b45309;">✨ الغرفة الخاصة الرومانسية ✨</span>
                <span>مرحباً بك في الغرفة السرية الفاخرة المخصصة للأعضاء المشتركين فقط. استمتع بخصوصيتك كاملة.</span>
            </div>`;
    }
}

function openPrivateChat(name) {
    if (name === myProfile.name) {
        alert("لا يمكنك فتح محادثة خاصة مع نفسك!");
        return;
    }
    if (!isSubscribed) {
        // إظهار جدار الدفع إذا كان المستخدم غير مشترك
        document.getElementById('paywall').style.display = 'flex';
    } else {
        // تعيين الشخص المستهدف للمحادثة الثنائية
        currentPrivateTarget = name;
        
        // جلب عناصر النافذة المنبثقة وتحديث البيانات
        const popup = document.getElementById('private-chat-window');
        const popupTitle = document.getElementById('popup-target-name');
        const popupMessages = document.getElementById('popup-messages');
        
        popupTitle.textContent = name; // عرض اسم الشخص في أعلى النافذة
        popupMessages.innerHTML = ''; // تنظيف الشاشة استعداداً لعرض رسائل هذا الشخص فقط
        popup.style.display = 'flex'; // إظهار النافذة المنبثقة فوراً
        
        // إشعار نظام السيرفر لفتح أو جلب تاريخ المحادثة الثنائية السرية
        console.log(`جاري بدء محادثة ثنائية مشفرة وسرية مع: ${name}`);
    }
}

function simulatePayment() {
    isSubscribed = true;
    paywall.style.display = 'none';
    statusBadge.style.backgroundColor = '#10b981';
    statusBadge.textContent = '✨ مشترك متميز (نشط)';
    tabPrivate.classList.remove('private-locked');
    alert('🎉 تهانينا! تم تفعيل اشتراكك التجريبي بنجاح. يمكنك الآن دخول الغرف والدردشات الخاصة فوراً!');
    
    // إخبار السيرفر فوراً بتحويل حالة هذا المشترك لمتميز لتحديث كارت العضوية عند الجميع
    socket.emit('upgradeToPremium');
    switchRoom('private');
}

function closePaywall() { paywall.style.display = 'none'; }

messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleSend();
});
// متغيرات لتتبع حالة المحادثة الخاصة المنبثقة حالياً
let currentPrivateTarget = null;

// دالة إغلاق النافذة المنبثقة للخاص
function closePrivatePopup() {
    const popup = document.getElementById('private-chat-window');
    popup.style.display = 'none';
    currentPrivateTarget = null;
}

// دالة التكبير والتصغير بمقدار الضعف
function toggleMaximizePopup() {
    const popup = document.getElementById('private-chat-window');
    const maxBtn = document.getElementById('popup-maximize-btn');
    
    // التبديل بين إضافة وحذف كلاس التكبير
    popup.classList.toggle('maximized');
    
    // تغيير شكل الأيقونة بناءً على الحالة
    if (popup.classList.contains('maximized')) {
        maxBtn.textContent = '🔽'; // أيقونة لتبين أنه سيصغر عند الضغط
    } else {
        maxBtn.textContent = '🔲'; // أيقونة لتبين أنه سيكبر عند الضغط
    }
}

// دالة تشغيل واختيار الصور عند الضغط على دبوس النافذة المنبثقة
function triggerPopupFile() {
    document.getElementById('popup-file-input').click();
}

// معالجة اختصار زر الـ Enter لإرسال الرسائل داخل الخاص
function handlePopupKey(e) {
    if (e.key === 'Enter') {
        sendPopupMessage();
    }
}
// دالة إرسال الرسائل النصية من النافذة المنبثقة الخاصة
function sendPopupMessage() {
    const popupInput = document.getElementById('popup-msg-input');
    if (!popupInput) return;
    
    const text = popupInput.value.trim();
    
    // التأكد من وجود نص واختيار شخص مستهدف للمحادثة
    if (text !== "" && currentPrivateTarget) {
        // إرسال الرسالة عبر حدث خاص للمحادثات الثنائية
        socket.emit('sendPrivateMessage', {
            text: text,
            sender: myProfile.name,
            target: currentPrivateTarget
        });
        
        // عرض الرسالة فوراً في صندوق الخاص بي (كمرسل)
        const popupMessages = document.getElementById('popup-messages');
        if (popupMessages) {
            const myMsg = document.createElement('div');
            myMsg.className = 'msg msg-me';
            myMsg.innerHTML = `<span>${text}</span><span class="msg-time">الآن</span>`;
            popupMessages.appendChild(myMsg);
            popupMessages.scrollTop = popupMessages.scrollHeight;
        }
        
        // تفريغ حقل الإدخال
        popupInput.value = "";
    }
}
        
        // عرض الرسالة فوراً في صندوق الخاص بي (كمرسل)
        const popupMessages = document.getElementById('popup-messages');
        const myMsg = document.createElement('div');
        myMsg.className = 'msg msg-me';
        myMsg.innerHTML = `<span>${text}</span><span class="msg-time">الآن</span>`;
        popupMessages.appendChild(myMsg);
        
        // تفريغ حقل الإدخال والتمرير لأسفل
        popupInput.value = "";
        popupMessages.scrollTop = popupMessages.scrollHeight;
    }
}

// استقبال الرسائل الخاصة الثنائية من السيرفر وعرضها في النافذة المنبثقة
socket.on('receivePrivateMessage', (data) => {
    // التأكد من أن النافذة مفتوحة حالياً مع نفس الشخص المرسل
    // أو فتح النافذة تلقائياً إذا كانت مغلقة لكي لا تفوتك الرسالة
    if (!currentPrivateTarget || currentPrivateTarget !== data.sender) {
        currentPrivateTarget = data.sender;
        const popup = document.getElementById('private-chat-window');
        const popupTitle = document.getElementById('popup-target-name');
        popupTitle.textContent = data.sender;
        document.getElementById('popup-messages').innerHTML = ''; // تنظيف الشاشة للمحادثة الجديدة
        popup.style.display = 'flex';
    }
    
    // عرض رسالة الطرف الآخر داخل صندوق الرسائل المنبثق
    const popupMessages = document.getElementById('popup-messages');
    const otherMsg = document.createElement('div');
    otherMsg.className = 'msg msg-other';
    otherMsg.innerHTML = `<span class="msg-sender">${data.sender} (خاص 🔒)</span><span>${data.text}</span><span class="msg-time">الآن</span>`;
    
    popupMessages.appendChild(otherMsg);
    popupMessages.scrollTop = popupMessages.scrollHeight; // التمرير التلقائي لأسفل
});

// دالة معالجة الصورة المحددة من الدبوس المنبثق وتحويلها وقراءتها فوراً
function handlePopupImage(event) {
    const file = event.target.files[0];
    if (file && currentPrivateTarget) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result; // ملف الصورة بصيغة Base64
            
            // 1. إرسال الصورة عبر حدث مخصص للمحادثة الثنائية الخاصة
            socket.emit('sendPrivateImage', {
                image: imageData,
                sender: myProfile.name,
                target: currentPrivateTarget
            });
            
            // 2. عرض الصورة فوراً في شاشتي المنبثقة أنا (كمرسل)
            const popupMessages = document.getElementById('popup-messages');
            const myImgMsg = document.createElement('div');
            myImgMsg.className = 'msg msg-me';
            myImgMsg.innerHTML = `
                <img src="${imageData}" class="popup-shared-img" alt="صورة مرفقة">
                <span class="msg-time">الآن</span>
            `;
            popupMessages.appendChild(myImgMsg);
            popupMessages.scrollTop = popupMessages.scrollHeight; // تمرير لأسفل
        };
        reader.readAsDataURL(file);
        
        // تفريغ الحقل لضمان إمكانية رفع نفس الصورة مجدداً إن لزم الأمر
        document.getElementById('popup-file-input').value = '';
    }
}

// استقبال الصور الخاصة القادمة من الطرف الآخر وعرضها في الشاشة المنبثقة
socket.on('receivePrivateImage', (data) => {
    // فتح النافذة تلقائياً باسم المرسل إذا كانت مغلقة أو مع شخص آخر
    if (!currentPrivateTarget || currentPrivateTarget !== data.sender) {
        currentPrivateTarget = data.sender;
        const popup = document.getElementById('private-chat-window');
        const popupTitle = document.getElementById('popup-target-name');
        popupTitle.textContent = data.sender;
        document.getElementById('popup-messages').innerHTML = ''; 
        popup.style.display = 'flex';
    }
    
    // عرض الصورة داخل صندوق الخاص المستلم
    const popupMessages = document.getElementById('popup-messages');
    const otherImgMsg = document.createElement('div');
    otherImgMsg.className = 'msg msg-other';
    otherImgMsg.innerHTML = `
        <span class="msg-sender">${data.sender} (صورة خاصة 🔒)</span>
        <img src="${data.image}" class="popup-shared-img" alt="صورة مستلمة">
        <span class="msg-time">الآن</span>
    `;
    
    popupMessages.appendChild(otherImgMsg);
    popupMessages.scrollTop = popupMessages.scrollHeight; // تمرير تلقائي لأسفل
});

// دالة التبديل بين اللوحات الجانبية ديناميكياً بناءً على اختيار الشريط السفلي
function switchSidebar(panelName) {
    const sidebar = document.getElementById('dynamic-sidebar');
    
    // جلب جميع اللوحات الجانبية المتاحة لتهيئة حالتها
    const panels = ['panel-users', 'panel-private', 'panel-rooms', 'panel-settings'];
    
    // إخفاء كافة اللوحات أولاً لمنع التداخل
    panels.forEach(id => {
        const p = document.getElementById(id);
        if (p) p.style.display = 'none';
    });
    
    // إظهار اللوحة المطلوبة المحددة فقط
    const targetPanel = document.getElementById(`panel-${panelName}`);
    if (targetPanel) {
        targetPanel.style.display = 'flex';
    }
    
    // إظهار السايدبار الرئيسي بالكامل في حال كان مخفياً
    if (sidebar) {
        sidebar.style.display = 'block';
    }
}

// دالة إغلاق السايدبار الجانبي بالكامل عند الضغط على علامة (✖)
function closeSidebar() {
    const sidebar = document.getElementById('dynamic-sidebar');
    if (sidebar) {
        sidebar.style.display = 'none';
    }
}
let selectedModalUser = null;

// دالة تفتح الكارت الشخصي المنبثق وتملأ بيانات العضو بالكامل
function showUserProfile(name, avatar, location) {
    selectedModalUser = name;
    
    document.getElementById('modal-user-name').textContent = name;
    document.getElementById('modal-user-avatar').src = avatar ? avatar : 'https://flaticon.com';
    document.getElementById('modal-user-location').textContent = location;
    
    // إظهار النافذة
    document.getElementById('user-profile-modal').style.display = 'flex';
}

// دالة إغلاق الكارت الشخصي
function closeProfileModal() {
    document.getElementById('user-profile-modal').style.display = 'none';
    selectedModalUser = null;
}

// زر بدء المحادثة الخاصة من داخل الكارت الشخصي
function startPrivateFromModal() {
    if (selectedModalUser) {
        closeProfileModal();
        openPrivateChat(selectedModalUser); // استدعاء دالة الخاص التي طورناها
    }
}
