// ربط الشات بالسيرفر الفوري عبر مكتبة Socket.io
const socket = io(); 

// المتغيرات الأساسية للمشترك
let isSubscribed = false; 
let currentRoom = 'public';
let myProfile = { name: '', gender: '', age: '', location: '', avatar: '' };
let currentPrivateTarget = null;
let selectedModalUser = null;

// استدعاء عناصر واجهة الشات والرسائل العامة
const messagesContainer = document.getElementById('chat-messages');
const messageInput = document.getElementById('msg-input');
const loginScreen = document.getElementById('login-screen');
const loginError = document.getElementById('login-error');

// استدعاء عناصر شاشة تسجيل الدخول
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
        if (maleBtn) maleBtn.classList.add('selected-male');
        if (femaleBtn) femaleBtn.classList.remove('selected-female');
    } else {
        if (femaleBtn) femaleBtn.classList.add('selected-female');
        if (maleBtn) maleBtn.classList.remove('selected-male');
    }
}

// التقاط صورة العرض وتحويلها لقراءة محلية فورية (Base64)
if (userAvatarInput) {
    userAvatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                myProfile.avatar = event.target.result;
                if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
                if (avatarImg) {
                    avatarImg.src = event.target.result;
                    avatarImg.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// دالة إرسال بيانات التسجيل وفحص الاسم المكرر بالسيرفر
function submitLogin() {
    const name = regName ? regName.value.trim() : "";
    const age = regAge ? regAge.value.trim() : "";
    const location = regLocation ? regLocation.value : "";

    if (name === "" || age === "" || !myProfile.gender) {
        alert("يرجى ملء جميع البيانات الأساسية واختيار الجنس قبل الدخول!");
        return;
    }

    myProfile.name = name;
    myProfile.age = age;
    myProfile.location = location;

    socket.emit('joinChat', myProfile);
}

// استقبال رد السيرفر بعد فحص الاسم
socket.on('loginResponse', (response) => {
    if (response.success) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (loginError) loginError.style.display = 'none';
    } else {
        if (loginError) {
            loginError.textContent = response.message;
            loginError.style.display = 'block';
        }
        if (loginScreen) loginScreen.scrollTop = 0;
    }
});

// دالة إرسال الرسالة العامة إلى السيرفر
function handleSend() {
    if (!messageInput) return;
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

// استقبال الرسالة العامة القادمة من السيرفر وعرضها فوراً
socket.on('receiveMessage', (data) => {
    if (!messagesContainer) return;
    const newMsg = document.createElement('div');
    
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

// استقبال قائمة المتواجدين الحية وتحديث العداد والأعضاء ديناميكياً
socket.on('updateUsersList', (users) => {
    const usersCountSpan = document.getElementById('users-count');
    if (usersCountSpan) usersCountSpan.textContent = users.length;

    const activeUsersList = document.getElementById('active-users-list');
    if (!activeUsersList) return;
    
    activeUsersList.innerHTML = ''; // تنظيف القائمة
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = user.premium ? 'user-card premium' : 'user-card';
        
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

// دالة التبديل بين اللوحات الجانبية في السايدبار الديناميكي
function switchSidebar(panelName) {
    const sidebar = document.getElementById('dynamic-sidebar');
    const panels = ['panel-users', 'panel-rooms', 'panel-private']; // أضفنا لوحة الخاص هنا بشكل آمن
    
    panels.forEach(id => {
        const p = document.getElementById(id);
        if (p) p.style.display = 'none';
    });
    
    const targetPanel = document.getElementById(`panel-${panelName}`);
    if (targetPanel) targetPanel.style.display = 'flex';
    if (sidebar) sidebar.style.display = 'block';
}

function closeSidebar() {
    const sidebar = document.getElementById('dynamic-sidebar');
    if (sidebar) sidebar.style.display = 'none';
}

// دالة فتح المحادثة الخاصة الثنائية والتحقق من جدار الدفع
function openPrivateChat(name) {
    if (name === myProfile.name) {
        alert("لا يمكنك فتح محادثة خاصة مع نفسك!");
        return;
    }
    if (!isSubscribed) {
        const paywall = document.getElementById('paywall');
        if (paywall) paywall.style.display = 'flex';
    } else {
        currentPrivateTarget = name;
        
        const popup = document.getElementById('private-chat-window');
        const popupTitle = document.getElementById('popup-target-name');
        const popupMessages = document.getElementById('popup-messages');
        
        if (popupTitle) popupTitle.textContent = name;
        if (popupMessages) popupMessages.innerHTML = '';
        if (popup) popup.style.display = 'flex';
    }
}

// دالة إرسال الرسائل النصية الخاصة الثنائية
function sendPopupMessage() {
    const popupInput = document.getElementById('popup-msg-input');
    if (!popupInput) return;
    const text = popupInput.value.trim();
    
    if (text !== "" && currentPrivateTarget) {
        socket.emit('sendPrivateMessage', {
            text: text,
            sender: myProfile.name,
            target: currentPrivateTarget
        });
        
        const popupMessages = document.getElementById('popup-messages');
        if (popupMessages) {
            const myMsg = document.createElement('div');
            myMsg.className = 'msg msg-me';
            myMsg.innerHTML = `<span>${text}</span><span class="msg-time">الآن</span>`;
            popupMessages.appendChild(myMsg);
            popupMessages.scrollTop = popupMessages.scrollHeight;
            
            // أرشفة الرسالة التي أرسلتها في الذاكرة الشخصية وتحديث القائمة فوراً
            privateHistory[currentPrivateTarget] = popupMessages.innerHTML;
            updateActivePrivateChatsList();
        }
        popupInput.value = "";
    }
}

// استقبال الرسائل الخاصة الثنائية وعرضها وأرشفتها فوراً
socket.on('receivePrivateMessage', (data) => {
    if (!currentPrivateTarget || currentPrivateTarget !== data.sender) {
        currentPrivateTarget = data.sender;
        const popup = document.getElementById('private-chat-window');
        const popupTitle = document.getElementById('popup-target-name');
        if (popupTitle) popupTitle.textContent = data.sender;
        const popupMessages = document.getElementById('popup-messages');
        if (popupMessages) popupMessages.innerHTML = '';
        if (popup) popup.style.display = 'flex';
    }
    
    const popupMessages = document.getElementById('popup-messages');
    if (popupMessages) {
        const otherMsg = document.createElement('div');
        otherMsg.className = 'msg msg-other';
        otherMsg.innerHTML = `<span class="msg-sender">${data.sender} (خاص 🔒)</span><span>${data.text}</span><span class="msg-time">الآن</span>`;
        popupMessages.appendChild(otherMsg);
        popupMessages.scrollTop = popupMessages.scrollHeight;
        
        // أرشفة الرسالة المستلمة في الذاكرة الشخصية وتحديث القائمة فوراً
        privateHistory[data.sender] = popupMessages.innerHTML;
        updateActivePrivateChatsList();
    }
});

// معالجة اختيار وإرسال الصور الخاصة عبر الدبوس بصيغة Base64
function handlePopupImage(event) {
    const file = event.target.files[0];
    if (file && currentPrivateTarget) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            
            socket.emit('sendPrivateImage', {
                image: imageData,
                sender: myProfile.name,
                target: currentPrivateTarget
            });
            
            const popupMessages = document.getElementById('popup-messages');
            if (popupMessages) {
                const myImgMsg = document.createElement('div');
                myImgMsg.className = 'msg msg-me';
                myImgMsg.innerHTML = `<img src="${imageData}" class="popup-shared-img"><span class="msg-time">الآن</span>`;
                popupMessages.appendChild(myImgMsg);
                popupMessages.scrollTop = popupMessages.scrollHeight;
            }
        };
        reader.readAsDataURL(file);
        document.getElementById('popup-file-input').value = '';
    }
}

// استقبال الصور الخاصة وعرضها في الصندوق العائم وأرشفتها في الذاكرة
socket.on('receivePrivateImage', (data) => {
    if (!currentPrivateTarget || currentPrivateTarget !== data.sender) {
        currentPrivateTarget = data.sender;
        const popup = document.getElementById('private-chat-window');
        const popupTitle = document.getElementById('popup-target-name');
        if (popupTitle) popupTitle.textContent = data.sender;
        const popupMessages = document.getElementById('popup-messages');
        if (popupMessages) popupMessages.innerHTML = '';
        if (popup) popup.style.display = 'flex';
    }
    
    const popupMessages = document.getElementById('popup-messages');
    if (popupMessages) {
        const otherImgMsg = document.createElement('div');
        otherImgMsg.className = 'msg msg-other';
        otherImgMsg.innerHTML = `<span class="msg-sender">${data.sender} (🔒 صورة)</span><img src="${data.image}" class="popup-shared-img"><span class="msg-time">الآن</span>`;
        popupMessages.appendChild(otherImgMsg);
        popupMessages.scrollTop = popupMessages.scrollHeight;
        
        // أرشفة الصورة المستلمة في الذاكرة الشخصية وتحديث القائمة فوراً
        privateHistory[data.sender] = popupMessages.innerHTML;
        updateActivePrivateChatsList();
    }
});

// دوال التحكم بالنافذة المنبثقة للخاص والكارت الشخصي
function closePrivatePopup() {
    const popup = document.getElementById('private-chat-window');
    if (popup) popup.style.display = 'none';
    currentPrivateTarget = null;
}

function toggleMaximizePopup() {
    const popup = document.getElementById('private-chat-window');
    const maxBtn = document.getElementById('popup-maximize-btn');
    if (!popup) return;
    popup.classList.toggle('maximized');
    if (maxBtn) maxBtn.textContent = popup.classList.contains('maximized') ? '🔽' : '🔲';
}

function triggerPopupFile() {
    const fileInp = document.getElementById('popup-file-input');
    if (fileInp) fileInp.click();
}

function handlePopupKey(e) {
    if (e.key === 'Enter') sendPopupMessage();
}

// تشغيل وفتح كارت الملف الشخصي المنبثق الفاخر
function showUserProfile(name, avatar, location) {
    selectedModalUser = name;
    const mName = document.getElementById('modal-user-name');
    const mAvat = document.getElementById('modal-user-avatar');
    const mLoc = document.getElementById('modal-user-location');
    const modal = document.getElementById('user-profile-modal');
    
    if (mName) mName.textContent = name;
    if (mAvat) mAvat.src = avatar;
    if (mLoc) mLoc.textContent = location;
    if (modal) modal.style.display = 'flex';
}

function closeProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    if (modal) modal.style.display = 'none';
    selectedModalUser = null;
}

function startPrivateFromModal() {
    if (selectedModalUser) {
        const target = selectedModalUser;
        closeProfileModal();
        openPrivateChat(target);
    }
}

// إدارة جدار الدفع والمحاكاة التجريبية للتفعيل الفوري
function simulatePayment() {
    isSubscribed = true;
    closePaywall();
    const badge = document.getElementById('user-status-badge');
    if (badge) {
        badge.style.backgroundColor = '#10b981';
        badge.textContent = '✨ مشترك متميز (نشط)';
    }
    alert('🎉 تهانينا! تم تفعيل اشتراكك التجريبي مجاناً. يمكنك الآن تبادل الصور والرسائل الخاصة!');
    socket.emit('upgradeToPremium');
}

function closePaywall() {
    const paywall = document.getElementById('paywall');
    if (paywall) paywall.style.display = 'none';
}

if (messageInput) {
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSend();
    });
}

// مصفوفة ذكية لتخزين تاريخ الرسائل الخاصة لكل مستخدم طوال الجلسة
let privateHistory = {};

// دالة لتحديث قائمة الأسخاص النشطين في سايدبار الخاص
function updateActivePrivateChatsList() {
    const privateListContainer = document.getElementById('active-private-chats');
    if (!privateListContainer) return;
    
    privateListContainer.innerHTML = ''; // تنظيف القائمة القديمة
    
    // جلب أسماء الأشخاص الذين بينك وبينهم تاريخ رسائل
    Object.keys(privateHistory).forEach(chatName => {
        const chatItem = document.createElement('div');
        chatItem.className = 'room-item';
        chatItem.style.display = 'flex';
        chatItem.style.justifyContent = 'space-between';
        chatItem.style.alignItems = 'center';
        
        chatItem.innerHTML = `
            <span onclick="reloadPrivateChatFromSidebar('${chatName}')" style="cursor: pointer; flex: 1;">💬 ${chatName}</span>
            <span onclick="deletePrivateChatHistory('${chatName}')" style="cursor: pointer; color: #ef4444; font-weight: bold; padding: 0 5px;">✖</span>
        `;
        privateListContainer.appendChild(chatItem);
    });
}

// إعادة فتح محادثة قديمة واسترجاع رسائلها المخزنة بالكامل
function reloadPrivateChatFromSidebar(name) {
    currentPrivateTarget = name;
    const popup = document.getElementById('private-chat-window');
    const popupTitle = document.getElementById('popup-target-name');
    const popupMessages = document.getElementById('popup-messages');
    
    if (popupTitle) popupTitle.textContent = name;
    if (popupMessages) {
        // إعادة طباعة الرسائل والصور القديمة من الذاكرة الشخصية
        popupMessages.innerHTML = privateHistory[name] || '';
        popupMessages.scrollTop = popupMessages.scrollHeight;
    }
    if (popup) popup.style.display = 'flex';
}

// دالة حذف محادثة خاصة من الأرشيف والقائمة
function deletePrivateChatHistory(name) {
    if (confirm(`هل تريد مسح وحذف محادثة ${name} من القائمة النشطة؟`)) {
        delete privateHistory[name];
        updateActivePrivateChatsList();
        if (currentPrivateTarget === name) closePrivatePopup();
    }
}
