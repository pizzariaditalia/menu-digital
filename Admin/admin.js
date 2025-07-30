// admin.js - VERSÃO 100% COMPLETA E FINAL (COM NOTIFICAÇÕES E PERMISSÕES)

// --- FUNÇÃO PARA APLICAR PERMISSÕES NA INTERFACE ---
function applyRolePermissions(role) {
    if (role === 'admin') {
        console.log("Usuário é admin. Acesso total concedido.");
        return;
    }
    console.log("Aplicando permissões para o cargo:", role);
    const adminOnlySections = [
        'vendas-view', 'financeiro-view', 'saques-view', 'cardapio-view',
        'customers-content', 'comunicados-view', 'marketing-view', 
        'promotions-content', 'appearance-view', 'settings-content', 'equipe-view', 'import-view'
    ];
    document.querySelectorAll('.admin-drawer ul li').forEach(listItem => {
        const link = listItem.querySelector('a[data-section-target]');
        if (link && adminOnlySections.includes(link.dataset.sectionTarget)) {
            listItem.classList.add('hidden');
        }
    });
}

// --- Variáveis de estado e funções de Notificação ---
let newOrdersNotifications = [];
let newChatNotifications = [];
let newWithdrawalNotifications = [];
let newMarketingNotifications = [];

function renderNotificationsDropdown() {
    const listContainer = document.getElementById('notification-dropdown-list');
    const badge = document.getElementById('notification-badge');
    if (!listContainer || !badge) return;

    const allNotifications = [...newOrdersNotifications, ...newChatNotifications, ...newWithdrawalNotifications, ...newMarketingNotifications];
    allNotifications.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
    const totalCount = allNotifications.length;

    badge.textContent = totalCount;
    badge.classList.toggle('hidden', totalCount === 0);

    if (totalCount === 0) {
        listContainer.innerHTML = '<p class="empty-message">Nenhuma nova notificação.</p>';
        return;
    }
    listContainer.innerHTML = allNotifications.map(notif => {
        const time = notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
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
            case 'marketing_reminder':
                icon = '<i class="fas fa-calendar-check" style="color: #6f42c1;"></i>';
                actionButton = `<button class="btn btn-sm btn-success complete-marketing-post-btn" data-type="marketing" data-id="${notif.id}"><i class="fas fa-check"></i> Marcar como Postado</button>`;
                break;
        }
        return `<div class="chat-item" id="notif-${notif.id}"><div class="chat-item-header"><span>${icon} <strong>${notif.title}</strong></span><span>${time}</span></div><p class="chat-item-message">${notif.message}</p><div class="chat-item-actions">${actionButton}</div></div>`;
    }).join('');
}

function listenForNewOrders() {
    const { collection, query, where, onSnapshot } = window.firebaseFirestore;
    const q = query(collection(window.db, "pedidos"), where("status", "in", ["Recebido", "Aguardando Comprovante"]));
    onSnapshot(q, (snapshot) => {
        if (snapshot.docChanges().some(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites)) {
            new Audio('../audio/notification.mp3').play().catch(e => {});
        }
        newOrdersNotifications = snapshot.docs.map(doc => ({
            id: doc.id, type: 'new_order', title: 'Novo Pedido!',
            message: `Pedido de ${doc.data().customer?.firstName || 'Cliente'}. Total: ${formatPrice(doc.data().totals?.grandTotal)}`,
            timestamp: doc.data().createdAt, sourceData: { id: doc.id, ...doc.data() }
        }));
        renderNotificationsDropdown();
    });
}

function listenForChatMessages() {
    const { collection, query, where, onSnapshot } = window.firebaseFirestore;
    const q = query(collection(window.db, "chat_messages"), where("isRead", "==", false));
    onSnapshot(q, (snapshot) => {
        newChatNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            type: 'chat_message',
            title: `Msg de ${doc.data().driverName}`,
            message: doc.data().message,
            timestamp: doc.data().timestamp
        }));
        renderNotificationsDropdown();
    });
}

