// Arquivo: pdv.js
// VERSÃO ATUALIZADA PARA BUSCAR BORDAS RECHEADAS DO FIRESTORE

// --- Dados e Variáveis de Estado ---
let allCustomers = [], allDeliveryFees = {};
let allStuffedCrusts = []; // Variável para bordas dinâmicas
let currentPdvOrder = {
  customer: null,
  items: [],
  deliveryFee: 0,
  discount: 0,
  payment: null,
  totals: {},
  orderType: 'Delivery'
};

let searchResultsContainer = null;
let currentPizza = {}, selectedHalf2 = null, selectedStuffedCrust = null, currentPizzaModalPrice = 0;
let activePromotions = [];
let pdvAvailableCoupons = [];
let pdvAppliedDiscount = null;
let listenersAttached = false;
let pdvSectionInitialized = false;

// --- Seletores de Elementos do DOM ---
let startNewPdvOrderBtn, pdvInitialStateDiv, pdvOrderCreationView;

const PDV_DISCOUNT_TIERS = [{
  points: 20,
  percentage: 0.20,
  label: "20% de desconto em pizzas"
},
  {
    points: 16,
    percentage: 0.15,
    label: "15% de desconto em pizzas"
  },
  {
    points: 12,
    percentage: 0.10,
    label: "10% de desconto em pizzas"
  },
  {
    points: 8,
    percentage: 0.05,
    label: "5% de desconto em pizzas"
  }];

async function openPdvNewOrderView() {
  console.log("PDV: Abrindo a tela de criação de novo pedido...");
  if (!pdvInitialStateDiv || !pdvOrderCreationView) {
    pdvInitialStateDiv = document.getElementById('pdv-initial-state');
    pdvOrderCreationView = document.getElementById('pdv-order-creation-view');
  }
  pdvInitialStateDiv.classList.add('hidden');
  pdvOrderCreationView.classList.remove('hidden');
  bindCreationViewListeners();
  await loadInitialData();
  resetPdvForm();
}
window.openPdvNewOrderView = openPdvNewOrderView;

function initializePdvSection() {
  if (pdvSectionInitialized) {
    return;
  }
  pdvSectionInitialized = true;
  console.log("Módulo PDV.js: Inicializando seção.");
  startNewPdvOrderBtn = document.getElementById('start-new-pdv-order');
  pdvInitialStateDiv = document.getElementById('pdv-initial-state');
  pdvOrderCreationView = document.getElementById('pdv-order-creation-view');
  if (startNewPdvOrderBtn) {
    startNewPdvOrderBtn.addEventListener('click', openPdvNewOrderView);
  }
}

async function loadInitialData() {
  if (!window.db || !window.firebaseFirestore) {
    console.error("PDV: Conexão com Firestore não disponível."); return;
  }
  const {
    collection,
    getDocs,
    query,
    where,
    orderBy
  } = window.firebaseFirestore;
  try {
    const [customersSnap,
      feesSnap,
      couponsSnap,
      peopleSnap,
      promotionsSnap,
      crustsSnap] = await Promise.all([
        getDocs(collection(window.db, "customer")),
        getDocs(collection(window.db, "delivery_fees")),
        getDocs(query(collection(window.db, "coupons"), where("active", "==", true))),
        getDocs(collection(window.db, "delivery_people")),
        getDocs(collection(window.db, "promotions")),
        getDocs(query(collection(window.db, "stuffed_crusts"), orderBy("price")))
      ]);
    allCustomers = customersSnap.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    allDeliveryFees = feesSnap.docs.reduce((acc, doc) => {
      acc[doc.data().name] = doc.data().fee; return acc;
    }, {});
    pdvAvailableCoupons = couponsSnap.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    window.allDeliveryPeople = peopleSnap.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    activePromotions = promotionsSnap.docs.map(doc => doc.data());
    window.allStuffedCrusts = crustsSnap.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    populateDeliveryPeopleDropdown();
  } catch (error) {
    console.error("PDV: Erro ao carregar dados iniciais:", error); window.showToast("Erro ao carregar dados do PDV.", "error");
  }
}

function renderStuffedCrustOptions() {
  const stuffedCrustListDiv = document.getElementById('pdv-stuffed-crust-type-list');
  if (!stuffedCrustListDiv) return;

  const crusts = window.allStuffedCrusts || [];
  stuffedCrustListDiv.innerHTML = `<div class="option-group"><label class="option-label"><input type="radio" name="pdv-stuffed-crust" value="none" data-price="0" checked> Sem Borda Adicional</label></div>`
  + crusts.map(c => `<div class="option-group"><label class="option-label"><input type="radio" name="pdv-stuffed-crust" value="${c.id}" data-price="${c.price}"> ${c.name} <span class="option-price">+ R$ ${c.price.toFixed(2)}</span></label></div>`).join('');

  stuffedCrustListDiv.querySelectorAll('input[name="pdv-stuffed-crust"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const price = parseFloat(radio.dataset.price);
      if (price > 0) {
        const crustData = crusts.find(c => c.id === radio.value);
        selectedStuffedCrust = crustData ? {
          id: crustData.id,
          name: crustData.name,
          price: crustData.price
        }: null;
      } else {
        selectedStuffedCrust = null;
      }
      updatePizzaModalPrice();
    });
  });
}

