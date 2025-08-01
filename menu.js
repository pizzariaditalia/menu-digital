// menu.js - VERSÃO COMPLETA COM FAVORITOS E OUTRAS FUNCIONALIDADES

// --- CONSTANTES DE COLEÇÕES DO FIRESTORE ---
const FIRESTORE_MENU_COLLECTION_SITE = "menus";
const FIRESTORE_MENU_DOC_ID_SITE = "principal";
const FIRESTORE_SETTINGS_COLLECTION_SITE = "configuracoes";
const FIRESTORE_SETTINGS_DOC_ID_SITE = "mainSettings";
const FIRESTORE_PROMOTIONS_COLLECTION_SITE = "promotions";
const FIRESTORE_COUPONS_COLLECTION_SITE = "coupons";
const FIRESTORE_CRUSTS_COLLECTION_SITE = "stuffed_crusts";
const CAROUSEL_SETTINGS_DOC_ID = "mainSettings";

// --- VARIÁVEIS GLOBAIS PARA ARMAZENAR DADOS ---
var menuData = {};
var appSettings = {};
var promoData = [];
var activeCoupons = [];
var stuffedCrustData = [];
var carouselVideos = [];

// ======================================================================
// LÓGICA DA ANIMAÇÃO DE TEXTO
// ======================================================================
function startTypingAnimation() {
  return new Promise((resolve) => {
    const textElement = document.getElementById('splash-text');
    if (!textElement) {
      resolve();
      return;
    }
    const textToType = "SEJA BEM-VINDO";
    let i = 0;
    function type() {
      if (i < textToType.length) {
        textElement.innerHTML += textToType.charAt(i);
        i++;
        setTimeout(type, 200);
      } else {
        resolve();
      }
    }
    setTimeout(type, 500);
  });
}

// ======================================================================
// LÓGICA DO CONTADOR DE VISITAS
// ======================================================================
async function logPageView() {
  if (sessionStorage.getItem('sessionLogged')) {
    console.log("Sessão já registrada. Não vou contar de novo.");
    return;
  }
  const executeLog = async () => {
    try {
      sessionStorage.setItem('sessionLogged', 'true');
      const {
        doc,
        setDoc,
        serverTimestamp,
        increment
      } = window.firebaseFirestore;
      const db = window.db;
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const analyticsDocRef = doc(db, 'analytics', dateString);
      await setDoc(analyticsDocRef, {
        page_views: increment(1),
        last_view: serverTimestamp()
      }, {
        merge: true
      });
      console.log('Sessão do usuário registrada com sucesso no Firestore.');
    } catch (error) {
      console.error('Erro final ao registrar a visualização da página:', error);
    }
  };
  const waitForFirebase = () => {
    if (window.firebaseFirestore && window.firebaseFirestore.increment) {
      executeLog();
    } else {
      setTimeout(waitForFirebase, 100);
    }
  };
  waitForFirebase();
}

