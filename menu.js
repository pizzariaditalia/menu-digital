// menu.js - VERSÃO FINAL COMPLETA (COM CATEGORIAS DINÂMICAS E ORDEM FIXA)

// --- CONSTANTES DE COLEÇÕES DO FIRESTORE ---
const FIRESTORE_MENU_COLLECTION_SITE = "menus";
const FIRESTORE_MENU_DOC_ID_SITE = "principal";
const FIRESTORE_SETTINGS_COLLECTION_SITE = "configuracoes";
const FIRESTORE_SETTINGS_DOC_ID_SITE = "mainSettings";
const FIRESTORE_PROMOTIONS_COLLECTION_SITE = "promotions";
const FIRESTORE_COUPONS_COLLECTION_SITE = "coupons";
const FIRESTORE_CRUSTS_COLLECTION_SITE = "stuffed_crusts";

// --- VARIÁVEIS GLOBAIS PARA ARMAZENAR DADOS ---
var menuData = {};
var appSettings = {};
var promoData = [];
var activeCoupons = [];
var stuffedCrustData = [];

// ======================================================================
// LÓGICA DA ANIMAÇÃO DE TEXTO (RETORNA UMA PROMISE)
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

// Função para aplicar as customizações de aparência
function applyCustomAppearance(appearanceSettings) {
  if (!appearanceSettings) return;

  const root = document.documentElement;
  const bannerImage = document.querySelector('.banner-image');
  const logoImage = document.querySelector('.restaurant-logo');

  if (appearanceSettings.primaryColor) {
    root.style.setProperty('--primary-red', appearanceSettings.primaryColor);
  }
  if (appearanceSettings.backgroundColor) {
    root.style.setProperty('--light-gray', appearanceSettings.backgroundColor);
  }

  if (appearanceSettings.logoUrl && logoImage) {
    logoImage.src = appearanceSettings.logoUrl.replace('../', '');
  }
  if (appearanceSettings.bannerUrl && bannerImage) {
    bannerImage.src = appearanceSettings.bannerUrl.replace('../', '');
  }
}

/**
* @description Função principal que carrega todos os dados necessários do Firestore.
*/
async function loadDataFromFirestore() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) loadingIndicator.style.display = 'block';

  if (!window.db || !window.firebaseFirestore) {
    console.error("Site: Firebase não está disponível.");
    if (loadingIndicator) loadingIndicator.textContent = 'Erro de conexão.';
    return;
  }

  const {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
  } = window.firebaseFirestore;
  const db = window.db;

  try {
    console.log("Buscando todos os dados do site...");

    const menuDocRef = doc(db, FIRESTORE_MENU_COLLECTION_SITE, FIRESTORE_MENU_DOC_ID_SITE);
    const settingsDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION_SITE, FIRESTORE_SETTINGS_DOC_ID_SITE);
    const promotionsCollectionRef = collection(db, FIRESTORE_PROMOTIONS_COLLECTION_SITE);
    const crustsQuery = query(collection(db, FIRESTORE_CRUSTS_COLLECTION_SITE));
    const couponsQuery = query(collection(db, FIRESTORE_COUPONS_COLLECTION_SITE), where("active", "==", true));

    await Promise.all([
      getDoc(menuDocRef),
      getDoc(settingsDocRef),
      getDocs(promotionsCollectionRef),
      getDocs(crustsQuery),
      getDocs(couponsQuery)
    ]).then(([menuDocSnap, settingsDocSnap, promotionsSnap, crustsSnap, couponsSnap]) => {
      window.menuData = menuDocSnap.exists() ? menuDocSnap.data(): {};
      window.appSettings = settingsDocSnap.exists() ? settingsDocSnap.data(): {
        operatingHours: {}
      };
      window.promoData = promotionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      window.stuffedCrustData = crustsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      window.activeCoupons = couponsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    });

    console.log("Dados carregados com sucesso. Inicializando a lógica do site.");
    initializeSiteLogic();

  } catch (error) {
    console.error("Site: Erro ao carregar dados do Firestore.", error);
    if (loadingIndicator) loadingIndicator.textContent = 'Não foi possível carregar o cardápio.';
  }
}

