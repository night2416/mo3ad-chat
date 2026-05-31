// ربط الشات بالسيرفر الفوري عبر مكتبة Socket.io
const socket = io(); 

let isSubscribed = false; 
let currentRoom = 'public';

const messagesContainer = document.getElementById('chat-messages');
const messageInput = document.getElementById('msg-input');
const paywall = document.getElementById('paywall');
const statusBadge = document.getElementById('user-status-badge');
const tabPublic = document.getElementById('tab-public');
const tabPrivate = document.getElementById('tab-private');

// دالة إرسال الرسالة إلى السيرفر
function handleSend() {
    const text = messageInput.value.trim();
    if (text !== "") {
        // إرسال الرسالة للسيرفر لكي يراها الجميع
        socket.emit('sendMessage', {
            text: text,
            sender: isSubscribed ? "عضو متميز ✨" : "عضو جديد"
        });
        messageInput.value = "";
    }
}

// استقبال الرسالة القادمة من السيرفر وعرضها فوراً في الشاشة
socket.on('receiveMessage', (data) => {
    const newMsg = document.createElement('div');
    
    // إظهار الرسائل المتبادلة
    newMsg.className = 'msg msg-me'; 
    newMsg.innerHTML = `<span>${data.text}</span><span class="msg-time">الآن</span>`;
    
    messagesContainer.appendChild(newMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
    switchRoom('private');
}

function closePaywall() { paywall.style.display = 'none'; }

messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleSend();
});
