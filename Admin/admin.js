// admin.js - VERSÃO FINAL CORRIGIDA (sem a chamada do chat listener)

// --- Variáveis globais ---
let unreadMessages = [];

// --- Funções do Chat ---

function renderChatDropdown() {
    const listContainer = document.getElementById('chat-dropdown-list');
    const badge = document.getElementById('chat-badge');
    
    if (!listContainer || !badge) return;

    // Atualiza o contador no badge
    if (unreadMessages.length > 0) {
        badge.textContent = unreadMessages.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // Renderiza a lista de mensagens
    if (unreadMessages.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">Nenhuma nova mensagem.</p>';
        return;
    }

    listContainer.innerHTML = unreadMessages.map(msg => {
        const timestamp = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        return `
            <div class="chat-item" id="chat-msg-${msg.id}">
                <div class="chat-item-header">
                    <span>De: <strong>${msg.driverName}</strong></span>
                    <span>${timestamp}</span>
                </div>
                <p class="chat-item-message">${msg.message}</p>
                <div class="chat-item-actions">
                    <a href="#" class="link-view-order" data-order-id="${msg.orderId}">Ver Pedido #${msg.orderId.substring(0, 6)}</a>
                    <button class="btn btn-sm btn-secondary-outline mark-as-read-btn" data-msg-id="${msg.id}" style="margin-left: 10px;">Marcar como lida</button>
                </div>
            </div>
        `;
    }).join('');
}

async function markMessageAsRead(messageId) {
    const { doc, updateDoc } = window.firebaseFirestore;
    const msgRef = doc(window.db, "chat_messages", messageId);
    try {
        await updateDoc(msgRef, { isRead: true });
    } catch (error) {
        console.error("Erro ao marcar mensagem como lida:", error);
        window.showToast("Erro ao processar mensagem.", "error");
    }
}

function initializeChatListener() {
    // Esta função agora é chamada pelo paineladmin.html
    console.log("Admin.js: Inicializando listener do chat com filtros.");
    const { collection, query, where, orderBy, onSnapshot } = window.firebaseFirestore;
    
    const q = query(
        collection(window.db, "chat_messages"), 
        where("isRead", "==", false), 
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snapshot) => {
        if (!snapshot.metadata.hasPendingWrites && snapshot.docChanges().some(c => c.type === 'added')) {
            new Audio('../audio/notification.mp3').play().catch(e => console.warn("Áudio bloqueado pelo navegador"));
        }
        
        unreadMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderChatDropdown();
    }, (error) => {
        console.error("ERRO no listener do chat:", error);
    });
}
// Disponibiliza a função globalmente para que o HTML possa chamá-la
window.initializeChatListener = initializeChatListener;


