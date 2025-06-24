// menu.js - VERSÃO 6.3 (DEFINITIVA E CORRIGIDA)

const FIRESTORE_MENU_COLLECTION_SITE = "menus";
const FIRESTORE_MENU_DOC_ID_SITE = "principal";
const FIRESTORE_SETTINGS_COLLECTION_SITE = "configuracoes";
const FIRESTORE_SETTINGS_DOC_ID_SITE = "mainSettings";
const FIRESTORE_PROMOTIONS_COLLECTION_SITE = "promotions";
const FIRESTORE_COUPONS_COLLECTION_SITE = "coupons";
const FIRESTORE_CRUSTS_COLLECTION_SITE = "stuffed_crusts";
var menuData = {}, appSettings = {}, promoData = [], activeCoupons = [], stuffedCrustData = [], carouselVideos = [];

function startTypingAnimation() {
  return new Promise((resolve) => {
    const textElement = document.getElementById('splash-text');
    if (!textElement) { resolve(); return; }
    const textToType = "SEJA BEM-VINDO";
    let i = 0;
    function type() {
      if (i < textToType.length) {
        textElement.innerHTML += textToType.charAt(i);
        i++;
        setTimeout(type, 200);
      } else { resolve(); }
    }
    setTimeout(type, 500);
  });
}

function applyCustomAppearance(appearanceSettings) {
  if (!appearanceSettings) return;
  const root = document.documentElement;
  const bannerImage = document.querySelector('.banner-image');
  const logoImage = document.querySelector('.restaurant-logo');
  if (appearanceSettings.primaryColor) root.style.setProperty('--primary-red', appearanceSettings.primaryColor);
  if (appearanceSettings.backgroundColor) root.style.setProperty('--light-gray', appearanceSettings.backgroundColor);
  if (appearanceSettings.logoUrl && logoImage) logoImage.src = appearanceSettings.logoUrl.replace('../', '');
  if (appearanceSettings.bannerUrl && bannerImage) bannerImage.src = appearanceSettings.bannerUrl.replace('../', '');
}

