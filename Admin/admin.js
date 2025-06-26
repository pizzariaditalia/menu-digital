// admin.js - VERSÃO FINAL CORRIGIDA SEM ALERTAS BLOQUEANTES

async function startAdminPanel() {
  console.log("Admin.js: startAdminPanel() iniciado.");

  const FIRESTORE_MENU_COLLECTION = "menus";
  const FIRESTORE_MENU_DOC_ID = "principal";
  const FIRESTORE_SETTINGS_COLLECTION = "configuracoes";
  const FIRESTORE_SETTINGS_DOC_ID = "mainSettings";

  const openDrawerButton = document.getElementById('open-drawer-menu');
  const closeDrawerButton = document.getElementById('close-drawer-menu');
  const drawerMenu = document.getElementById('admin-drawer-menu');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const drawerLinks = document.querySelectorAll('.admin-drawer ul li a');
  const adminViews = document.querySelectorAll('.admin-main-content .admin-view');

  const defaultMenuDataAdmin = {
    "pizzas-tradicionais": {
      name: "Pizzas Tradicionais",
      items: []
    }
  };
  const defaultAppSettings = {
    operatingHours: {},
    deliveryFees: {},
    storeInfo: {
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
    const menuDocRef = doc(window.db, FIRESTORE_MENU_COLLECTION, FIRESTORE_MENU_DOC_ID);
    try {
      const docSnap = await getDoc(menuDocRef);
      window.menuData = docSnap.exists() ? docSnap.data(): defaultMenuDataAdmin;
    } catch (error) {
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
    const settingsDocRef = doc(window.db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_SETTINGS_DOC_ID);
    try {
      const docSnap = await getDoc(settingsDocRef);
      window.appSettings = docSnap.exists() ? {
        ...defaultAppSettings,
        ...docSnap.data()
      }: defaultAppSettings;
    } catch (error) {
      window.appSettings = JSON.parse(JSON.stringify(defaultAppSettings));
    }
  }

  await initializeMenuData();
  await initializeAppSettings();

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
        case 'pdv-content':
          if (typeof window.initializePdvSection === 'function') window.initializePdvSection();
          break;
        case 'orders-content': if (typeof window.initializeOrdersSection === 'function') window.initializeOrdersSection(); break;
        case 'vendas-view': if (typeof window.initializeVendasSection === 'function') window.initializeVendasSection(); break;
        case 'customers-content': if (typeof window.initializeCustomersSection === 'function') window.initializeCustomersSection(); break;
        case 'promotions-content': if (typeof window.initializePromotionsSection === 'function') window.initializePromotionsSection(); break;
        case 'settings-content': if (typeof window.initializeSettingsSection === 'function') window.initializeSettingsSection(); break;
        case 'comunicados-view': if (typeof window.initializeComunicadosSection === 'function') window.initializeComunicadosSection(); break;
      }
      toggleDrawer(false);
    });
  });

  const initialActiveViewLink = document.querySelector('.admin-drawer ul li.active-link a');
  if (initialActiveViewLink) {
    initialActiveViewLink.click();
  } else {
    const firstLink = document.querySelector('.admin-drawer a[data-section-target]');
    if (firstLink) firstLink.click();
  }

  console.log("Admin.js: Painel Carregado e Scripts Prontos!");
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
window.showToast = showToast;

// Chama a função principal para iniciar o painel
startAdminPanel();