function listenForWithdrawalRequests() {
    const { collection, query, where, onSnapshot } = window.firebaseFirestore;
    const q = query(collection(window.db, "withdrawal_requests"), where("status", "==", "pending"));
    onSnapshot(q, (snapshot) => {
        newWithdrawalNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            type: 'withdrawal_request',
            title: 'Pedido de Saque',
            message: `${doc.data().driverName} solicitou ${formatPrice(doc.data().amount)}`,
            timestamp: doc.data().requestedAt
        }));
        renderNotificationsDropdown();
    });
}

function listenForMarketingReminders() {
    const { collection, query, where, onSnapshot, Timestamp } = window.firebaseFirestore;
    const now = Timestamp.now();
    const oneHourAgo = Timestamp.fromMillis(now.toMillis() - 60 * 60 * 1000);
    const q = query(collection(window.db, "scheduled_posts"),
        where("status", "==", "agendado"),
        where("scheduledAt", "<=", now),
        where("scheduledAt", ">=", oneHourAgo)
    );
    onSnapshot(q, (snapshot) => {
        newMarketingNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            type: 'marketing_reminder',
            title: 'Lembrete de Postagem!',
            message: `Está na hora de postar: "${doc.data().title}"`,
            timestamp: doc.data().scheduledAt
        }));
        renderNotificationsDropdown();
    });
}

function initializeNotificationCenter() {
    listenForNewOrders();
    listenForChatMessages();
    listenForWithdrawalRequests();
    listenForMarketingReminders();

    const dropdownList = document.getElementById('notification-dropdown-list');
    if (dropdownList) {
        dropdownList.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = e.target.closest('button, a');
            if (!target) return;
            const { type, id } = target.dataset;
            const { doc, updateDoc } = window.firebaseFirestore;

            if (target.matches('.mark-as-read-btn') && type === 'chat') {
                await updateDoc(doc(window.db, "chat_messages", id), { isRead: true });
            } else if (target.matches('.complete-marketing-post-btn') && type === 'marketing') {
                await updateDoc(doc(window.db, "scheduled_posts", id), { status: "concluido" });
                window.showToast("Post marcado como concluído!", "success");
            } else if (target.matches('.view-notification-btn')) {
                if (type === 'order') {
                    document.querySelector('a[data-section-target="orders-content"]')?.click();
                    const notifData = newOrdersNotifications.find(n => n.id === id);
                    if (notifData && typeof window.openOrderDetailsModal === 'function') {
                        window.openOrderDetailsModal(notifData.sourceData);
                    }
                } else if (type === 'withdrawal') {
                    document.querySelector('a[data-section-target="saques-view"]')?.click();
                }
            }
            document.getElementById('notification-dropdown').classList.add('hidden');
        });
    }
}