function returnToInitialState(forceReset = false) {
  if (forceReset || !currentPdvOrder.items || currentPdvOrder.items.length === 0 || confirm("Tem certeza que deseja cancelar este pedido?")) {
    if (pdvInitialStateDiv) pdvInitialStateDiv.classList.remove('hidden');
    if (pdvOrderCreationView) pdvOrderCreationView.classList.add('hidden');
    resetPdvForm();
  }
}

function resetPdvForm() {
  const customerSearchInput = document.getElementById('pdv-customer-search');
  if (customerSearchInput) customerSearchInput.value = '';
  document.getElementById('pdv-customer-details-container').classList.add('hidden');
  document.getElementById('pdv-customer-address-display').innerHTML = '';
  document.getElementById('pdv-delivery-person').value = '';
  document.getElementById('pdv-cart-items').innerHTML = '<p class="empty-cart-text">Adicione produtos ao pedido</p>';
  document.getElementById('pdv-order-notes').value = '';
  document.getElementById('pdv-payment-method').value = '';
  document.getElementById('pdv-change-for-container').classList.add('hidden');
  document.getElementById('pdv-pix-status-container').classList.add('hidden');
  document.getElementById('pdv-change-for').value = '';
  const pixStatusRadios = document.querySelectorAll('input[name="pix-status"]');
  if (pixStatusRadios.length > 0) pixStatusRadios[0].checked = true;
  const applyDiscountBtn = document.getElementById('pdv-apply-discount-btn');
  if (applyDiscountBtn) applyDiscountBtn.disabled = true;
  const deliveryRadio = document.querySelector('input[name="pdv-order-type"][value="Delivery"]');
  if (deliveryRadio) deliveryRadio.checked = true;

  currentPdvOrder = {
    customer: null,
    items: [],
    deliveryFee: 0,
    discount: 0,
    payment: null,
    totals: {},
    orderType: 'Delivery'
  };

  pdvAppliedDiscount = null;
  if (searchResultsContainer) searchResultsContainer.remove();
  searchResultsContainer = null;

  handleOrderTypeChange();
  updatePaymentStatusUI();
}

function handleOrderTypeChange() {
  const orderTypeRadio = document.querySelector('input[name="pdv-order-type"]:checked');
  if (!orderTypeRadio) return;
  const orderType = orderTypeRadio.value;
  const deliveryFeeLine = document.getElementById('pdv-delivery-fee-line');
  const deliveryPersonGroup = document.getElementById('pdv-delivery-person-group');
  currentPdvOrder.orderType = orderType;
  if (orderType === 'Delivery') {
    deliveryFeeLine.style.display = 'flex';
    deliveryPersonGroup.style.display = 'block';
    currentPdvOrder.deliveryFee = (currentPdvOrder.customer && currentPdvOrder.customer.address) ? (allDeliveryFees[currentPdvOrder.customer.address.neighborhood] || 0): 0;
  } else {
    deliveryFeeLine.style.display = 'none';
    deliveryPersonGroup.style.display = 'none';
    currentPdvOrder.deliveryFee = 0;
  }
  updateTotalsUI();
}

function populateDeliveryPeopleDropdown() {
  const deliveryPersonSelect = document.getElementById('pdv-delivery-person');
  if (!deliveryPersonSelect) return;
  deliveryPersonSelect.innerHTML = '<option value="">Não atribuir</option>';
  if (window.allDeliveryPeople && Array.isArray(window.allDeliveryPeople)) {
    window.allDeliveryPeople.forEach(person => {
      const option = new Option(`${person.firstName} ${person.lastName}`, person.id);
      deliveryPersonSelect.appendChild(option);
    });
  }
}

function updateTotalsUI() {
  const subtotal = currentPdvOrder.items.reduce((sum, item) => sum + item.price, 0);
  const deliveryFee = currentPdvOrder.deliveryFee || 0;
  let discountValue = 0;
  if (pdvAppliedDiscount) {
    if (pdvAppliedDiscount.type === 'points') {
      const eligibleTotal = currentPdvOrder.items.reduce((total, item) => {
        if (item.category && item.category.includes('pizzas')) {
          return total + item.price;
        }
        return total;
      },
        0);
      discountValue = eligibleTotal * pdvAppliedDiscount.source.percentage;
    } else if (pdvAppliedDiscount.type === 'coupon') {
      if (pdvAppliedDiscount.source.type === 'percentage') {
        discountValue = subtotal * (pdvAppliedDiscount.source.value / 100);
      } else {
        discountValue = pdvAppliedDiscount.source.value;
      }
    }
  }
  currentPdvOrder.totals = {
    subtotal,
    deliveryFee,
    discountValue,
    grandTotal: subtotal + deliveryFee - discountValue
  };
  document.getElementById('pdv-subtotal').previousElementSibling.textContent = `Subtotal Produtos (${currentPdvOrder.items.reduce((acc, item) => acc + item.quantity, 0)})`;
  document.getElementById('pdv-subtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('pdv-delivery-fee').textContent = `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`;
  document.getElementById('pdv-total').textContent = `R$ ${Math.max(0, currentPdvOrder.totals.grandTotal).toFixed(2).replace('.', ',')}`;
  const discountLine = document.getElementById('pdv-discount-line');
  discountLine.style.display = discountValue > 0 ? 'flex': 'none';
  if (discountValue > 0) document.getElementById('pdv-discount-amount').textContent = `- R$ ${discountValue.toFixed(2).replace('.', ',')}`;
}

function handleCustomerSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  if (searchTerm.length < 2) {
    hideSearchResults(); return;
  }
  const filteredCustomers = allCustomers.filter(c => ((c.firstName + " " + c.lastName).toLowerCase().includes(searchTerm)) || (c.whatsapp && c.whatsapp.includes(searchTerm)));
  displaySearchResults(filteredCustomers);
}

