// admin.js - VERSÃO FINAL E VERIFICADA COM CENTRAL DE NOTIFICAÇÕES

// --- Variáveis de estado para notificações ---
let newOrdersNotifications = [];
let newChatNotifications = [];
let newWithdrawalNotifications = [];

// --- Função unificada para renderizar o dropdown de notificações ---
function renderNotificationsDropdown() {
  const listContainer = document.getElementById('notification-dropdown-list');
  const badge = document.getElementById('notification-badge');
  if (!listContainer || !badge) return;

  const allNotifications = [
    ...newOrdersNotifications,
    ...newChatNotifications,
    ...newWithdrawalNotifications
  ];

  allNotifications.sort((a, b) => b.timestamp - a.timestamp);
  const totalCount = allNotifications.length;

  if (totalCount > 0) {
    badge.textContent = totalCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  if (totalCount === 0) {
    listContainer.innerHTML = '<p class="empty-message">Nenhuma nova notificação.</p>';
    return;
  }

  listContainer.innerHTML = allNotifications.map(notif => {
    const time = notif.timestamp.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    });
    let icon = '', actionButton = '';

    switch (notif.type) {
      case 'new_order':
        icon = '<i class="fas fa-receipt" style="color: var(--admin-primary-blue);"></i>';
        actionButton = `<a href="#" class="btn btn-sm btn-secondary-outline view-notification-btn" data-type="order" data-id="${notif.id}">Ver Pedido</a>`;
        break;
      case 'chat_message':
        icon = '<i class="fas fa-comment-dots" style="color: #17a2b8;"></i>';
        actionButton = `<button class="btn btn-sm btn-secondary-outline mark-as-read-btn" data-type="chat" data-id="${notif.id}">Marcar como lida</button>`;
        break;
      case 'withdrawal_request':
        icon = '<i class="fas fa-hand-holding-usd" style="color: var(--admin-success-green);"></i>';
        actionButton = `<a href="#" class="btn btn-sm btn-secondary-outline view-notification-btn" data-type="withdrawal" data-id="${notif.id}">Ver Saques</a>`;
        break;
    }

    return `
    <div class="chat-item" id="notif-${notif.id}">
    <div class="chat-item-header">
    <span>${icon} <strong>${notif.title}</strong></span>
    <span>${time}</span>
    </div>
    <p class="chat-item-message">${notif.message}</p>
    <div class="chat-item-actions">${actionButton}</div>
    </div>`;
  }).join('');
}


// --- Funções que "escutam" cada tipo de notificação ---

function listenForNewOrders() {
  const {
    collection,
    query,
    where,
    onSnapshot
  } = window.firebaseFirestore;
  const q = query(collection(window.db, "pedidos"), where("status", "in", ["Recebido", "Aguardando Comprovante"]));

  onSnapshot(q, (snapshot) => {
    if (snapshot.docChanges().some(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites)) {
      new Audio('../audio/notification.mp3').play().catch(e => console.warn("Áudio bloqueado"));
    }

    newOrdersNotifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'new_order',
        title: 'Novo Pedido!',
        message: `Pedido de ${data.customer?.firstName || 'Cliente'}. Total: R$ ${data.totals?.grandTotal.toFixed(2)}`,
        timestamp: data.createdAt?.toDate() || new Date(),
        sourceData: data // Guarda o objeto do pedido original
      };
  });
    renderNotificationsDropdown();
  });
}

function listenForChatMessages() {
const {
collection, query, where, onSnapshot
} = window.firebaseFirestore;
const q = query(collection(window.db, "chat_messages"),
where("isRead", "==", false));

onSnapshot(q,
(snapshot) => {
if (snapshot.docChanges().some(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites)) {
new Audio('../audio/notification-mensagem.mp3').play().catch(e => console.warn("Áudio bloqueado"));
}

newChatNotifications = snapshot.docs.map(doc => {
const data = doc.data();
return {
id: doc.id,
type: 'chat_message',
title: `Msg de ${data.driverName}`,
message: data.message,
timestamp: data.timestamp?.toDate() || new Date()
};
});
renderNotificationsDropdown();
});
}

function listenForWithdrawalRequests() {
const {
collection, query, where, onSnapshot
} = window.firebaseFirestore;
const q = query(collection(window.db, "withdrawal_requests"),
where("status", "==", "pending"));

onSnapshot(q,
(snapshot) => {
if (snapshot.docChanges().some(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites)) {
new Audio('../audio/notification-mensagem.mp3').play().catch(e => console.warn("Áudio bloqueado"));
}
newWithdrawalNotifications = snapshot.docs.map(doc => {
const data = doc.data();
return {
id: doc.id,
type: 'withdrawal_request',
title: 'Pedido de Saque',
message: `${data.driverName} solicitou R$ ${data.amount.toFixed(2)}`,
timestamp: data.requestedAt?.toDate() || new Date()
};
});
renderNotificationsDropdown();
});
}