async function loadDataFromFirestore() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) loadingIndicator.style.display = 'block';
  if (!window.db || !window.firebaseFirestore) { console.error("Site: Firebase não está disponível."); if (loadingIndicator) loadingIndicator.textContent = 'Erro de conexão.'; return; }
  const { doc, getDoc, collection, getDocs, query, where } = window.firebaseFirestore;
  const db = window.db;
  try {
    const menuDocRef = doc(db, FIRESTORE_MENU_COLLECTION_SITE, FIRESTORE_MENU_DOC_ID_SITE);
    const settingsDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION_SITE, FIRESTORE_SETTINGS_DOC_ID_SITE); 
    const promotionsCollectionRef = collection(db, FIRESTORE_PROMOTIONS_COLLECTION_SITE);
    const crustsQuery = query(collection(db, FIRESTORE_CRUSTS_COLLECTION_SITE));
    const couponsQuery = query(collection(db, FIRESTORE_COUPONS_COLLECTION_SITE), where("active", "==", true));
    const [menuDocSnap, settingsDocSnap, promotionsSnap, crustsSnap, couponsSnap] = await Promise.all([ getDoc(menuDocRef), getDoc(settingsDocRef), getDocs(promotionsCollectionRef), getDocs(crustsQuery), getDocs(couponsQuery) ]);
    window.menuData = menuDocSnap.exists() ? menuDocSnap.data() : {};
    if (settingsDocSnap.exists()) {
        window.appSettings = settingsDocSnap.data();
        window.carouselVideos = settingsDocSnap.data().videos || [];
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

function generateCategoryUI() {
    const tabsContainer = document.querySelector('.tabs');
    const contentContainer = document.querySelector('.menu-content-inner');
    if (!tabsContainer || !contentContainer || !window.menuData) return;
    const preferredOrder = ['pizzas-tradicionais', 'pizzas-especiais', 'pizzas-doces', 'calzones-salgados', 'calzones-doces', 'bebidas'];
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    const allKeysFromFirebase = Object.keys(window.menuData);
    allKeysFromFirebase.sort((a, b) => {
        const keyBebidas = 'bebidas';
        if (a === keyBebidas) return 1; if (b === keyBebidas) return -1;
        const indexA = preferredOrder.indexOf(a); const indexB = preferredOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1; if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });
    allKeysFromFirebase.forEach(key => {
        const category = window.menuData[key];
        if (category && category.name && Array.isArray(category.items)) {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button'; tabButton.dataset.category = key; tabButton.textContent = category.name;
            tabsContainer.appendChild(tabButton);
            const categoryContentDiv = document.createElement('div');
            categoryContentDiv.id = `${key}-content`; categoryContentDiv.className = 'category-content';
            contentContainer.appendChild(categoryContentDiv);
        }
    });
}

function initializeDynamicCarousel() {
    const carouselContainer = document.getElementById('video-carousel-container');
    if (!carouselContainer || !window.carouselVideos || window.carouselVideos.length === 0) {
        if(carouselContainer) carouselContainer.style.display = 'none';
        return;
    }
    const slidesContainer = carouselContainer.querySelector('.carousel-slides');
    const dotsContainer = carouselContainer.querySelector('.carousel-dots');
    if (!slidesContainer || !dotsContainer) return;
    slidesContainer.innerHTML = ''; dotsContainer.innerHTML = '';
    window.carouselVideos.forEach(videoData => {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'video-slide';
        slideDiv.innerHTML = `<video src="${videoData.path}" autoplay loop muted playsinline></video>`;
        slidesContainer.appendChild(slideDiv);
    });
    carouselContainer.style.display = 'block';
    const slides = slidesContainer.querySelectorAll('.video-slide');
    if (slides.length <= 1) {
        if (slides.length === 1) slides[0].classList.add('active');
        dotsContainer.style.display = 'none'; return;
    }
    let currentSlide = 0; let slideInterval;
    slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.classList.add('dot');
        dot.addEventListener('click', () => { setSlide(index); resetInterval(); });
        dotsContainer.appendChild(dot);
    });
    const dots = dotsContainer.querySelectorAll('.dot');
    function setSlide(index) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    }
    function nextSlide() { currentSlide = (currentSlide + 1) % slides.length; setSlide(currentSlide); }
    function resetInterval() { clearInterval(slideInterval); slideInterval = setInterval(nextSlide, 7000); }
    if (slides.length > 0) {
        setSlide(0);
        resetInterval();
    }
}

