// pedidos.js - VERSÃO COM MENSAGEM PARA MOTOBOY APRIMORADA

// --- Variáveis de estado do módulo ---
let ordersSectionInitialized = false;
let unsubscribeFromOrders = null;
let allOrders = [];
let allDeliveryPeople = [];
let activeTypeFilter = 'todos';

// ======================================================================
// FUNÇÃO ATUALIZADA
// ======================================================================
// DENTRO DE pedidos.js - SUBSTITUA A FUNÇÃO INTEIRA

function handleSendWppToDeliveryPerson(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  const deliveryPersonSelect = document.getElementById('modal-delivery-person-select');
  
  if (!order || !deliveryPersonSelect) {
    console.error("Pedido ou seletor de entregador não encontrado.");
    window.showToast("Erro ao encontrar dados do pedido.", "error");
    return;
  }
  const selectedDeliveryPersonId = deliveryPersonSelect.value;
  if (!selectedDeliveryPersonId) {
    window.showToast("Selecione um entregador para enviar a mensagem.", "warning");
    return;
  }
  const deliveryPerson = allDeliveryPeople.find(p => p.id === selectedDeliveryPersonId);
  if (!deliveryPerson) {
    window.showToast("Erro: Dados do entregador não encontrados.", "error");
    return;
  }

  // --- Montagem da Mensagem Corrigida ---

  const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
  const customerWhatsapp = order.customer.whatsapp.replace(/\D/g, '');
  const customerWhatsappLink = `https://wa.me/55${customerWhatsapp}`;
  
  const itemsList = order.items.map(item => {
    let itemName = item.name;
    // Adiciona a identificação de Calzone que fizemos antes
    if (item.category && item.category.includes('calzones')) {
        itemName += ' (Calzone)';
    }
    return `- ${item.quantity}x ${itemName}`;
  }).join('\n');
  
  const grandTotal = (order.totals?.grandTotal || 0).toFixed(2).replace('.', ',');
  const paymentMethod = order.payment.method || "Não definido";
  
  let paymentStatus = 'Receber na entrega';
  if (order.payment?.method === 'Pix') {
    paymentStatus = order.payment.pixPaid ? 'Já foi pago (Pix)' : 'Aguardando Pagamento';
  }
  
  // LÓGICA CORRIGIDA PARA O ENDEREÇO
  // Primeiro, tenta usar o campo `address` completo. Se não existir, monta com `street` e `number`.
  const addressLine = order.delivery.address || `${order.delivery.street || ''}, ${order.delivery.number || ''}`;

  let message = `*Nova Entrega D'Italia Pizzaria* 🛵\n\n` +
      `*CLIENTE:*\n` +
      `${customerName}\n\n` +
      `*CONTATO:*\n` +
      `${customerWhatsappLink}\n\n` +
      `*ENDEREÇO:*\n` +
      `*RUA:* ${addressLine}\n` + // Usa a nova variável corrigida
      `*BAIRRO:* ${order.delivery.neighborhood || ''}\n`;

  if (order.delivery.complement) message += `*COMPLEMENTO:* ${order.delivery.complement}\n`;
  if (order.delivery.reference) message += `*PONTO DE REFERÊNCIA:* ${order.delivery.reference}\n`;

  message += `\n-----------------------------------\n` +
      `*PEDIDO:*\n` +
      `${itemsList}\n\n` +
      `-----------------------------------\n` +
      `*PAGAMENTO:*\n` +
      `Valor a Receber: *R$ ${grandTotal}*\n` +
      `Forma de Pagamento: *${paymentMethod}*\n` +
      `Status do Pagamento: *${paymentStatus}*\n`;

  if (paymentMethod === 'Dinheiro') {
    const changeValue = parseFloat(order.payment.changeFor);
    if (changeValue > 0) {
      message += `*Levar troco para:* R$ ${changeValue.toFixed(2).replace('.', ',')}\n`;
    }
  }

  message += `\nBoa entrega! 🛵💨`;
  
  const deliveryPersonWhatsappUrl = `https://wa.me/55${deliveryPerson.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  window.open(deliveryPersonWhatsappUrl, '_blank');
}


function openOrderDetailsModal(order) {
  const orderDetailsModal = document.getElementById('order-details-modal');
  if (!order || !orderDetailsModal) {
    console.error("Erro: Pedido ou modal de detalhes não encontrado."); return;
  }
  const formatPrice = (price) => (price != null) ? price.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  }): "R$ 0,00";
  const modalBody = orderDetailsModal.querySelector('.modal-body');
  const modalTitle = orderDetailsModal.querySelector('#modal-order-title');
  const customer = order.customer || {};
  const delivery = order.delivery || {};
  const payment = order.payment || {};
  const totals = order.totals || {};
  const items = order.items || [];
  modalTitle.innerHTML = `<i class="fas fa-receipt"></i> Pedido #${order.id.substring(0, 6).toUpperCase()}`;
  let modalBodyHTML = '';
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-user"></i> Cliente</h4><div class="detail-grid"><div class="detail-item full-width"><strong>Nome</strong><span>${`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Não informado'}</span></div><div class="detail-item full-width"><strong>WhatsApp</strong><span>${customer.whatsapp || 'Não informado'}</span></div></div>`;
  
  const itemsHTML = items.length > 0 ? `<ul>${items.map(item => {
      let itemName = item.name;
      if (item.category && item.category.includes('calzones')) {
          itemName += ' (Calzone)';
      }
      return `<li><span class="item-quantity">${item.quantity}x</span><div class="item-info"><span class="item-name">${itemName}</span>${item.notes ? `<span class="item-notes">Obs: ${item.notes}</span>`: ''}</div><span class="item-price">${formatPrice((item.unitPrice || 0) * item.quantity)}</span></li>`;
  }).join('')}</ul>`: '<p>Nenhum item encontrado.</p>';
  
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-shopping-basket"></i> Itens do Pedido</h4>${itemsHTML}`;
  
  if (order.notes) {
    modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-comment-alt"></i> Observações</h4><div class="detail-item full-width notes-section"><span>${order.notes}</span></div>`;
  }
  const streetAndNumber = delivery.address || `${delivery.street || '--'}, ${delivery.number || 'S/N'}`;
  const addressParts = [`<strong>Endereço:</strong> ${streetAndNumber}`,
    `<strong>Bairro:</strong> ${delivery.neighborhood || '--'}`,
    delivery.complement ? `<strong>Complemento:</strong> ${delivery.complement}`: null,
    delivery.reference ? `<strong>Referência:</strong> ${delivery.reference}`: null].filter(Boolean).join('<br>');
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h4><div class="detail-item full-width"><span>${addressParts || 'Não informado'}</span></div>`;
  let paymentDetailsHTML = `<div class="detail-item"><strong>Subtotal</strong><span>${formatPrice(totals.subtotal)}</span></div><div class="detail-item"><strong>Taxa de Entrega</strong><span>${formatPrice(totals.deliveryFee)}</span></div>${totals.discount > 0 ? `<div class="detail-item"><strong>Desconto</strong><span class="text-success">- ${formatPrice(totals.discount)}</span></div>`: ''}<div class="detail-item total full-width" style="border-top: 1px solid #eee; padding-top: 10px; margin-top: 5px;"><strong>Total a Pagar</strong><span>${formatPrice(totals.grandTotal)}</span></div><div class="detail-item full-width"><strong>Forma de Pagamento</strong><span>${payment.method || 'Não informada'}</span></div>`;
  if (payment.method === 'Dinheiro' && payment.changeFor) {
    paymentDetailsHTML += `<div class="detail-item full-width"><strong>Troco para</strong><span>${formatPrice(payment.changeFor)}</span></div>`;
  }
  if (payment.method === 'Pix') {
    const pixStatus = payment.pixPaid ? '<span class="text-success">Pago</span>': '<span class="text-danger">Não Pago</span>';
    paymentDetailsHTML += `<div class="detail-item full-width"><strong>Status do Pix</strong>${pixStatus}</div>`;
  }
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-file-invoice-dollar"></i> Financeiro</h4><div class="detail-grid">${paymentDetailsHTML}</div>`;
  const deliveryPersonSelectorHTML = `<div class="delivery-assignment-section"><div class="form-group"><label for="modal-delivery-person-select" style="font-weight: 500; margin-bottom: 8px;">Atribuir / Enviar para Entregador:</label><div class="input-with-icon right-icon"><select id="modal-delivery-person-select" class="form-control"><option value="">Selecione um entregador...</option>${allDeliveryPeople.map(p => `<option value="${p.id}" ${delivery.assignedTo && delivery.assignedTo.id === p.id ? 'selected': ''}>${p.firstName} ${p.lastName}</option>`).join('')}</select><button id="modal-send-wpp-btn" class="pdv-icon-btn whatsapp" title="Enviar dados do pedido para o WhatsApp do entregador"><i class="fab fa-whatsapp"></i></button></div></div></div>`;
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-motorcycle"></i> Entregador</h4>${deliveryPersonSelectorHTML}`;
  modalBody.innerHTML = modalBodyHTML;
  const sendWppBtn = modalBody.querySelector('#modal-send-wpp-btn');
  if (sendWppBtn) {
    sendWppBtn.addEventListener('click', () => handleSendWppToDeliveryPerson(order.id));
  }
  orderDetailsModal.classList.add('show');
}