// --- Função principal que inicializa a central de notificações ---
function initializeNotificationCenter() {
listenForNewOrders();
listenForChatMessages();
listenForWithdrawalRequests();

const dropdownList = document.getElementById('notification-dropdown-list');
dropdownList.addEventListener('click',
async (e) => {
e.preventDefault();
const target = e.target.closest('button, a');
if (!target) return;

const type = target.dataset.type;
const id = target.dataset.id;
const notificationDropdown = document.getElementById('notification-dropdown');

if (target.matches('.mark-as-read-btn')) {
if (type === 'chat') {
const {
doc,
updateDoc
} = window.firebaseFirestore;
await updateDoc(doc(window.db, "chat_messages", id), {
isRead: true
});
}
}

if (target.matches('.view-notification-btn')) {
if (type === 'withdrawal') {
document.querySelector('a[data-section-target="saques-view"]')?.click();
}
if (type === 'order') {
document.querySelector('a[data-section-target="orders-content"]')?.click();
if (typeof window.openOrderDetailsModal === 'function') {
const notifData = newOrdersNotifications.find(n => n.id === id);
if (notifData && notifData.sourceData) {
window.openOrderDetailsModal({
id: notifData.id, ...notifData.sourceData
});
}
}
}
if (notificationDropdown) notificationDropdown.classList.add('hidden');
}
});
}

// --- LÓGICA DO PAINEL (INICIALIZAÇÃO, MENU, ETC) ---

async function startAdminPanel() {
console.log("Admin.js: startAdminPanel() iniciado.");

const defaultMenuDataAdmin = {
"pizzas-tradicionais": {
name: "Pizzas Tradicionais", items: []
}
};
const defaultAppSettings = {
operatingHours: {}, deliveryFees: {}, storeInfo: {
minOrderValue: 0
}
};

async function initializeMenuData() {
if (!window.firebaseFirestore || !window.db) {
window.menuData = JSON.parse(JSON.stringify(defaultMenuDataAdmin)); return;
}
const {
doc,
getDoc
} = window.firebaseFirestore;
const menuDocRef = doc(window.db, "menus", "principal");
try {
const docSnap = await getDoc(menuDocRef); window.menuData = docSnap.exists() ? docSnap.data(): defaultMenuDataAdmin;
}
catch (error) {
window.menuData = JSON.parse(JSON.stringify(defaultMenuDataAdmin));
}
}

async function initializeAppSettings() {
if (!window.firebaseFirestore || !window.db) {
window.appSettings = JSON.parse(JSON.stringify(defaultAppSettings)); return;
}
const {
doc,
getDoc
} = window.firebaseFirestore;
const settingsDocRef = doc(window.db, "configuracoes", "mainSettings");
try {
const docSnap = await getDoc(settingsDocRef); window.appSettings = docSnap.exists() ? {
...defaultAppSettings,
...docSnap.data()
}: defaultAppSettings;
}
catch (error) {
window.appSettings = JSON.parse(JSON.stringify(defaultAppSettings));
}
}

await initializeMenuData();
await initializeAppSettings();

const openDrawerButton = document.getElementById('open-drawer-menu');
const closeDrawerButton = document.getElementById('close-drawer-menu');
const drawerMenu = document.getElementById('admin-drawer-menu');
const drawerOverlay = document.getElementById('drawer-overlay');
const drawerLinks = document.querySelectorAll('.admin-drawer ul li a');
const adminViews = document.querySelectorAll('.admin-main-content .admin-view');

const notificationBell = document.getElementById('notification-bell');
const notificationDropdown = document.getElementById('notification-dropdown');

function toggleDrawer(isOpen) {
if (!drawerMenu || !drawerOverlay) return;
drawerMenu.classList.toggle('open', isOpen);
drawerOverlay.classList.toggle('show', isOpen);
document.body.style.overflow = isOpen ? 'hidden': '';
}

if (openDrawerButton) openDrawerButton.addEventListener('click', () => toggleDrawer(true));
if (closeDrawerButton) closeDrawerButton.addEventListener('click', () => toggleDrawer(false));
if (drawerOverlay) drawerOverlay.addEventListener('click', () => toggleDrawer(false));

drawerLinks.forEach(link => {
link.addEventListener('click', function(event) {
if (this.getAttribute('target') === '_blank' || this.closest('li').querySelector('hr')) return;
event.preventDefault();
drawerLinks.forEach(dl => dl.parentElement.classList.remove('active-link'));
this.parentElement.classList.add('active-link');
const targetViewId = this.dataset.sectionTarget;
adminViews.forEach(view => {
view.classList.toggle('active', view.id === targetViewId)
});

switch (targetViewId) {
case 'appearance-view': if (typeof window.initializeAppearanceSection === 'function') window.initializeAppearanceSection(); break;
case 'cardapio-view': if (typeof window.initializeCardapioSection === 'function') window.initializeCardapioSection(); break;
case 'pdv-content': if (typeof window.initializePdvSection === 'function') window.initializePdvSection(); break;
case 'orders-content': if (typeof window.initializeOrdersSection === 'function') window.initializeOrdersSection(); break;
case 'vendas-view': if (typeof window.initializeVendasSection === 'function') window.initializeVendasSection(); break;
case 'financeiro-view': if (typeof window.initializeFinanceiroSection === 'function') window.initializeFinanceiroSection(); break;
case 'customers-content': if (typeof window.initializeCustomersSection === 'function') window.initializeCustomersSection(); break;
case 'promotions-content': if (typeof window.initializePromotionsSection === 'function') window.initializePromotionsSection(); break;
case 'settings-content': if (typeof window.initializeSettingsSection === 'function') window.initializeSettingsSection(); break;
case 'comunicados-view': if (typeof window.initializeComunicadosSection === 'function') window.initializeComunicadosSection(); break;
case 'import-view': if (typeof window.initializeImportSection === 'function') window.initializeImportSection(); break;
case 'saques-view': if (typeof window.initializeSaquesSection === 'function') window.initializeSaquesSection(); break;
case 'map-view': if (typeof window.initializeMapSection === 'function') window.initializeMapSection(); break;
}
toggleDrawer(false);
});
});

if (notificationBell) {
notificationBell.addEventListener('click', (e) => {
e.stopPropagation();
if (notificationDropdown) notificationDropdown.classList.toggle('hidden');
});
}

document.addEventListener('click',
(e) => {
if (notificationDropdown && !notificationDropdown.classList.contains('hidden') && !notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
notificationDropdown.classList.add('hidden');
}
});

const initialActiveViewLink = document.querySelector('.admin-drawer ul li.active-link a');
if (initialActiveViewLink) {
initialActiveViewLink.click();
} else {
const firstLink = document.querySelector('.admin-drawer a[data-section-target]');
if (firstLink) firstLink.click();
}

initializeNotificationCenter();

console.log("Admin.js: Painel Carregado e Scripts Prontos!");
}
window.startAdminPanel = startAdminPanel;