async function startAdminPanel() {
  console.log("Admin.js: startAdminPanel() iniciado.");

  // --- Seletores do DOM ---
  const openDrawerButton = document.getElementById('open-drawer-menu');
  const closeDrawerButton = document.getElementById('close-drawer-menu');
  const drawerMenu = document.getElementById('admin-drawer-menu');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const drawerLinks = document.querySelectorAll('.admin-drawer ul li a');
  const adminViews = document.querySelectorAll('.admin-main-content .admin-view');
  
  const chatNotificationBell = document.getElementById('chat-notification-bell');
  const chatDropdown = document.getElementById('chat-dropdown');

  // --- Lógica do Menu e Navegação ---
  const defaultMenuDataAdmin = { "pizzas-tradicionais": { name: "Pizzas Tradicionais", items: [] } };
  const defaultAppSettings = { operatingHours: {}, deliveryFees: {}, storeInfo: { minOrderValue: 0 } };

  async function initializeMenuData() {
    if (!window.firebaseFirestore || !window.db) { window.menuData = JSON.parse(JSON.stringify(defaultMenuDataAdmin)); return; }
    const { doc, getDoc } = window.firebaseFirestore;
    const menuDocRef = doc(window.db, "menus", "principal");
    try { const docSnap = await getDoc(menuDocRef); window.menuData = docSnap.exists() ? docSnap.data() : defaultMenuDataAdmin; }
    catch (error) { window.menuData = JSON.parse(JSON.stringify(defaultMenuDataAdmin)); }
  }

  async function initializeAppSettings() {
    if (!window.firebaseFirestore || !window.db) { window.appSettings = JSON.parse(JSON.stringify(defaultAppSettings)); return; }
    const { doc, getDoc } = window.firebaseFirestore;
    const settingsDocRef = doc(window.db, "configuracoes", "mainSettings");
    try { const docSnap = await getDoc(settingsDocRef); window.appSettings = docSnap.exists() ? { ...defaultAppSettings, ...docSnap.data() } : defaultAppSettings; }
    catch (error) { window.appSettings = JSON.parse(JSON.stringify(defaultAppSettings)); }
  }

  await initializeMenuData();
  await initializeAppSettings();

  function toggleDrawer(isOpen) {
    if (!drawerMenu || !drawerOverlay) return;
    drawerMenu.classList.toggle('open', isOpen);
    drawerOverlay.classList.toggle('show', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
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
      adminViews.forEach(view => { view.classList.toggle('active', view.id === targetViewId) });
      switch (targetViewId) {
        case 'appearance-view': if (typeof window.initializeAppearanceSection === 'function') window.initializeAppearanceSection(); break;
        case 'cardapio-view': if (typeof window.initializeCardapioSection === 'function') window.initializeCardapioSection(); break;
        case 'pdv-content': if (typeof window.initializePdvSection === 'function') window.initializePdvSection(); break;
        case 'orders-content': if (typeof window.initializeOrdersSection === 'function') window.initializeOrdersSection(); break;
        case 'vendas-view': if (typeof window.initializeVendasSection === 'function') window.initializeVendasSection(); break;
        case 'customers-content': if (typeof window.initializeCustomersSection === 'function') window.initializeCustomersSection(); break;
        case 'promotions-content': if (typeof window.initializePromotionsSection === 'function') window.initializePromotionsSection(); break;
        case 'settings-content': if (typeof window.initializeSettingsSection === 'function') window.initializeSettingsSection(); break;
        case 'comunicados-view': if (typeof window.initializeComunicadosSection === 'function') window.initializeComunicadosSection(); break;
        case 'import-view': if (typeof window.initializeImportSection === 'function') window.initializeImportSection(); break;
      }
      toggleDrawer(false);
    });
  });
  
  // --- Lógica do Chat (Event Listeners) ---
  if(chatNotificationBell) {
      chatNotificationBell.addEventListener('click', (e) => {
          e.stopPropagation();
          if (chatDropdown) chatDropdown.classList.toggle('hidden');
      });
  }
  
  const chatDropdownList = document.getElementById('chat-dropdown-list');
  if(chatDropdownList) {
      chatDropdownList.addEventListener('click', (e) => {
          e.preventDefault();
          const target = e.target;
          if (target.classList.contains('mark-as-read-btn')) {
              markMessageAsRead(target.dataset.msgId);
          }
          if (target.classList.contains('link-view-order')) {
              window.showToast("Funcionalidade 'Ver Pedido' a ser implementada.", "info");
          }
      });
  }

  document.addEventListener('click', (e) => {
    if (chatDropdown && !chatDropdown.classList.contains('hidden') && !chatNotificationBell.contains(e.target) && !chatDropdown.contains(e.target)) {
        chatDropdown.classList.add('hidden');
    }
  });

  // --- Inicialização do Painel ---
  const initialActiveViewLink = document.querySelector('.admin-drawer ul li.active-link a');
  if (initialActiveViewLink) {
    initialActiveViewLink.click();
  } else {
    const firstLink = document.querySelector('.admin-drawer a[data-section-target]');
    if (firstLink) firstLink.click();
  }
  
  console.log("Admin.js: Painel Carregado e Scripts Prontos!");
}
// Disponibiliza a função principal globalmente
window.startAdminPanel = startAdminPanel;


function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) { existingToast.remove(); }
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('show'); }, 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { if (toast.parentElement) { toast.parentElement.removeChild(toast); } }, 500);
  }, 3000);
}
window.showToast = showToast;