function displaySearchResults(customers) {
  const customerSearchInput = document.getElementById('pdv-customer-search');
  if (!searchResultsContainer) {
    searchResultsContainer = document.createElement('div');
    searchResultsContainer.className = 'pdv-search-results';
    customerSearchInput.closest('.form-group').appendChild(searchResultsContainer);
  }
  searchResultsContainer.innerHTML = customers.length === 0 ? '<div class="pdv-search-result-item no-results">Nenhum cliente encontrado.</div>': customers.map(c => `<div class="pdv-search-result-item" data-customer-id="${c.id}"><span class="name">${c.firstName} ${c.lastName}</span><span class="whatsapp">${c.whatsapp}</span></div>`).join('');
  searchResultsContainer.querySelectorAll('.pdv-search-result-item:not(.no-results)').forEach(item => {
    item.addEventListener('click', () => {
      selectCustomer(allCustomers.find(c => c.id === item.dataset.customerId));
    });
  });
  searchResultsContainer.classList.add('active');
}

function hideSearchResults() {
  if (searchResultsContainer) {
    searchResultsContainer.classList.remove('active');
  }
}

function selectCustomer(customer) {
  if (!customer) return;
  currentPdvOrder.customer = customer;
  document.getElementById('pdv-customer-search').value = `${customer.firstName} ${customer.lastName}`;
  document.getElementById('pdv-apply-discount-btn').disabled = false;
  if (customer.address && customer.address.street) {
    const deliveryRadio = document.querySelector('input[name="pdv-order-type"][value="Delivery"]'); if (deliveryRadio) deliveryRadio.checked = true;
  }
  handleOrderTypeChange();
  displayCustomerAddress(customer.address);
  document.getElementById('pdv-customer-details-container').classList.remove('hidden');
  hideSearchResults();
}

function displayCustomerAddress(address) {
  const addr = address || {};
  const fullAddress = [addr.street,
    addr.number].filter(Boolean).join(', ');
  const details = [addr.neighborhood,
    addr.complement].filter(Boolean).join(' - ');
  document.getElementById('pdv-customer-address-display').innerHTML = `<p><strong>Endereço:</strong> ${fullAddress || 'Não cadastrado'}</p><p><strong>Detalhes:</strong> ${details || 'Não cadastrado'}</p>${addr.reference ? `<p><strong>Referência:</strong> ${addr.reference}</p>`: ''}`;
  if (currentPdvOrder.orderType === 'Delivery') {
    currentPdvOrder.deliveryFee = allDeliveryFees[addr.neighborhood] || 0;
  } else {
    currentPdvOrder.deliveryFee = 0;
  }
  updateTotalsUI();
}

function openNewCustomerModal() {
  const newCustomerForm = document.getElementById('pdv-new-customer-form');
  const customerSearchInput = document.getElementById('pdv-customer-search');
  const newCustomerNeighborhoodSelect = document.getElementById('new-customer-neighborhood');
  const newCustomerModal = document.getElementById('pdv-new-customer-modal');
  newCustomerForm.reset();
  const searchTerm = customerSearchInput.value.trim();
  if (/^\d{10,11}$/.test(searchTerm)) {
    document.getElementById('new-customer-whatsapp').value = searchTerm;
  } else {
    document.getElementById('new-customer-firstname').value = searchTerm;
  }
  newCustomerNeighborhoodSelect.innerHTML = '<option value="" disabled selected>Selecione o bairro...</option>';
  const sortedNeighborhoods = Object.keys(allDeliveryFees).sort();
  sortedNeighborhoods.forEach(name => {
    const fee = allDeliveryFees[name];
    const option = new Option(`${name} (+ R$ ${fee.toFixed(2).replace('.', ',')})`, name);
    newCustomerNeighborhoodSelect.appendChild(option);
  });
  newCustomerModal.classList.add('show');
}

function closeNewCustomerModal() {
  document.getElementById('pdv-new-customer-modal').classList.remove('show');
}

function handleSaveNewCustomer(event) {
  event.preventDefault();
  const whatsapp = document.getElementById('new-customer-whatsapp').value.trim().replace(/\D/g, '');
  if (!whatsapp) {
    return window.showToast("O campo WhatsApp é obrigatório.", "error");
  }
  const newCustomerData = {
    id: whatsapp,
    whatsapp: whatsapp,
    firstName: document.getElementById('new-customer-firstname').value.trim(),
    lastName: document.getElementById('new-customer-lastname').value.trim(),
    address: {
      street: document.getElementById('new-customer-street').value.trim(),
      number: document.getElementById('new-customer-number').value.trim(),
      neighborhood: document.getElementById('new-customer-neighborhood').value,
      complement: document.getElementById('new-customer-complement').value.trim(),
      reference: document.getElementById('new-customer-reference').value.trim()
    },
    points: 0,
    isNew: true
  };
  selectCustomer(newCustomerData);
  closeNewCustomerModal();
}

