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
        // إذا كان الاسم متاحاً، نخفي شاشة الدخول ونعرض الشات الحي
        loginScreen.style.display = 'none';
        loginError.style.display = 'none';
    } else {
        // إذا كان الاسم مكرراً، نظهر التنبيه الأحمر للمستخدم
        loginError.textContent = response.message;
        loginError.style.display = 'block';
        loginScreen.scrollTop = 0; // لرفع الشاشة للأعلى لرؤية التنبيه
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

// استقبال قائمة المتواجدين الحية وتحديث كروت الأعضاء ديناميكياً
socket.on('updateUsersList', (users) => {
    activeUsersList.innerHTML = ''; // تنظيف القائمة القديمة
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = user.premium ? 'user-card premium' : 'user-card';
        
        // إعداد صورة الملف الشخصي أو الصورة الافتراضية
        const avatarSrc = user.avatar ? user.avatar : 'https://flaticon.com';
        
        userCard.innerHTML = `
            <div class="user-header">
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
            <button class="private-btn" onclick="openPrivateChat('${user.name}')">🔒 محادثة خاصة</button>
         sensory`;
        
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
        paywall.style.display = 'flex';
    } else {
        alert(`جاري فتح محادثة خاصة وسرية مشفرة مع: ${name}`);
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