function initializeSiteLogic() {
    if (window.appSettings?.appearance) applyCustomAppearance(window.appSettings.appearance);
    
    initializeDynamicCarousel();
    renderPromotions();
    generateCategoryUI();

    const tabs = document.querySelectorAll('.tab-button');
    const restaurantStatusDiv = document.querySelector('.status');
    const daysOfWeek = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const formatPrice = (price) => price != null ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
    
    function findItemAcrossCategories(itemId) {
        for (const key in window.menuData) {
            if(Object.prototype.hasOwnProperty.call(window.menuData, key)) {
                const item = window.menuData[key].items.find(i => i.id === itemId);
                if (item) return { ...item, category: key };
            }
        }
        return null;
    }

    function createPromoCardHTML(promo) {
        const imagePath = (promo.image || 'img/placeholder.png').replace('../', '');
        const discountPercentage = Math.round(((promo.originalPrice - promo.newPrice) / promo.originalPrice) * 100);
        return `<div class="promo-card-horizontal" data-item-id="${promo.itemId}">${discountPercentage > 0 ? `<div class="promo-discount-tag">-${discountPercentage}%</div>` : ''}<img src="${imagePath}" alt="${promo.name}" class="promo-card-image" onerror="this.onerror=null;this.src='img/placeholder.png';"><div class="promo-card-details"><h4>${promo.name}</h4><p class="promo-card-description">${promo.description || ''}</p><div class="promo-card-pricing"><span class="promo-price">${formatPrice(promo.newPrice)}</span><span class="original-price-text">${formatPrice(promo.originalPrice)}</span></div></div></div>`;
    }

    function renderPromotions() {
        const promoSection = document.getElementById('horizontal-promos-section');
        const promoListDiv = document.getElementById('horizontal-promos-list');
        if (!promoSection || !promoListDiv) return;
        const visiblePromos = window.promoData.filter(p => findItemAcrossCategories(p.itemId)?.isVisible !== false);
        if (visiblePromos.length > 0) {
            promoListDiv.innerHTML = visiblePromos.map(createPromoCardHTML).join('');
            promoSection.style.display = 'block';
            promoListDiv.querySelectorAll('.promo-card-horizontal').forEach(card => {
                card.addEventListener('click', () => {
                    const promotion = visiblePromos.find(p => p.itemId === card.dataset.itemId);
                    const originalItem = findItemAcrossCategories(card.dataset.itemId);
                    if (originalItem && promotion && window.openProductModal) {
                        window.openProductModal({ ...originalItem, price: promotion.newPrice, originalPrice: promotion.originalPrice, isPromotion: true });
                    }
                });
            });
        } else {
            promoSection.style.display = 'none';
        }
    }

    const minOrderLine = document.getElementById('min-order-line');
    if (minOrderLine && appSettings?.storeInfo?.minOrderValue > 0) {
        minOrderLine.querySelector('#min-order-value').textContent = formatPrice(appSettings.storeInfo.minOrderValue);
        minOrderLine.style.display = 'flex';
    }

    function createMenuItemHTML(item) {
        let priceHTML = item.originalPrice ? `<p class="item-description">De: <span class="original-price-text">${formatPrice(item.originalPrice)}</span></p><p class="promo-price">${formatPrice(item.price)}</p>` : `<p class="item-price">${formatPrice(item.price)}</p>`;
        const imagePath = (item.image || 'img/placeholder.png').replace('../', '');
        return `<div class="menu-item" data-item-id="${item.id}" data-category="${item.category || ''}"><img src="${imagePath}" alt="${item.name}" class="item-image"><div class="item-details"><h4>${item.name}</h4><p class="item-description">${item.description || ''}</p>${priceHTML}</div><button class="add-to-cart-button" data-item-id="${item.id}" data-category="${item.category || ''}">+</button></div>`;
    }

    function renderCategory(categoryName) {
        const contentDiv = document.getElementById(`${categoryName}-content`);
        if (!contentDiv) return;
        const items = window.menuData[categoryName]?.items || [];
        contentDiv.innerHTML = items.filter(item => item.isVisible !== false).map(item => createMenuItemHTML({ ...item, category: categoryName })).join('') || '<p style="text-align:center; color: #777; padding: 20px;">Nenhum item nesta categoria.</p>';
        attachAddToCartButtonListeners();
    }

    window.showCategory = (key) => {
        document.querySelectorAll('.category-content').forEach(c => c.style.display = 'none');
        const activeContent = document.getElementById(`${key}-content`);
        if (activeContent) activeContent.style.display = 'block';
        document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.tab-button[data-category="${key}"]`);
        if (activeTab) activeTab.classList.add('active');
    };

    function updateRestaurantStatus() {
        if (!restaurantStatusDiv || !appSettings.operatingHours) return;
        const now = new Date();
        const currentDayName = daysOfWeek[now.getDay()];
        const hoursStr = appSettings.operatingHours[currentDayName];
        let isOpen = false;
        if (hoursStr && hoursStr.toLowerCase() !== "fechado") {
            const [start, end] = hoursStr.split(' - ');
            const [startH, startM] = start.split(':').map(Number);
            const [endH, endM] = end.split(':').map(Number);
            const nowMins = now.getHours() * 60 + now.getMinutes();
            let startMins = startH * 60 + startM;
            let endMins = endH * 60 + endM;
            if (endMins <= startMins) endMins += 24 * 60;
            let nowMinsAdjusted = nowMins;
            if (nowMinsAdjusted < startMins) nowMinsAdjusted += 24 * 60;
            if (nowMinsAdjusted >= startMins && nowMinsAdjusted < endMins) isOpen = true;
        }
        restaurantStatusDiv.textContent = isOpen ? "ABERTO" : "FECHADO";
        restaurantStatusDiv.style.backgroundColor = isOpen ? "var(--green-status)" : "var(--primary-red)";
        document.querySelectorAll('.add-to-cart-button, #add-to-cart-modal-button, .checkout-button').forEach(btn => {
            btn.disabled = !isOpen;
        });
    }

    function attachAddToCartButtonListeners() {
        document.querySelectorAll('.add-to-cart-button').forEach(button => {
            const newBtn = button.cloneNode(true);
            button.parentNode.replaceChild(newBtn, button);
            newBtn.addEventListener('click', handleAddToCartClick);
        });
    }

    function handleAddToCartClick(event) {
        const btn = event.currentTarget;
        if (btn.disabled) return;
        const item = findItemAcrossCategories(btn.dataset.itemId);
        if (item) {
            if (item.category.includes('pizzas-') || item.name.toLowerCase().includes('pizza') || item.category.includes('calzones-')) {
                if (window.openProductModal) window.openProductModal(item);
            } else {
                if (window.addToCart) window.addToCart({ ...item, quantity: 1, unitPrice: item.price });
            }
        }
    }

    function initializeCouponsFeature() {
        const banner = document.getElementById('coupons-banner');
        const modal = document.getElementById('coupons-modal');
        if (!banner || !modal) return;
        if (window.activeCoupons && window.activeCoupons.length > 0) {
            banner.style.display = 'flex';
            banner.addEventListener('click', () => {
                renderCouponsInModal();
                modal.classList.add('show');
            });
            modal.querySelector('.close-button')?.addEventListener('click', () => modal.classList.remove('show'));
        }
    }

    function renderCouponsInModal() {
        const listContainer = document.getElementById('coupons-list');
        if (!listContainer) return;
        listContainer.innerHTML = window.activeCoupons.map(coupon => `<div class="coupon-card"><div class="coupon-info"><div class="coupon-header">${coupon.description}</div><div class="coupon-code">Código: <strong>${coupon.code}</strong></div></div><div class="coupon-actions"><button class="btn-apply-coupon" data-coupon-code="${coupon.code}">Aplicar</button></div></div>`).join('');
        listContainer.querySelectorAll('.btn-apply-coupon').forEach(button => {
            button.addEventListener('click', async (e) => {
                const result = await window.validateAndApplyCoupon(e.target.dataset.couponCode);
                if (result.success) {
                    alert('Cupom aplicado!');
                    document.getElementById('coupons-modal').classList.remove('show');
                    window.openCartModal();
                } else {
                    alert(`Erro: ${result.message}`);
                }
            });
        });
    }

    if (tabs.length > 0) {
        tabs.forEach(tab => tab.addEventListener('click', () => showCategory(tab.dataset.category)));
    }
    if (window.menuData && window.appSettings) {
        const allRenderedCategories = Array.from(tabs).map(tab => tab.dataset.category);
        allRenderedCategories.forEach(cat => renderCategory(cat));
        if (allRenderedCategories.length > 0) {
            showCategory(allRenderedCategories[0]);
        }
        updateRestaurantStatus();
        setInterval(updateRestaurantStatus, 60000);
        initializeCouponsFeature();
    }
    document.getElementById('loading-indicator')?.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const splashScreen = document.getElementById('splash-screen');
  Promise.all([startTypingAnimation(), loadDataFromFirestore()]).then(() => {
    setTimeout(() => {
      if (splashScreen) splashScreen.classList.add('hidden');
    }, 250);
  });
});