function openPdvProductModal() {
  const productSelectionModal = document.getElementById('product-selection-modal');
  if (!productSelectionModal || !window.menuData) return;
  renderPdvProductList();
  populateCategoryFilter();
  productSelectionModal.classList.add('show');
}

function closePdvProductModal() {
  const productSelectionModal = document.getElementById('product-selection-modal');
  if (productSelectionModal) productSelectionModal.classList.remove('show');
}

function populateCategoryFilter() {
  const productCategoryFilter = document.getElementById('product-category-filter');
  if (!window.menuData || !productCategoryFilter) return;
  productCategoryFilter.innerHTML = '<option value="">Todas as Categorias</option>';
  Object.keys(window.menuData).forEach(catKey => {
    const option = new Option(window.menuData[catKey].name, catKey);
    productCategoryFilter.appendChild(option);
  });
}

function renderPdvProductList(filter = '') {
  const productListContainer = document.getElementById('product-list-container');
  if (!window.menuData) {
    productListContainer.innerHTML = "<p>Cardápio não carregado.</p>"; return;
  }
  let allItems = [];
  const categoriesToRender = filter ? [filter]: Object.keys(window.menuData);
  categoriesToRender.forEach(catKey => {
    if (window.menuData[catKey] && window.menuData[catKey].items) {
      allItems.push(...window.menuData[catKey].items.map(item => ({
        ...item, category: catKey
      })));
    }
  });
  productListContainer.innerHTML = allItems.length > 0 ? allItems.map(item => {
    const promotion = activePromotions.find(p => p.itemId === item.id);
    const price = promotion ? promotion.newPrice: item.price;
    let priceHTML = `<div class="item-price">R$ ${price.toFixed(2).replace('.', ',')}</div>`;
    if (promotion) {
      priceHTML = `<div class="item-price promo">R$ ${price.toFixed(2).replace('.', ',')}</div><div class="item-price original"><del>R$ ${item.price.toFixed(2).replace('.', ',')}</del></div>`;
    }
    return `<div class="product-item ${promotion ? 'on-sale': ''}" data-item-id="${item.id}" data-category="${item.category}">${promotion ? '<span class="promo-tag">PROMO</span>': ''}<img src="../${(item.image || 'img/placeholder.png').replace('../', '')}" alt="${item.name}"><div class="item-name">${item.name}</div>${priceHTML}<button class="btn btn-sm btn-primary add-item-btn">Adicionar</button></div>`;
  }).join(''): '<p>Nenhum item encontrado.</p>';
  productListContainer.querySelectorAll('.add-item-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const productCard = e.target.closest('.product-item');
      let itemData = {
        ...window.menuData[productCard.dataset.category].items.find(i => i.id === productCard.dataset.itemId), category: productCard.dataset.category
      };
      const promotion = activePromotions.find(p => p.itemId === itemData.id);
      itemData.price = promotion ? promotion.newPrice: itemData.price;
      itemData.isPromotion = !!promotion;
      if (itemData.category.includes('pizzas-')) {
        openPizzaCustomizationModal(itemData);
      } else {
        addItemToPdvCart( {
          ...itemData, unitPrice: itemData.price
        });
      }
    });
  });
}

function addItemToPdvCart(itemData) {
  if (!currentPdvOrder.items) currentPdvOrder.items = [];
  const existingItem = currentPdvOrder.items.find(cartItem => cartItem.name === itemData.name);
  if (existingItem) {
    existingItem.quantity++; existingItem.price += itemData.unitPrice;
  } else {
    const newItem = {
      ...itemData,
      quantity: 1,
      price: itemData.unitPrice
    }; currentPdvOrder.items.push(newItem);
  }
  renderPdvCart();
  updateTotalsUI();
}

function renderPdvCart() {
  const cartItemsContainer = document.getElementById('pdv-cart-items');
  if (cartItemsContainer) {
   // LINHA CORRIGIDA
cartItemsContainer.innerHTML = (!currentPdvOrder.items || currentPdvOrder.items.length === 0) ? `<p class="empty-cart-text">Adicione produtos ao pedido</p>`: currentPdvOrder.items.map((item, index) => {
    let itemName = item.name;
    if (item.category && item.category.includes('calzones')) {
        itemName += ' (Calzone)';
    }
    return `<div class="pdv-cart-item"><div><span class="quantity">${item.quantity}x</span> ${itemName}</div><div class="cart-item-actions"><span>R$ ${item.price.toFixed(2).replace('.', ',')}</span><button class="btn btn-sm btn-danger remove-item-btn" data-index="${index}">×</button></div></div>`;
}).join('');
  }
  cartItemsContainer.querySelectorAll('.remove-item-btn').forEach(btn => btn.addEventListener('click', (e) => removeItemFromPdvCart(parseInt(e.target.dataset.index))));
}

function removeItemFromPdvCart(index) {
  if (currentPdvOrder.items && currentPdvOrder.items[index]) {
    currentPdvOrder.items.splice(index, 1);
    renderPdvCart();
    updateTotalsUI();
  }
}