function closeOrderDetailsModal() {
  const orderDetailsModal = document.getElementById('order-details-modal'); if (orderDetailsModal) orderDetailsModal.classList.remove('show');
}

function getOrderType(order) {
  if (order.orderType) return order.orderType;
  if (order.source === 'WebApp') return 'Delivery';
  return 'Balcao';
}

function renderOrders() {
  const ordersListContainer = document.getElementById('orders-list-container');
  if (!ordersListContainer) return;
  const activeStatusFilter = document.querySelector('.order-status-filters .filter-tab.active')?.dataset.statusFilter || 'todos';
  const visibleOrders = allOrders.filter(o => !['Entregue', 'Cancelado', 'Finalizado'].includes(o.status));
  const typeCounters = {
    balcao: document.querySelector('.summary-item[data-type-filter="balcao"] .count'),
    delivery: document.querySelector('.summary-item[data-type-filter="delivery"] .count'),
    mesas: document.querySelector('.summary-item[data-type-filter="mesas"] .count'),
  };
  if (typeCounters.balcao) typeCounters.balcao.textContent = visibleOrders.filter(o => getOrderType(o) === 'Balcao').length;
  if (typeCounters.delivery) typeCounters.delivery.textContent = visibleOrders.filter(o => getOrderType(o) === 'Delivery').length;
  if (typeCounters.mesas) typeCounters.mesas.textContent = visibleOrders.filter(o => getOrderType(o) === 'Mesa').length;
  const statusCounters = {
    pendente: document.querySelector('.filter-tab[data-status-filter="pendente"] .count'),
    em_preparo: document.querySelector('.filter-tab[data-status-filter="em-preparo"] .count'),
    a_caminho: document.querySelector('.filter-tab[data-status-filter="a-caminho"] .count')
  };
  if (statusCounters.pendente) statusCounters.pendente.textContent = visibleOrders.filter(o => ['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(o.status)).length;
  if (statusCounters.em_preparo) statusCounters.em_preparo.textContent = visibleOrders.filter(o => o.status === 'Em Preparo').length;
  if (statusCounters.a_caminho) statusCounters.a_caminho.textContent = visibleOrders.filter(o => o.status === 'Saiu para Entrega').length;
  
  let filteredOrders = visibleOrders;
  
  if (activeTypeFilter !== 'todos') {
    filteredOrders = filteredOrders.filter(o => getOrderType(o).toLowerCase() === activeTypeFilter);
  }
  if (activeStatusFilter === 'pendente') {
    filteredOrders = filteredOrders.filter(o => ['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(o.status));
  } else if (activeStatusFilter === 'em-preparo') {
    filteredOrders = filteredOrders.filter(o => o.status === 'Em Preparo');
  } else if (activeStatusFilter === 'a-caminho') {
    filteredOrders = filteredOrders.filter(o => o.status === 'Saiu para Entrega');
  }
  
  ordersListContainer.className = `orders-list-container card-view`;
  
  if (filteredOrders.length === 0) {
    ordersListContainer.innerHTML = `<div class="empty-orders-state"><i class="fas fa-receipt empty-state-icon"></i><p class="empty-state-message">Nenhum pedido encontrado com os filtros atuais.</p><button class="btn btn-primary btn-lg empty-state-new-order-btn"><i class="fas fa-plus-circle"></i> Novo pedido</button></div>`;
    const emptyBtn = ordersListContainer.querySelector('.empty-state-new-order-btn');
    if (emptyBtn) emptyBtn.addEventListener('click', handleNewOrderButtonClick);
    return;
  }
  
  ordersListContainer.innerHTML = filteredOrders.map(order => getOrderCardHTML(order)).join('');
  
  addOrderCardEventListeners();
}

function getOrderCardHTML(order) {
  const orderTimestamp = order.createdAt?.toDate ? order.createdAt.toDate(): new Date();
  let typeIcon, typeText;
  const orderType = getOrderType(order);
  if (orderType === 'Delivery') {
    typeIcon = '<i class="fas fa-motorcycle"></i>'; typeText = 'Delivery';
  } else if (orderType === 'Mesa') {
    typeIcon = '<i class="fas fa-utensils"></i>'; typeText = 'Mesa';
  } else {
    typeIcon = '<i class="fas fa-store-alt"></i>'; typeText = 'Balcão';
  }
  if (order.status === 'Saiu para Entrega') {
    typeIcon = '<i class="fas fa-shipping-fast a-caminho-icon"></i>'; typeText = 'A CAMINHO';
  }
  let paymentTagHTML = '';
  if (order.payment) {
    if (order.payment.method === 'Pix') {
      paymentTagHTML = order.payment.pixPaid ? '<span class="tag tag-payment-paid">Pago</span>': '<span class="tag tag-payment-unpaid">Pix Não Pago</span>';
    } else if (order.payment.method === 'Dinheiro' || order.payment.method.includes('Cartão')) {
      paymentTagHTML = '<span class="tag tag-payment-delivery">Pgto na Entrega</span>';
    }
  }
  let actionHtml = getOrderActionHTML(order);
  return `<div class="order-card" data-order-id="${order.id}"><div class="card-header"><div class="order-type-id">${typeIcon} ${typeText} #${order.id.substring(0, 6)}</div><div class="order-timestamp">${orderTimestamp.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit'
  })}</div></div><div class="card-body"><div class="customer-name">${order.customer.firstName} ${order.customer.lastName}</div><div class="order-tags"><span class="tag tag-status">${order.status}</span>${paymentTagHTML}</div></div><div class="card-footer"><div class="order-value">R$ ${(order.totals.grandTotal || 0).toFixed(2).replace('.', ',')}</div>${actionHtml}</div></div>`;
}

function getOrderListHTML(order) {
  const orderType = getOrderType(order);
  let actionHtml = getOrderActionHTML(order);
  return `<div class="order-list-item" data-order-id="${order.id}"><div class="list-item-id">#${order.id.substring(0, 6)}</div><div class="list-item-customer"><span class="name">${order.customer.firstName} ${order.customer.lastName}</span><span class="type">${orderType}</span></div><div class="list-item-status"><span class="tag tag-status">${order.status}</span></div><div class="list-item-value">R$ ${(order.totals.grandTotal || 0).toFixed(2).replace('.', ',')}</div><div class="list-item-actions">${actionHtml}</div></div>`;
}

function getOrderActionHTML(order) {
  if (['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(order.status)) {
    return `<div class="card-actions"><button class="btn btn-sm btn-danger refuse-order-btn" data-order-id="${order.id}"><i class="fas fa-times"></i> Recusar</button><button class="btn btn-sm btn-success accept-order-btn" data-order-id="${order.id}"><i class="fas fa-check"></i> Aceitar</button></div>`;
  } else {
    return `<select class="status-select-card" data-order-id="${order.id}">${['Em Preparo',
      'Saiu para Entrega',
      'Entregue',
      'Cancelado'].map(s => `<option value="${s}" ${order.status === s?'selected': ''}>${s}</option>`).join('')}</select>`;
  }
}

function listenForRealTimeOrders() {
  if (unsubscribeFromOrders) unsubscribeFromOrders();
  const {
    collection,
    query,
    orderBy,
    onSnapshot
  } = window.firebaseFirestore;
  const q = query(collection(window.db, "pedidos"), orderBy("createdAt", "desc"));
  let isInitialLoad = true;
  unsubscribeFromOrders = onSnapshot(q, snapshot => {
    allOrders = snapshot.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    renderOrders();
    snapshot.docChanges().forEach(change => {
      if (change.type === "added" && !isInitialLoad) {
        new Audio('../audio/notification.mp3').play().catch(e => {});
      }
    });
    isInitialLoad = false;
  }, error => {
    console.error("Erro ao escutar pedidos em tempo real: ",
      error);
    document.getElementById('orders-list-container').innerHTML = `<p>Erro ao carregar pedidos.</p>`;
  });
}

async function updateOrderStatus(orderId, newStatus) {
  const {
    doc, updateDoc
  } = window.firebaseFirestore;
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  const notifyCustomer = (newStatus === 'Em Preparo' || newStatus === 'Saiu para Entrega' || newStatus === 'Cancelado');
  try {
    await updateDoc(doc(window.db, "pedidos", orderId), {
      status: newStatus, lastStatusUpdate: new Date()
    });
    if (notifyCustomer && order.customer && order.customer.whatsapp) {
      let message = '';
      if (newStatus === 'Em Preparo') {
        message = `Olá, ${order.customer.firstName}! Seu pedido #${order.id.substring(0, 6)} na D'Italia Pizzaria foi confirmado e já está em preparo!`;
      } else if (newStatus === 'Cancelado') {
        message = `Olá, ${order.customer.firstName}. Infelizmente, seu pedido #${order.id.substring(0, 6)} na D'Italia Pizzaria foi cancelado. Por favor, entre em contato para mais detalhes.`;
      } else if (newStatus === 'Saiu para Entrega') {
        message = `Olá, ${order.customer.firstName}! Boas notícias! Seu pedido da D'Italia Pizzaria acaba de sair para entrega!`;
      }
      if (message) {
        window.open(`https://wa.me/55${order.customer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar status do pedido: ", error);
  }
}

function handleNewOrderButtonClick() {
  const pdvMenuLink = document.querySelector('a[data-section-target="pdv-content"]');
  if (pdvMenuLink) {
    pdvMenuLink.click();
    if (typeof window.openPdvNewOrderView === 'function') {
      window.openPdvNewOrderView();
    }
  }
}

function addOrderCardEventListeners() {
  const container = document.getElementById('orders-list-container');
  container.querySelectorAll('.accept-order-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation(); updateOrderStatus(btn.dataset.orderId, 'Em Preparo');
  }));
  container.querySelectorAll('.refuse-order-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation(); updateOrderStatus(btn.dataset.orderId, 'Cancelado');
  }));
  container.querySelectorAll('.status-select-card').forEach(select => {
    select.addEventListener('change', e => updateOrderStatus(select.dataset.orderId, e.target.value));
    select.addEventListener('click', e => e.stopPropagation());
  });
  container.querySelectorAll('.order-card, .order-list-item').forEach(card => card.addEventListener('click', () => {
    const order = allOrders.find(o => o.id === card.dataset.orderId);
    if (order) openOrderDetailsModal(order);
  }));
}

function showDeliverySummary() {
  const deliveryOrders = allOrders.filter(o => o.status === 'Saiu para Entrega');
  const modal = document.getElementById('delivery-summary-modal');
  const modalBody = document.getElementById('delivery-summary-body');
  if (deliveryOrders.length === 0) {
    modalBody.innerHTML = '<p class="empty-list-message">Nenhum pedido a caminho no momento.</p>';
  } else {
    modalBody.innerHTML = deliveryOrders.map(order => {
      const delivery = order.delivery || {};
      const customer = order.customer || {};
      const address = [delivery.street, delivery.number, delivery.neighborhood].filter(Boolean).join(', ');
      return `<div class="delivery-route-item"><div class="route-customer">#${order.id.substring(0, 6)} - ${customer.firstName} ${customer.lastName}</div><div class="route-address"><strong>Endereço:</strong> ${address}<br>${delivery.reference ? `<strong>Ref:</strong> ${delivery.reference}`: ''}</div></div>`;
    }).join('');
  }
  modal.classList.add('show');
}

async function fetchDeliveryPeople() {
  if (!window.db || !window.firebaseFirestore) return;
  const {
    collection,
    getDocs,
    query
  } = window.firebaseFirestore;
  try {
    const q = query(collection(window.db, "delivery_people"));
    const querySnapshot = await getDocs(q);
    allDeliveryPeople = querySnapshot.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    window.allDeliveryPeople = allDeliveryPeople;
  } catch (error) {
    console.error("Erro ao buscar entregadores:", error);
    window.showToast("Não foi possível carregar os entregadores.", "error");
  }
}

async function initializeOrdersSection() {
    if (ordersSectionInitialized) {
        return;
    }
    ordersSectionInitialized = true;
    
    console.log("Módulo Pedidos.js: Configurando pela primeira vez...");

    await fetchDeliveryPeople();
    listenForRealTimeOrders();

    const typeFilterTabs = document.querySelectorAll('.order-summary-bar .summary-item');
    const statusFilterTabs = document.querySelectorAll('.order-status-filters .filter-tab');
    const newOrderButtons = document.querySelectorAll('.new-order-main-btn, .empty-state-new-order-btn');
    const orderDetailsModal = document.getElementById('order-details-modal');
    
    if (typeFilterTabs.length > 0) {
        typeFilterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const filterType = tab.dataset.typeFilter;
                if (!filterType) return;
                
                if (tab.classList.contains('active')) {
                    tab.classList.remove('active');
                    activeTypeFilter = 'todos';
                } else {
                    typeFilterTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    activeTypeFilter = filterType;
                }
                renderOrders();
            });
        });
    }

    if (statusFilterTabs.length > 0) {
        statusFilterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelector('.order-status-filters .filter-tab.active')?.classList.remove('active');
                tab.classList.add('active');
                renderOrders();
            });
        });
    }
    
    if (newOrderButtons.length > 0) {
        newOrderButtons.forEach(btn => {
            btn.addEventListener('click', handleNewOrderButtonClick);
        });
    }

    if (orderDetailsModal) {
        orderDetailsModal.querySelector('.close-modal-btn')?.addEventListener('click', closeOrderDetailsModal);
        orderDetailsModal.addEventListener('click', (e) => {
            if (e.target === orderDetailsModal) closeOrderDetailsModal();
        });
    }
}

window.initializeOrdersSection = initializeOrdersSection;