// ======================================================================
// FUNÇÃO PARA GERAR A INTERFACE DAS CATEGORIAS (COM ORDEM FIXA)
// ======================================================================
/**
* @description (VERSÃO 3.0 - CORRIGIDA) Cria dinamicamente as abas de navegação e os contêineres de conteúdo,
* forçando uma ordem pré-definida e inserindo novas categorias automaticamente no lugar certo.
*/
function generateCategoryUI() {
  const tabsContainer = document.querySelector('.tabs');
  const contentContainer = document.querySelector('.menu-content-inner');

  if (!tabsContainer || !contentContainer || !window.menuData) {
    console.error("Não foi possível gerar a UI das categorias.");
    return;
  }

  // 1. Defina a ordem preferida. Note que "Bebidas" está aqui para referência, mas será tratada separadamente para sempre ficar por último.
  const preferredOrder = [
    'pizzas-tradicionais',
    'pizzas-especiais',
    'pizzas-doces',
    'calzones-salgados',
    'calzones-doces',
    'bebidas' // Chave da categoria que deve ficar por último
  ];

  tabsContainer.innerHTML = '';
  contentContainer.innerHTML = '';

  // 2. Pega todas as categorias que vieram do Firebase
  const allKeysFromFirebase = Object.keys(window.menuData);

  // 3. LÓGICA DE ORDENAÇÃO CORRIGIDA E MAIS ROBUSTA
  allKeysFromFirebase.sort((a, b) => {
    const keyBebidas = 'bebidas';

    // Regra 1: "Bebidas" sempre vai para o final
    if (a === keyBebidas) return 1;
    if (b === keyBebidas) return -1;

    // Pega a posição de cada item na lista de preferência
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);

    // Regra 2: Se ambos estão na lista, ordena pela posição na lista
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // Regra 3: Se apenas um está na lista, ele vem primeiro
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // Regra 4: Se nenhum está na lista (são "novas categorias"), ordena em ordem alfabética
    return a.localeCompare(b);
  });

  // 4. Cria os elementos HTML na ordem final e correta
  allKeysFromFirebase.forEach(key => {
    const category = window.menuData[key];
    if (category && category.name && Array.isArray(category.items)) {
      // Cria o botão da aba
      const tabButton = document.createElement('button');
      tabButton.className = 'tab-button';
      tabButton.dataset.category = key;
      tabButton.textContent = category.name;
      tabsContainer.appendChild(tabButton);

      // Cria o div para o conteúdo da categoria
      const categoryContentDiv = document.createElement('div');
      categoryContentDiv.id = `${key}-content`;
      categoryContentDiv.className = 'category-content';
      contentContainer.appendChild(categoryContentDiv);
    }
  });
}