function openPizzaCustomizationModal(pizzaData) {
  const pizzaModal = document.getElementById('pdv-pizza-customization-modal');
  if (!pizzaModal) return;
  currentPizza = {
    ...pizzaData
  };
  selectedHalf2 = null;
  selectedStuffedCrust = null;
  document.getElementById('pdv-modal-product-name').textContent = currentPizza.name;
  document.getElementById('pdv-modal-product-description').textContent = currentPizza.description;
  const basePrice = pizzaData.isPromotion ? pizzaData.price: pizzaData.price;
  document.getElementById('pdv-price-inteira').textContent = `R$ ${basePrice.toFixed(2)}`;
  document.getElementById('pdv-price-metade').textContent = `R$ ${(basePrice / 2).toFixed(2)}`;
  const inteiraRadio = pizzaModal.querySelector('input[name="pdv-pizza-size"][value="inteira"]');
  if (inteiraRadio) inteiraRadio.checked = true;
  document.getElementById('pdv-second-half-options').classList.add('hidden');
  document.getElementById('pdv-selected-halves-info').style.display = 'none';
  renderStuffedCrustOptions();
  updatePizzaModalPrice();
  pizzaModal.classList.add('show');
}

function closePizzaModal() {
  const pizzaModal = document.getElementById('pdv-pizza-customization-modal'); if (pizzaModal) pizzaModal.classList.remove('show');
}

function updatePizzaModalPrice() {
  const addPizzaToCartBtn = document.getElementById('pdv-add-pizza-to-cart-btn');
  if (!addPizzaToCartBtn) return;
  let total = 0;
  const sizeRadio = document.querySelector('input[name="pdv-pizza-size"]:checked');
  if (!sizeRadio) return;
  const size = sizeRadio.value;
  const basePrice = currentPizza.isPromotion ? currentPizza.price: (currentPizza.unitPrice || currentPizza.price);
  if (size === 'inteira') {
    total = basePrice;
  } else {
    const firstHalfPrice = basePrice / 2;
    const secondHalfBasePrice = selectedHalf2 ? (selectedHalf2.isPromotion ? selectedHalf2.price: (selectedHalf2.unitPrice || selectedHalf2.price)) / 2: firstHalfPrice;
    total = Math.max(firstHalfPrice, secondHalfBasePrice) * 2;
  }
  if (selectedStuffedCrust) {
    total += selectedStuffedCrust.price;
  }
  currentPizzaModalPrice = total;
  addPizzaToCartBtn.textContent = `Adicionar - R$ ${total.toFixed(2).replace('.', ',')}`;
}

function renderSecondHalfList() {
  const secondHalfListDiv = document.getElementById('pdv-second-half-list');
  if (!secondHalfListDiv || !window.menuData) return;
  let allPizzas = [];
  Object.keys(window.menuData).forEach(catKey => {
    if (catKey.includes('pizzas-')) {
      allPizzas.push(...(window.menuData[catKey].items || []).map(item => ({
        ...item, category: catKey
      })));
    }
  });
  secondHalfListDiv.innerHTML = allPizzas.filter(p => p.id !== currentPizza.id).map(p => `<div class="product-item" data-item-id="${p.id}" data-category="${p.category}"><div class="item-name">${p.name}</div><div class="item-price">R$ ${(p.price / 2).toFixed(2).replace('.', ',')}</div></div>`).join('');
  secondHalfListDiv.querySelectorAll('.product-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedHalf2 = window.menuData[item.dataset.category].items.find(i => i.id === item.dataset.itemId);
      document.getElementById('pdv-second-half-options').classList.add('hidden');
      document.getElementById('pdv-selected-halves-info').style.display = 'block';
      document.getElementById('pdv-first-half-name-display').textContent = currentPizza.name;
      document.getElementById('pdv-second-half-name-display').textContent = selectedHalf2.name;
      updatePizzaModalPrice();
    });
  });
}

function openDiscountModal() {
  if (!currentPdvOrder.customer) {
    window.showToast("Selecione um cliente para aplicar um desconto.", "warning"); return;
  }
  const pointsDisplay = document.getElementById('pdv-customer-points-display');
  const loyaltyOptionsDiv = document.getElementById('pdv-loyalty-options-container');
  const couponsListDiv = document.getElementById('pdv-coupons-list-container');
  const discountModal = document.getElementById('pdv-discount-modal');
  pointsDisplay.textContent = currentPdvOrder.customer.points || 0;
  loyaltyOptionsDiv.innerHTML = '';
  let hasLoyaltyOptions = false;
  PDV_DISCOUNT_TIERS.forEach(tier => {
    if ((currentPdvOrder.customer.points || 0) >= tier.points) {
      hasLoyaltyOptions = true;
      loyaltyOptionsDiv.insertAdjacentHTML('beforeend', `<div class="discount-option"><label><input type="radio" name="pdv-discount" value="points_${tier.points}" data-type="points"><div class="option-text"><span class="description">${tier.label}</span><span class="details">Custo: ${tier.points} pontos</span></div></label></div>`);
    }
  });
  if (!hasLoyaltyOptions) {
    loyaltyOptionsDiv.innerHTML = '<p class="empty-list-message">Cliente sem pontos suficientes para resgate.</p>';
  }
  couponsListDiv.innerHTML = '';
  if (pdvAvailableCoupons && pdvAvailableCoupons.length > 0) {
    const activeCoupons = pdvAvailableCoupons.filter(c => c.active);
    if (activeCoupons.length > 0) {
      couponsListDiv.innerHTML = activeCoupons.map(coupon => {
        const details = coupon.type === 'percentage' ? `${coupon.value}% de desconto`: `Desconto de R$ ${coupon.value.toFixed(2)}`;
        return `<div class="discount-option"><label><input type="radio" name="pdv-discount" value="coupon_${coupon.id}" data-type="coupon"><div class="option-text"><span class="description">${coupon.description} (${coupon.code})</span><span class="details">${details}</span></div></label></div>`;
      }).join('');
    } else {
      couponsListDiv.innerHTML = '<p class="empty-list-message">Nenhum cupom ativo no momento.</p>';
    }
  } else {
    couponsListDiv.innerHTML = '<p class="empty-list-message">Nenhum cupom cadastrado.</p>';
  }
  if (pdvAppliedDiscount) {
    const radioToSelect = discountModal.querySelector(`input[value="${pdvAppliedDiscount.type}_${pdvAppliedDiscount.source.id || pdvAppliedDiscount.source.pointsToUse}"]`);
    if (radioToSelect) radioToSelect.checked = true;
    document.getElementById('pdv-remove-discount-btn').style.display = 'inline-block';
  } else {
    document.getElementById('pdv-remove-discount-btn').style.display = 'none';
  }
  discountModal.classList.add('show');
}