// --- LÓGICA PRINCIPAL DO PAINEL ---
async function startAdminPanel(userRole) {
    console.log("Admin.js: startAdminPanel() iniciado.");

    applyRolePermissions(userRole);

    async function initializeMenuData() {
        const { doc, getDoc } = window.firebaseFirestore;
        const menuDocRef = doc(window.db, "menus", "principal");
        try {
            const docSnap = await getDoc(menuDocRef);
            window.menuData = docSnap.exists() ? docSnap.data() : {};
        } catch (e) { console.error("Erro ao carregar cardápio:", e); window.menuData = {}; }
    }

    async function initializeAppSettings() {
        const { doc, getDoc } = window.firebaseFirestore;
        const settingsDocRef = doc(window.db, "configuracoes", "mainSettings");
        try {
            const docSnap = await getDoc(settingsDocRef);
            window.appSettings = docSnap.exists() ? docSnap.data() : {};
        } catch (e) { console.error("Erro ao carregar configurações:", e); window.appSettings = {}; }
    }
    
    await Promise.all([initializeMenuData(), initializeAppSettings()]);
    
    const drawerLinks = document.querySelectorAll('.admin-drawer ul li a');
    const adminViews = document.querySelectorAll('.admin-main-content .admin-view');
    const openDrawerButton = document.getElementById('open-drawer-menu');
    const closeDrawerButton = document.getElementById('close-drawer-menu');
    const drawerMenu = document.getElementById('admin-drawer-menu');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const notificationBell = document.getElementById('notification-bell');
    const notificationDropdown = document.getElementById('notification-dropdown');

    function toggleDrawer(isOpen) {
        if (!drawerMenu || !drawerOverlay) return;
        drawerMenu.classList.toggle('open', isOpen);
        drawerOverlay.classList.toggle('show', isOpen);
    }

    if (openDrawerButton && !openDrawerButton.dataset.listener) {
        openDrawerButton.dataset.listener = 'true';
        openDrawerButton.addEventListener('click', () => toggleDrawer(true));
    }
    if (closeDrawerButton && !closeDrawerButton.dataset.listener) {
        closeDrawerButton.dataset.listener = 'true';
        closeDrawerButton.addEventListener('click', () => toggleDrawer(false));
    }
    if (drawerOverlay && !drawerOverlay.dataset.listener) {
        drawerOverlay.dataset.listener = 'true';
        drawerOverlay.addEventListener('click', () => toggleDrawer(false));
    }
    if(notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            if (notificationDropdown) notificationDropdown.classList.toggle('hidden');
        });
    }

    drawerLinks.forEach(link => {
        if (link.dataset.listener) return;
        link.dataset.listener = 'true';
        link.addEventListener('click', function(event) {
            if (this.getAttribute('target') === '_blank' || this.closest('li').querySelector('hr')) return;
            event.preventDefault();
            drawerLinks.forEach(dl => dl.parentElement.classList.remove('active-link'));
            this.parentElement.classList.add('active-link');
            const targetViewId = this.dataset.sectionTarget;
            adminViews.forEach(view => view.classList.toggle('active', view.id === targetViewId));
            
            switch (targetViewId) {
                case 'orders-content': if (typeof window.initializeOrdersSection === 'function') window.initializeOrdersSection(); break;
                case 'map-view': if (typeof window.initializeMapSection === 'function') window.initializeMapSection(); break;
                case 'pdv-content': if (typeof window.initializePdvSection === 'function') window.initializePdvSection(); break;
                case 'vendas-view': if (typeof window.initializeVendasSection === 'function') window.initializeVendasSection(); break;
                case 'financeiro-view': if (typeof window.initializeFinanceiroSection === 'function') window.initializeFinanceiroSection(); break;
                case 'saques-view': if (typeof window.initializeSaquesSection === 'function') window.initializeSaquesSection(); break;
                case 'cardapio-view': if (typeof window.initializeCardapioSection === 'function') window.initializeCardapioSection(); break;
                case 'customers-content': if (typeof window.initializeCustomersSection === 'function') window.initializeCustomersSection(); break;
                case 'comunicados-view': if (typeof window.initializeComunicadosSection === 'function') window.initializeComunicadosSection(); break;
                case 'marketing-view': if (typeof window.initializeMarketingSection === 'function') window.initializeMarketingSection(); break;
                case 'promotions-content': if (typeof window.initializePromotionsSection === 'function') window.initializePromotionsSection(); break;
                case 'appearance-view': if (typeof window.initializeAppearanceSection === 'function') window.initializeAppearanceSection(); break;
                case 'settings-content': if (typeof window.initializeSettingsSection === 'function') window.initializeSettingsSection(); break;
                case 'equipe-view': if (typeof window.initializeEquipeSection === 'function') window.initializeEquipeSection(); break;
                case 'import-view': if (typeof window.initializeImportSection === 'function') window.initializeImportSection(); break;
            }
            toggleDrawer(false);
        });
    });

    setTimeout(() => {
        let initialLink = document.querySelector('.admin-drawer ul li.active-link:not(.hidden) a');
        if (!initialLink) {
            initialLink = document.querySelector('.admin-drawer ul li:not(.hidden) a[data-section-target]');
        }
        if (initialLink) {
            initialLink.click();
        } else {
            console.error("Nenhuma view inicial visível encontrada para este cargo.");
        }
    }, 100);

    initializeNotificationCenter();
    console.log("Admin.js: Painel Carregado e Scripts Prontos!");
}
window.startAdminPanel = startAdminPanel;

// --- FUNÇÕES GLOBAIS ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00";
window.formatPrice = formatPrice;
window.showToast = showToast;