function setupAdminNotifications() {
const enableBtn = document.getElementById('admin-enable-notifications-btn');
if (!enableBtn) return;
const icon = enableBtn.querySelector('i');
if (Notification.permission === 'granted') {
icon.classList.remove('fa-bell-slash');
icon.classList.add('fa-bell');
enableBtn.title = "Notificações ativadas";
}
enableBtn.addEventListener('click', async () => {
if (!window.firebaseMessaging || !auth.currentUser) {
window.showToast("Erro: Usuário não autenticado.", "error");
return;
}
try {
const permission = await Notification.requestPermission();
if (permission === 'granted') {
const {
getToken,
messagingInstance
} = window.firebaseMessaging;
const vapidKey = 'BEu5mwSdY7ci-Tl8lUJcrq12Ct1w62_2ywucGfPq0FanERTxEUk7wB9PK37dxxles-9jpbN2nsrv3S2xnzelqYU';
const fcmToken = await getToken(messagingInstance, {
vapidKey
});
if (fcmToken) {
const {
doc,
setDoc,
arrayUnion
} = window.firebaseFirestore;
const adminUserRef = doc(db, "admin_users", auth.currentUser.uid);
await setDoc(adminUserRef, {
email: auth.currentUser.email,
notificationTokens: arrayUnion(fcmToken)
}, {
merge: true
});
window.showToast("Notificações ativadas para este dispositivo!", "success");
icon.classList.remove('fa-bell-slash');
icon.classList.add('fa-bell');
enableBtn.title = "Notificações ativadas";
}
} else {
window.showToast("Permissão de notificação negada.", "warning");
}
} catch (error) {
console.error("Erro ao ativar notificações do admin:", error);
window.showToast("Erro ao ativar notificações.", "error");
}
});
}

function showToast(message, type = 'success') {
const existingToast = document.querySelector('.toast-notification');
if (existingToast) {
existingToast.remove();
}
const toast = document.createElement('div');
toast.className = `toast-notification ${type}`;
toast.textContent = message;
document.body.appendChild(toast);
setTimeout(() => {
toast.classList.add('show');
}, 100);
setTimeout(() => {
toast.classList.remove('show');
setTimeout(() => {
if (toast.parentElement) {
toast.parentElement.removeChild(toast);
}
},
500);
}, 3000);
}

// --- Chamadas Iniciais ---
setupAdminNotifications();
window.showToast = showToast;