function handleDiscountSelection() {
  const selectedRadio = document.getElementById('pdv-discount-modal').querySelector('input[name="pdv-discount"]:checked');
  if (!selectedRadio) {
    window.showToast("Selecione uma opção de desconto.", "warning"); return;
  }
  const [type,
    value] = selectedRadio.value.split('_');
  if (type === 'points') {
    const tier = PDV_DISCOUNT_TIERS.find(t => t.points == value);
    pdvAppliedDiscount = {
      type: 'points',
      description: tier.label,
      source: {
        ...tier,
        pointsToUse: tier.points
      }
    };
  } else {
    const coupon = pdvAvailableCoupons.find(c => c.id === value);
    pdvAppliedDiscount = {
      type: 'coupon',
      description: `Cupom: ${coupon.description}`,
      source: coupon
    };
  }
  updateTotalsUI();
  document.getElementById('pdv-discount-modal').classList.remove('show');
}

function handleRemoveDiscount() {
  pdvAppliedDiscount = null;
  updateTotalsUI();
  document.getElementById('pdv-discount-modal').classList.remove('show');
}

function handlePaymentMethodChange() {
  const paymentMethodSelect = document.getElementById('pdv-payment-method');
  const selectedMethod = paymentMethodSelect.value;
  document.getElementById('pdv-change-for-container').classList.toggle('hidden', selectedMethod !== 'Dinheiro');
  document.getElementById('pdv-pix-status-container').classList.toggle('hidden', selectedMethod !== 'Pix');
  updatePaymentStatusUI();
}

function updatePaymentStatusUI() {
  const statusSpan = document.getElementById('pdv-payment-status');
  if (!statusSpan) return;
  const selectedMethod = document.getElementById('pdv-payment-method').value;
  let statusText = 'Não pago',
  statusClass = 'not-paid';
  if (['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'].includes(selectedMethod)) {
    statusText = 'Pago na Entrega'; statusClass = 'paid-on-delivery';
  } else if (selectedMethod === 'Pix') {
    const pixStatus = document.querySelector('input[name="pix-status"]:checked').value;
    statusText = pixStatus === 'pago' ? 'Pago': 'Aguardando Pag.';
    statusClass = pixStatus === 'pago' ? 'paid': 'not-paid';
  }
  statusSpan.textContent = statusText;
  statusSpan.className = 'pdv-payment-status ' + statusClass;
}

// Substitua a função inteira em pdv.js por esta versão

// Substitua a função inteira em pdv.js por esta versão