// Função para aplicar as customizações de aparência
function applyCustomAppearance(appearanceSettings) {
  if (!appearanceSettings) return;

  const root = document.documentElement;
  const bannerImage = document.querySelector('.banner-image');
  const logoImage = document.querySelector('.restaurant-logo');

  // Função para carregar a fonte do Google dinamicamente
  function loadGoogleFont(fontName) {
      const fontId = `google-font-${fontName.replace(/\s+/g, '-')}`;
      if (document.getElementById(fontId)) return;

      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;700&display=swap`;
      document.head.appendChild(link);
  }

  // Aplica as cores (lógica sem alteração)
  if (appearanceSettings.primaryColor) root.style.setProperty('--primary-red', appearanceSettings.primaryColor);
  if (appearanceSettings.backgroundColor) root.style.setProperty('--light-gray', appearanceSettings.backgroundColor);
  if (appearanceSettings.cardBgColor) root.style.setProperty('--white', appearanceSettings.cardBgColor);
  if (appearanceSettings.mainTextColor) root.style.setProperty('--dark-gray', appearanceSettings.mainTextColor);
  if (appearanceSettings.secondaryTextColor) root.style.setProperty('--medium-gray', appearanceSettings.secondaryTextColor);

  // Aplica as imagens (lógica sem alteração)
  if (appearanceSettings.logoUrl && logoImage) logoImage.src = appearanceSettings.logoUrl.replace('../', '');
  if (appearanceSettings.bannerUrl && bannerImage) bannerImage.src = appearanceSettings.bannerUrl.replace('../', '');

  // --- CORREÇÃO APLICADA AQUI ---
  // Aplica a fonte diretamente no elemento 'body' para garantir a prioridade.
  if (appearanceSettings.mainFont) {
      loadGoogleFont(appearanceSettings.mainFont);
      // Em vez de 'root', aplicamos a fonte ao 'document.body'
      document.body.style.fontFamily = `'${appearanceSettings.mainFont}', sans-serif`;
  }
}

// ======================================================================
// LÓGICA DE CARREGAMENTO DE DADOS DO FIRESTORE
// ======================================================================

async function loadDataFromFirestore() {
  logPageView();
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) loadingIndicator.style.display = 'block';

  if (!window.db || !window.firebaseFirestore) {
    console.error("Site: Firebase não está disponível.");
    if (loadingIndicator) loadingIndicator.textContent = 'Erro de conexão.';
    return;
  }

  const { doc, getDoc, collection, getDocs, query, where } = window.firebaseFirestore;
  const db = window.db;

  try {
    const menuDocRef = doc(db, "menus", "principal");
    const settingsDocRef = doc(db, "configuracoes", "mainSettings");
    const promotionsCollectionRef = collection(db, "promotions");
    const crustsQuery = query(collection(db, "stuffed_crusts"));
    const couponsQuery = query(collection(db, "coupons"), where("active", "==", true));

    const [menuDocSnap, settingsDocSnap, promotionsSnap, crustsSnap, couponsSnap] = await Promise.all([
        getDoc(menuDocRef),
        getDoc(settingsDocRef),
        getDocs(promotionsCollectionRef),
        getDocs(crustsQuery),
        getDocs(couponsQuery)
      ]);

    window.menuData = menuDocSnap.exists() ? menuDocSnap.data(): {};
    if (settingsDocSnap.exists()) {
      window.appSettings = settingsDocSnap.data();
      window.carouselVideos = settingsDocSnap.data().videos || [];

      // --- CORREÇÃO ADICIONADA AQUI ---
      // Após carregar as configurações em window.appSettings,
      // chamamos a função para aplicar a aparência ao site.
      if (window.appSettings.appearance) {
          applyCustomAppearance(window.appSettings.appearance);
      }
      // --- FIM DA CORREÇÃO ---

    } else {
      window.appSettings = { operatingHours: {} };
      window.carouselVideos = [];
    }
    window.promoData = promotionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.stuffedCrustData = crustsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.activeCoupons = couponsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("Dados do site carregados.");
    initializeSiteLogic();

  } catch (error) {
    console.error("Site: Erro ao carregar dados do Firestore.", error);
    if (loadingIndicator) loadingIndicator.textContent = 'Não foi possível carregar o cardápio.';
  }
}

// ======================================================================
// FUNÇÕES DE GERAÇÃO DE INTERFACE E NOVAS FUNCIONALIDADES
// ======================================================================

function generateCategoryUI() {
  const tabsContainer = document.querySelector('.tabs');
  const contentContainer = document.querySelector('.menu-content-inner');

  if (!tabsContainer || !contentContainer || !window.menuData) {
    console.error("Não foi possível gerar a UI das categorias.");
    return;
  }

  const preferredOrder = ['pizzas-tradicionais',
    'pizzas-especiais',
    'pizzas-doces',
    'calzones-salgados',
    'calzones-doces',
    'bebidas'];
  tabsContainer.innerHTML = '';
  contentContainer.innerHTML = '';
  const allKeysFromFirebase = Object.keys(window.menuData);

  allKeysFromFirebase.sort((a, b) => {
    const keyBebidas = 'bebidas';
    if (a === keyBebidas) return 1;
    if (b === keyBebidas) return -1;
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  allKeysFromFirebase.forEach(key => {
    const category = window.menuData[key];
    if (category && category.name && Array.isArray(category.items)) {
      const tabButton = document.createElement('button');
      tabButton.className = 'tab-button';
      tabButton.dataset.category = key;
      tabButton.textContent = category.name;
      tabsContainer.appendChild(tabButton);

      const categoryContentDiv = document.createElement('div');
      categoryContentDiv.id = `${key}-content`;
      categoryContentDiv.className = 'category-content';
      contentContainer.appendChild(categoryContentDiv);
    }
  });
}

function renderDynamicCarousel() {
  const carouselContainer = document.getElementById('video-carousel-container');
  if (!carouselContainer || !window.carouselVideos || window.carouselVideos.length === 0) return;
  const slidesContainer = carouselContainer.querySelector('.carousel-slides');
  if (!slidesContainer) return;
  slidesContainer.innerHTML = '';
  window.carouselVideos.forEach(videoData => {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'video-slide';
    slideDiv.innerHTML = `<video src="${videoData.path}" autoplay loop muted playsinline></video>`;
    slidesContainer.appendChild(slideDiv);
  });
  if (slidesContainer.children.length > 0) {
    slidesContainer.children[0].classList.add('active');
  }
  carouselContainer.style.display = 'block';
}

function findItemAcrossCategories(itemId) {
  for (const categoryKey in window.menuData) {
    if (window.menuData[categoryKey] && window.menuData[categoryKey].items) {
      const foundItem = window.menuData[categoryKey].items.find(item => item.id === itemId);
      if (foundItem) {
        return {
          ...foundItem,
          category: categoryKey
        };
      }
    }
  }
  return null;
}

function createPromoCardHTML(promo) {
  const formatPrice = (price) => price && typeof price === 'number' ? price.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  }): String(price);
  const imagePath = (promo.image || 'img/placeholder.png').replace('../', '');
  const discountPercentage = Math.round(((promo.originalPrice - promo.newPrice) / promo.originalPrice) * 100);
  return `
  <div class="promo-card-horizontal" data-item-id="${promo.itemId}">
  ${discountPercentage > 0 ? `<div class="promo-discount-tag">-${discountPercentage}%</div>`: ''}
  <img src="${imagePath}" alt="${promo.name}" class="promo-card-image" onerror="this.onerror=null;this.src='img/placeholder.png';">
  <div class="promo-card-details">
  <h4>${promo.name}</h4>
  <p class="promo-card-description">${promo.description || ''}</p>
  <div class="promo-card-pricing">
  <span class="promo-price">${formatPrice(promo.newPrice)}</span>
  <span class="original-price-text">${formatPrice(promo.originalPrice)}</span>
  </div>
  </div>
  </div>`;
}

function renderPromotions() {
  const promoSection = document.getElementById('horizontal-promos-section');
  const promoListDiv = document.getElementById('horizontal-promos-list');
  if (!promoSection || !promoListDiv) return;
  const visiblePromotions = window.promoData.filter(p => p.active !== false && findItemAcrossCategories(p.itemId)?.isVisible !== false);
  if (visiblePromotions && visiblePromotions.length > 0) {
    promoListDiv.innerHTML = visiblePromotions.map(p => createPromoCardHTML(p)).join('');
    promoSection.style.display = 'block';
    promoListDiv.querySelectorAll('.promo-card-horizontal').forEach(card => {
      card.addEventListener('click', () => {
        const promotion = visiblePromotions.find(p => p.itemId === card.dataset.itemId);
        const originalItem = findItemAcrossCategories(card.dataset.itemId);
        if (originalItem && promotion && window.openProductModal) {
          window.openProductModal({
            ...originalItem, price: promotion.newPrice, originalPrice: promotion.originalPrice, isPromotion: true
          });
        }
      });
    });
  } else {
    promoSection.style.display = 'none';
  }
}

function setupOperatingHoursToggle() {
  const toggleButton = document.querySelector('.operating-hours');
  const detailsContainer = document.querySelector('.operating-hours-details');
  if (!toggleButton || !detailsContainer || !window.appSettings || !window.appSettings.operatingHours) {
    console.warn("Não foi possível inicializar a seção de horários de funcionamento.");
    return;
  }
  const hours = window.appSettings.operatingHours;
  const daysOrder = ["Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"];
  let hoursHtml = '<ul>';
  daysOrder.forEach(day => {
    if (hours[day]) {
      hoursHtml += `<li><span class="day">${day}</span><span class="time">${hours[day]}</span></li>`;
    }
  });
  hoursHtml += '</ul>';
  detailsContainer.innerHTML = hoursHtml;
  toggleButton.addEventListener('click',
    () => {
      toggleButton.classList.toggle('expanded');
      detailsContainer.classList.toggle('show');
    });
}

function initializeNotificationPrompt() {
  const promptModal = document.getElementById('notification-prompt-modal');
  if (!promptModal) return;
  const permissionStatus = Notification.permission;
  const hasBeenShown = sessionStorage.getItem('notificationPromptShown');
  if ('Notification' in window && permissionStatus === 'default' && !hasBeenShown) {
    setTimeout(() => {
      promptModal.classList.add('show');
      sessionStorage.setItem('notificationPromptShown', 'true');
    }, 5000);
  }
  const activateBtn = document.getElementById('prompt-activate-notifications-btn');
  const declineBtn = document.getElementById('prompt-decline-notifications-btn');
  const closeModal = () => promptModal.classList.remove('show');
  if (activateBtn) {
    activateBtn.addEventListener('click', () => {
      if (typeof requestNotificationPermission === 'function') {
        requestNotificationPermission();
      }
      closeModal();
    });
  }
  if (declineBtn) {
    declineBtn.addEventListener('click', closeModal);
  }
}

// --- LÓGICA DE FAVORITAR ITENS ---
async function handleFavoriteClick(event) {
  event.stopPropagation();
  const icon = event.currentTarget;
  const itemId = icon.dataset.itemId;

  if (!window.currentCustomerDetails) {
    alert("Você precisa fazer login para favoritar itens!");
    return;
  }

  const customerId = window.currentCustomerDetails.id;
  const {
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove
  } = window.firebaseFirestore;
  const customerRef = doc(window.db, "customer", customerId);

  const isFavorited = icon.classList.contains('fas');

  try {
    if (isFavorited) {
      await updateDoc(customerRef, {
        favoriteItems: arrayRemove(itemId)
      });
      icon.classList.remove('fas');
      icon.classList.add('far');
      window.currentCustomerDetails.favoriteItems = window.currentCustomerDetails.favoriteItems.filter(id => id !== itemId);
    } else {
      await updateDoc(customerRef, {
        favoriteItems: arrayUnion(itemId)
      });
      icon.classList.remove('far');
      icon.classList.add('fas');
      if (!window.currentCustomerDetails.favoriteItems) {
        window.currentCustomerDetails.favoriteItems = [];
      }
      window.currentCustomerDetails.favoriteItems.push(itemId);
    }
  } catch (error) {
    console.error("Erro ao atualizar favoritos:", error);
    alert("Ocorreu um erro ao salvar seu favorito. Tente novamente.");
  }
}

function updateFavoriteIcons() {
  if (!window.currentCustomerDetails || !window.currentCustomerDetails.favoriteItems) {
    document.querySelectorAll('.favorite-icon').forEach(icon => {
      icon.classList.remove('fas');
      icon.classList.add('far');
    });
    return;
  }
  const favoriteIds = new Set(window.currentCustomerDetails.favoriteItems);
  document.querySelectorAll('.favorite-icon').forEach(icon => {
    const itemId = icon.dataset.itemId;
    if (favoriteIds.has(itemId)) {
      icon.classList.remove('far');
      icon.classList.add('fas');
    } else {
      icon.classList.remove('fas');
      icon.classList.add('far');
    }
  });
}
window.updateFavoriteIcons = updateFavoriteIcons;

// ======================================================================
// FUNÇÃO DE LÓGICA PRINCIPAL DO SITE
// ======================================================================
function initializeSiteLogic() {
  if (window.appSettings && window.appSettings.appearance) {
    applyCustomAppearance(window.appSettings.appearance);
  }

  renderDynamicCarousel();
  if (typeof window.initializeCarousel === 'function') {
    window.initializeCarousel();
  }

  generateCategoryUI();

  const tabs = document.querySelectorAll('.tab-button');
  const restaurantStatusDiv = document.querySelector('.status');
  const daysOfWeek = ["Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"];

  const formatPrice = (price) => price && typeof price === 'number' ? price.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  }): String(price);

  const minOrderLine = document.getElementById('min-order-line');
  const minOrderValueSpan = document.getElementById('min-order-value');
  if (minOrderLine && minOrderValueSpan && window.appSettings?.storeInfo?.minOrderValue > 0) {
    const minOrderValue = window.appSettings.storeInfo.minOrderValue;
    minOrderValueSpan.textContent = formatPrice(minOrderValue);
    minOrderLine.style.display = 'flex';
  }

  function createMenuItemHTML(item) {
    let priceSectionHTML = item.originalPrice ? `<p class="item-description">De: <span class="original-price-text">${formatPrice(item.originalPrice)}</span></p><p class="promo-price">${formatPrice(item.price)}</p>`: `<p class="item-price">${formatPrice(item.price)}</p>`;
    let descriptionHTML = item.description ? `<p class="item-description">${item.description}</p>`: '';
    const imagePath = (item.image || 'img/placeholder.png').replace('../', '');
    return `
    <div class="menu-item" data-item-id="${item.id}" data-category="${item.category || ''}">
    <div class="favorite-icon-container">
    <i class="far fa-heart favorite-icon" data-item-id="${item.id}"></i>
    </div>
    <img src="${imagePath}" alt="${item.name}" class="item-image" onerror="this.onerror=null;this.src='img/placeholder.png';">
    <div class="item-details">
    <h4>${item.name}</h4>
    ${descriptionHTML}
    ${priceSectionHTML}
    </div>
    <button class="add-to-cart-button" data-item-id="${item.id}" data-category="${item.category || ''}">+</button>
    </div>`;
  }

  function renderCategory(categoryName) {
    const contentDiv = document.getElementById(`${categoryName}-content`);
    if (!contentDiv) return;
    const categoryData = window.menuData ? window.menuData[categoryName]: undefined;
    const items = categoryData ? categoryData.items: [];
    const visibleItems = items.filter(item => item.isVisible !== false);
    if (visibleItems && visibleItems.length > 0) {
      contentDiv.innerHTML = visibleItems.map(item => createMenuItemHTML( {
        ...item, category: item.category || categoryName
      })).join('');
    } else {
      contentDiv.innerHTML = '<p style="text-align:center; color: #777; padding: 20px;">Nenhum item nesta categoria.</p>';
    }
    attachAddToCartButtonListeners();
    document.querySelectorAll('.favorite-icon').forEach(icon => icon.addEventListener('click', handleFavoriteClick));
    updateFavoriteIcons();
    if (typeof initializeSearch === 'function') {
      initializeSearch();
    }
  }

  window.showCategory = function(categoryKey) {
    const allContent = document.querySelectorAll('.category-content');
    allContent.forEach(content => {
      content.style.display = 'none';
    });
    const activeContent = document.getElementById(`${categoryKey}-content`);
    if (activeContent) {
      activeContent.style.display = 'block';
    }
    tabs.forEach(tab => {
      tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.tab-button[data-category="${categoryKey}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
  };

  function updateRestaurantStatus() {
    if (!restaurantStatusDiv || !window.appSettings || !window.appSettings.operatingHours) return;
    const now = new Date();
    const currentDayName = daysOfWeek[now.getDay()];
    const operatingHoursStr = window.appSettings.operatingHours[currentDayName];
    let isOpen = false;
    if (operatingHoursStr && operatingHoursStr.toLowerCase() !== "fechado") {
      const parts = operatingHoursStr.split(' - ');
      if (parts.length === 2) {
        const [startHour,
          startMinute] = parts[0].split(':').map(Number);
        const [endHour,
          endMinute] = parts[1].split(':').map(Number);
        let startTimeTotalMinutes = startHour * 60 + startMinute;
        let endTimeTotalMinutes = endHour * 60 + endMinute;
        if (endTimeTotalMinutes <= startTimeTotalMinutes) endTimeTotalMinutes += 24 * 60;
        let currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
        if (currentTimeInMinutes < startTimeTotalMinutes) currentTimeInMinutes += 24 * 60;
        if (currentTimeInMinutes >= startTimeTotalMinutes && currentTimeInMinutes < endTimeTotalMinutes) isOpen = true;
      }
    }
    restaurantStatusDiv.textContent = isOpen ? "ABERTO": "FECHADO";
    restaurantStatusDiv.style.backgroundColor = isOpen ? "var(--green-status)": "var(--primary-red)";
    document.querySelectorAll('.add-to-cart-button, #add-to-cart-modal-button, #cart-modal .checkout-button').forEach(button => {
      button.disabled = !isOpen;
      if (!isOpen) {
        button.style.cursor = 'not-allowed';
      } else {
        button.style.cursor = '';
      }
    });
  }

  function attachAddToCartButtonListeners() {
    document.querySelectorAll('.add-to-cart-button').forEach(button => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      newButton.addEventListener('click', handleAddToCartClick);
    });
  }

  function handleAddToCartClick(event) {
    const button = event.currentTarget;
    if (button.disabled) return;
    const itemId = button.dataset.itemId;
    const category = button.dataset.category;
    const item = window.menuData[category]?.items.find(p => p.id === itemId);
    if (item) {
      const itemForInteraction = {
        ...item,
        category
      };
      if (itemForInteraction.category.includes('pizzas-') || item.name.toLowerCase().includes('pizza') || itemForInteraction.category.includes('calzones-')) {
        if (window.openProductModal) window.openProductModal(itemForInteraction);
      } else {
        if (window.addToCart) window.addToCart({
          id: item.id, name: item.name, image: item.image, price: item.price, quantity: 1, selectedSize: 'único', notes: '', unitPrice: item.price, category: item.category
        });
      }
    }
  }

  function initializeCouponsFeature() {
    const banner = document.getElementById('coupons-banner');
    const modal = document.getElementById('coupons-modal');
    if (!banner || !modal) return;
    const viewButton = document.getElementById('view-coupons-button');
    const closeButton = modal.querySelector('.close-button');
    if (window.activeCoupons && window.activeCoupons.length > 0) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
    const openModal = () => {
      renderCouponsInModal(); modal.classList.add('show'); document.body.style.overflow = 'hidden';
    };
    const closeModal = () => {
      modal.classList.remove('show'); document.body.style.overflow = '';
    };
    if (viewButton) viewButton.addEventListener('click', openModal);
    if (closeButton) closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }

  function renderCouponsInModal() {
    const listContainer = document.getElementById('coupons-list');
    if (!listContainer) return;
    if (!window.activeCoupons || window.activeCoupons.length === 0) {
      listContainer.innerHTML = '<p>Nenhum cupom de desconto disponível no momento.</p>';
      return;
    }
    listContainer.innerHTML = window.activeCoupons.map(coupon => `<div class="coupon-card"><div class="coupon-info"><div class="coupon-header">${coupon.description}</div><div class="coupon-code">Código: <strong>${coupon.code}</strong></div></div><div class="coupon-actions"><button class="btn-apply-coupon" data-coupon-code="${coupon.code}">Aplicar</button></div></div>`).join('');
    listContainer.querySelectorAll('.btn-apply-coupon').forEach(button => {
      button.addEventListener('click', async (event) => {
        const code = event.target.dataset.couponCode;
        if (typeof window.validateAndApplyCoupon === 'function') {
          const result = await window.validateAndApplyCoupon(code);
          if (result.success) {
            alert('Cupom aplicado com sucesso!');
            const modal = document.getElementById('coupons-modal');
            if (modal) modal.classList.remove('show');
            if (typeof window.openCartModal === 'function') window.openCartModal();
          } else {
            alert(`Não foi possível aplicar o cupom: ${result.message}`);
          }
        }
      });
    });
  }

  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => showCategory(tab.dataset.category));
    });
  }

  if (window.menuData && window.appSettings) {
    renderPromotions();
    const allRenderedCategories = Array.from(tabs).map(tab => tab.dataset.category);
    allRenderedCategories.forEach(cat => renderCategory(cat));
    if (allRenderedCategories.length > 0) {
      showCategory(allRenderedCategories[0]);
    }
    updateRestaurantStatus();
    setInterval(updateRestaurantStatus, 60000);
    initializeCouponsFeature();
    setupOperatingHoursToggle();
    initializeNotificationPrompt();
  }

  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// ======================================================================
// BLOCO DE INICIALIZAÇÃO SINCRONIZADO
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {
  const splashScreen = document.getElementById('splash-screen');
  const typingAnimationPromise = startTypingAnimation();
  const dataLoadingPromise = loadDataFromFirestore();
  Promise.all([typingAnimationPromise, dataLoadingPromise]).then(() => {
    console.log("Animação e carregamento de dados concluídos. Escondendo splash screen.");
    setTimeout(() => {
      if (splashScreen) {
        splashScreen.classList.add('hidden');
      }
    },
      250);
  });
});