// ======================================================================
// FUNÇÃO DE LÓGICA DO SITE ATUALIZADA E COMPLETA
// ======================================================================
/**
* @description Inicializa toda a lógica da interface do site após o carregamento dos dados.
*/
function initializeSiteLogic() {
  if (window.appSettings && window.appSettings.appearance) {
    applyCustomAppearance(window.appSettings.appearance);
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
    style: 'currency',
    currency: 'BRL'
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
    return `<div class="menu-item" data-item-id="${item.id}" data-category="${item.category || ''}"><img src="${imagePath}" alt="${item.name}" class="item-image" onerror="this.onerror=null;this.src='img/placeholder.png';"><div class="item-details"><h4>${item.name}</h4>${descriptionHTML}${priceSectionHTML}</div><button class="add-to-cart-button" data-item-id="${item.id}" data-category="${item.category || ''}">+</button></div>`;
  };

  function renderCategory(categoryName) {
    const contentDiv = document.getElementById(`${categoryName}-content`);
    if (!contentDiv) return;

    const categoryData = window.menuData ? window.menuData[categoryName]: undefined;
    const items = categoryData ? categoryData.items: [];
    const visibleItems = items.filter(item => item.isVisible !== false);

    if (visibleItems && visibleItems.length > 0) {
      contentDiv.innerHTML = visibleItems.map(item => createMenuItemHTML( {
        ...item,
        category: item.category || categoryName
      })).join('');
    } else {
      contentDiv.innerHTML = '<p style="text-align:center; color: #777; padding: 20px;">Nenhum item nesta categoria.</p>';
    }
    attachAddToCartButtonListeners();
  };

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
    const statusAlert = document.getElementById('store-status-alert');
    if (!restaurantStatusDiv || !window.appSettings || !window.appSettings.operatingHours) return;

    const now = new Date();
    const currentDayName = daysOfWeek[now.getDay()];
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
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
        let currentTimeAdjusted = currentTimeInMinutes;
        if (currentTimeAdjusted < startTimeTotalMinutes) currentTimeAdjusted += 24 * 60;
        if (currentTimeAdjusted >= startTimeTotalMinutes && currentTimeAdjusted < endTimeTotalMinutes) isOpen = true;
      }
    }

    restaurantStatusDiv.textContent = isOpen ? "ABERTO": "FECHADO";
    restaurantStatusDiv.style.backgroundColor = isOpen ? "var(--green-status)": "var(--primary-red)";

    document.querySelectorAll('.add-to-cart-button, #add-to-cart-modal-button, #cart-modal .checkout-button').forEach(button => {
      button.disabled = !isOpen;
      if (!isOpen) {
        button.style.backgroundColor = 'var(--medium-gray)';
        button.style.cursor = 'not-allowed';
        if (button.classList.contains('add-to-cart-button')) {
          button.style.display = 'none';
        }
        if (button.classList.contains('checkout-button')) {
          button.textContent = "Restaurante Fechado";
        }
      } else {
        button.style.backgroundColor = '';
        button.style.cursor = '';
        if (button.classList.contains('add-to-cart-button')) {
          button.style.display = '';
        }
        if (button.classList.contains('checkout-button')) {
          button.textContent = "Finalizar Pedido";
        }
      }
    });

    if (statusAlert) {
      if (!isOpen) {
        if (!statusAlert.classList.contains('show')) {
          statusAlert.classList.add('show');
          setTimeout(() => {
            statusAlert.classList.remove('show');
          }, 2000);
        }
      } else {
        statusAlert.classList.remove('show');
      }
    }
  };

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
    let item = null;
    if (window.menuData && window.menuData[category] && window.menuData[category].items) {
      item = window.menuData[category].items.find(p => p.id === itemId);
    }
    if (item) {
      const itemForInteraction = {
        ...item,
        category: category
      };
      if (itemForInteraction.category.includes('pizzas-') || (item.name && item.name.toLowerCase().includes('pizza'))) {
        if (window.openProductModal) window.openProductModal(itemForInteraction);
      } else {
        if (window.addToCart) {
          window.addToCart({
            id: item.id,
            name: item.name,
            image: item.image,
            price: item.price,
            quantity: 1,
            selectedSize: 'único',
            notes: '',
            unitPrice: item.price,
            category: item.category
          });
        }
      }
    }
  }

  function createPromoCardHTML(promo) {
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
    </div>
    `;
  };

  function findItemAcrossCategories(itemId) {
    for (const categoryKey in window.menuData) {
      const category = window.menuData[categoryKey];
      if (category && Array.isArray(category.items)) {
        const foundItem = category.items.find(item => item.id === itemId);
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

  function renderPromotions() {
    const promoSection = document.getElementById('horizontal-promos-section');
    const promoListDiv = document.getElementById('horizontal-promos-list');

    if (!promoSection || !promoListDiv) return;

    const visiblePromotions = window.promoData.filter(promo => {
      const originalItem = findItemAcrossCategories(promo.itemId);
      return originalItem && originalItem.isVisible !== false;
    });

    if (visiblePromotions && visiblePromotions.length > 0) {
      promoListDiv.innerHTML = visiblePromotions.map(createPromoCardHTML).join('');
      promoSection.style.display = 'block';

      promoListDiv.querySelectorAll('.promo-card-horizontal').forEach(card => {
        card.addEventListener('click', () => {
          const itemId = card.dataset.itemId;
          const promotion = visiblePromotions.find(p => p.itemId === itemId);
          const originalItem = findItemAcrossCategories(itemId);

          if (originalItem && promotion && typeof window.openProductModal === 'function') {
            window.openProductModal({
              ...originalItem,
              price: promotion.newPrice,
              originalPrice: promotion.originalPrice,
              category: originalItem.category,
              isPromotion: true
            });
          }
        });
      });
    } else {
      promoSection.style.display = 'none';
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
      renderCouponsInModal();
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    };

    banner.addEventListener('click', openModal);
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

    listContainer.innerHTML = window.activeCoupons.map(coupon => {
      return `
      <div class="coupon-card">
      <div class="coupon-header">${coupon.description}</div>
      <div class="coupon-code">Código de desconto: <strong>${coupon.code}</strong></div>
      <div class="coupon-expiry">Use no checkout para validar seu desconto.</div>
      </div>
      `;
    }).join('');
  }

  // --- EXECUÇÃO DA LÓGICA DE UI ---
  // Adiciona os listeners para as novas abas dinâmicas
  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => showCategory(tab.dataset.category));
    });
  }

  // Renderiza o conteúdo e exibe a primeira categoria
  if (window.menuData && window.appSettings) {
    renderPromotions();
    const categoryKeys = Object.keys(window.menuData); // Pega as chaves novamente
    categoryKeys.forEach(cat => renderCategory(cat));
    if (categoryKeys.length > 0) {
      // Usa a primeira chave da lista final ordenada (se disponível) ou a primeira chave dos dados
      const finalOrder = document.querySelector('.tab-button')?.dataset.category || categoryKeys[0];
      showCategory(finalOrder);
    }
    updateRestaurantStatus();
    setInterval(updateRestaurantStatus, 60000);
    initializeCouponsFeature();
  }

  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) loadingIndicator.style.display = 'none';
}


// ======================================================================
// NOVO BLOCO DE INICIALIZAÇÃO SINCRONIZADO
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