function handleSendWppToDelivery() {
  const deliveryPersonSelect = document.getElementById('pdv-delivery-person');
  const selectedDeliveryPersonId = deliveryPersonSelect.value;
  if (!selectedDeliveryPersonId) {
    window.showToast("Selecione um entregador primeiro.", "warning"); return;
  }
  if (!currentPdvOrder.customer || !currentPdvOrder.customer.address) {
    window.showToast("Adicione um cliente com endereço ao pedido.", "warning"); return;
  }
  if (!currentPdvOrder.items || currentPdvOrder.items.length === 0) {
    window.showToast("O pedido está vazio.", "warning"); return;
  }
  const deliveryPerson = window.allDeliveryPeople.find(p => p.id === selectedDeliveryPersonId);
  if (!deliveryPerson) {
    window.showToast("Erro: Entregador não encontrado.", "error"); return;
  }

  const customerName = `${currentPdvOrder.customer.firstName} ${currentPdvOrder.customer.lastName}`;
  const addressString = `${currentPdvOrder.customer.address.street}, ${currentPdvOrder.customer.address.number} - ${currentPdvOrder.customer.address.neighborhood}`;
  const paymentMethod = document.getElementById('pdv-payment-method').value || "Não definido";
  const grandTotal = (currentPdvOrder.totals?.grandTotal || 0).toFixed(2).replace('.', ',');
  const customerWhatsapp = currentPdvOrder.customer.whatsapp.replace(/\D/g, '');
  const customerWhatsappLink = `https://wa.me/55${customerWhatsapp}`;

  // CORREÇÃO APLICADA AQUI
  const fullAddressForMap = `${currentPdvOrder.customer.address.street}, ${currentPdvOrder.customer.address.number}, ${currentPdvOrder.customer.address.neighborhood}, Caçapava, SP`;
  const googleMapsLink = `https://maps.google.com/?q=${encodeURIComponent(fullAddressForMap)}`;
  
  let message = `*Nova Entrega D'Italia Pizzaria*\n\n` +
      `*Cliente:* ${customerName}\n` +
      `*Contato:* ${customerWhatsappLink}\n\n` +
      `*Endereço:* ${addressString}\n` +
      `*Ver no Mapa:* ${googleMapsLink}\n`;

  if (currentPdvOrder.customer.address.complement) message += `*Complemento:* ${currentPdvOrder.customer.address.complement}\n`;
  if (currentPdvOrder.customer.address.reference) message += `*Referência:* ${currentPdvOrder.customer.address.reference}\n`;
  
  message += `\n*Valor a Receber:* R$ ${grandTotal}\n*Forma de Pagamento:* ${paymentMethod}\n`;
  
  if (paymentMethod === 'Dinheiro') {
    const changeValue = parseFloat(document.getElementById('pdv-change-for').value);
    if (changeValue > 0) message += `*Levar troco para:* R$ ${changeValue.toFixed(2).replace('.', ',')}\n`;
  }
  
  message += `\nLembre-se de levar a maquininha de cartão se necessário. Boa entrega!`;
  
  const deliveryPersonWhatsappUrl = `https://wa.me/55${deliveryPerson.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  window.open(deliveryPersonWhatsappUrl, '_blank');
}

async function handleSaveOrder() {
  const acceptOrderBtn = document.getElementById('pdv-accept-btn');
  if (!currentPdvOrder.customer) {
    return window.showToast("Selecione ou cadastre um cliente.", "error");
  }
  if (!currentPdvOrder.items || currentPdvOrder.items.length === 0) {
    return window.showToast("Adicione itens ao pedido.", "error");
  }
  const paymentMethod = document.getElementById('pdv-payment-method').value;
  if (!paymentMethod) {
    return window.showToast("Selecione uma forma de pagamento.", "error");
  }
  acceptOrderBtn.disabled = true;
  acceptOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  const {
    doc,
    collection,
    writeBatch,
    serverTimestamp
  } = window.firebaseFirestore;
  const db = window.db;
  const batch = writeBatch(db);
  try {
    const customerToUpdate = {
      ...currentPdvOrder.customer
    };
    let pointsUsed = 0;
    if (pdvAppliedDiscount && pdvAppliedDiscount.type === 'points') {
      pointsUsed = pdvAppliedDiscount.source.pointsToUse;
    }
    const grandTotal = currentPdvOrder.totals.grandTotal;
    const pointsEarned = Math.floor(Math.max(0, grandTotal) / 50);
    const finalPointsBalance = (customerToUpdate.points || 0) - pointsUsed + pointsEarned;
    const customerRef = doc(db, "customer", customerToUpdate.id);
    const {
      isNew,
      id,
      ...customerForSave
    } = customerToUpdate;
    customerForSave.points = finalPointsBalance;
    customerForSave.lastUpdatedAt = serverTimestamp();
    batch.set(customerRef, customerForSave, {
      merge: true
    });
    const paymentData = {
      method: paymentMethod,
      changeFor: parseFloat(document.getElementById('pdv-change-for').value) || null,
      pixPaid: document.querySelector('input[name="pix-status"]:checked').value === 'pago'
    };
    let assignedDeliveryPerson = null;
    const deliveryPersonSelect = document.getElementById('pdv-delivery-person');
    if (deliveryPersonSelect.value) {
      const person = window.allDeliveryPeople.find(p => p.id === deliveryPersonSelect.value);
      if (person) assignedDeliveryPerson = {
        id: person.id,
        name: `${person.firstName} ${person.lastName}`
      };
    }
    const orderItems = currentPdvOrder.items.map(item => {
      const {
        price, ...rest
      } = item; rest.isPromotion = rest.isPromotion || false; return rest;
    });
    const orderToSave = {
      source: 'PDV',
      orderType: currentPdvOrder.orderType || 'Balcao',
      createdAt: serverTimestamp(),
      status: (paymentData.method === 'Pix' && !paymentData.pixPaid) ? 'Aguardando Pagamento': 'Recebido',
      customer: {
        id: customerToUpdate.id,
        firstName: customerToUpdate.firstName,
        lastName: customerToUpdate.lastName,
        whatsapp: customerToUpdate.whatsapp
      },

      delivery: {
    address: `${customerToUpdate.address?.street || ''}, ${customerToUpdate.address?.number || ''}`,
    neighborhood: customerToUpdate.address?.neighborhood || '',
    complement: customerToUpdate.address?.complement || '',
    reference: customerToUpdate.address?.reference || '',
    fee: currentPdvOrder.deliveryFee,
    assignedTo: assignedDeliveryPerson
},
      items: orderItems,
      totals: currentPdvOrder.totals,
      payment: paymentData,
      notes: document.getElementById('pdv-order-notes').value.trim()
    };
    const orderRef = doc(collection(db, "pedidos"));
    batch.set(orderRef, orderToSave);
    await batch.commit();
    window.showToast(`Pedido #${orderRef.id.substring(0, 6)} salvo com sucesso!`);

    returnToInitialState(true);
    const ordersMenuLink = document.querySelector('a[data-section-target="orders-content"]');
    if (ordersMenuLink) {
      ordersMenuLink.click();
    }

  } catch (e) {
    window.showToast("Erro ao salvar o pedido: " + e.message, "error");
    console.error("ERRO DETALHADO AO SALVAR:", e);
  } finally {
    acceptOrderBtn.disabled = false;
    acceptOrderBtn.innerHTML = 'Confirmar Pedido';
  }
}

function bindCreationViewListeners() {
  if (listenersAttached) return;
  document.querySelectorAll('input[name="pdv-order-type"]').forEach(radio => radio.addEventListener('change', handleOrderTypeChange));
  pdvOrderCreationView.querySelector('#pdv-cancel-btn').addEventListener('click', () => returnToInitialState(false));
  pdvOrderCreationView.querySelector('#pdv-customer-search').addEventListener('input', handleCustomerSearch);
  pdvOrderCreationView.querySelector('#pdv-add-new-customer-btn').addEventListener('click', openNewCustomerModal);
  document.getElementById('pdv-new-customer-form').addEventListener('submit', handleSaveNewCustomer);
  document.getElementById('pdv-new-customer-modal').querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closeNewCustomerModal));
  document.addEventListener('click', (e) => {
    const customerSearchInput = document.getElementById('pdv-customer-search');
    if (searchResultsContainer && customerSearchInput && !customerSearchInput.closest('.form-group').contains(e.target)) {
      hideSearchResults();
    }
  });
  document.getElementById('pdv-add-product-btn').addEventListener('click',
    openPdvProductModal);
  document.getElementById('product-selection-modal').querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closePdvProductModal));
  document.getElementById('product-category-filter').addEventListener('change',
    (e) => renderPdvProductList(e.target.value));
  pdvOrderCreationView.querySelector('#pdv-accept-btn').addEventListener('click',
    handleSaveOrder);
  pdvOrderCreationView.querySelector('#pdv-apply-discount-btn').addEventListener('click',
    openDiscountModal);
  pdvOrderCreationView.querySelector('.whatsapp').addEventListener('click',
    handleSendWppToDelivery);
  const discountModal = document.getElementById('pdv-discount-modal');
  if (discountModal) {
    discountModal.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', () => discountModal.classList.remove('show')));
    document.getElementById('pdv-confirm-discount-btn').addEventListener('click', handleDiscountSelection);
    document.getElementById('pdv-remove-discount-btn').addEventListener('click', handleRemoveDiscount);
  }
  pdvOrderCreationView.querySelector('#pdv-payment-method').addEventListener('change', handlePaymentMethodChange);
  pdvOrderCreationView.querySelectorAll('input[name="pix-status"]').forEach(radio => radio.addEventListener('change', updatePaymentStatusUI));
  const pizzaModal = document.getElementById('pdv-pizza-customization-modal');
  if (pizzaModal) {
    pizzaModal.querySelector('.close-modal-btn').addEventListener('click', closePizzaModal);
    pizzaModal.querySelectorAll('input[name="pdv-pizza-size"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const isMetade = e.target.value === 'metade';
        document.getElementById('pdv-second-half-options').classList.toggle('hidden', !isMetade);
        if (isMetade) {
          renderSecondHalfList();
        } else {
          selectedHalf2 = null; document.getElementById('pdv-selected-halves-info').style.display = 'none';
        }
        updatePizzaModalPrice();
      });
    });
    document.getElementById('pdv-add-pizza-to-cart-btn').addEventListener('click', () => {
      const size = pizzaModal.querySelector('input[name="pdv-pizza-size"]:checked').value;
      if (size === 'metade' && !selectedHalf2) {
        window.showToast("Escolha a segunda metade da pizza.", "warning"); return;
      }
      let finalName = "",
      id = currentPizza.id,
      unitPrice = 0;
      const isPromo = currentPizza.isPromotion;
      const basePrice = currentPizza.isPromotion ? currentPizza.price: (currentPizza.unitPrice || currentPizza.price);
      if (size === 'inteira') {
        unitPrice = basePrice; finalName = currentPizza.name;
      } else {
        const firstHalfPrice = basePrice / 2;
        const secondHalfBasePrice = selectedHalf2.isPromotion ? selectedHalf2.price: (selectedHalf2.unitPrice || selectedHalf2.price);
        const secondHalfPrice = secondHalfBasePrice / 2;
        unitPrice = Math.max(firstHalfPrice, secondHalfPrice) * 2;
        finalName = `Metade ${currentPizza.name} / Metade ${selectedHalf2.name}`;
        id += `+${selectedHalf2.id}`;
      }
      if (selectedStuffedCrust) {
        unitPrice += selectedStuffedCrust.price; finalName += ` (Borda: ${selectedStuffedCrust.name})`;
      }
      addItemToPdvCart( {
        id, name: finalName, unitPrice, category: currentPizza.category, selectedSize: size, secondHalf: selectedHalf2, stuffedCrust: selectedStuffedCrust, isPromotion: isPromo
      });
      closePizzaModal();
    });
  }
  listenersAttached = true;
}

window.initializePdvSection = initializePdvSection;
