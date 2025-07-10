// pedidos.js - VERSÃO COMPLETA E CORRIGIDA

// --- Variáveis de estado do módulo ---
let ordersSectionInitialized = false;
let unsubscribeFromOrders = null;
let allOrders = [];
let allDeliveryPeople = [];
let activeTypeFilter = 'todos';

// --- Funções de Dados (Firestore) ---

async function fetchDeliveryPeople() {
    if (!window.db || !window.firebaseFirestore) return;
    const { collection, getDocs, query } = window.firebaseFirestore;
    try {
        const q = query(collection(window.db, "delivery_people"));
        const querySnapshot = await getDocs(q);
        allDeliveryPeople = querySnapshot.docs.map(doc => ({
          docId: doc.id,
          ...doc.data()
        }));
        window.allDeliveryPeople = allDeliveryPeople;
    } catch (error) {
        console.error("Erro ao buscar entregadores:", error);
        window.showToast("Não foi possível carregar os entregadores.", "error");
    }
}

async function updateOrderStatus(orderId, newStatus) {
    const { doc, updateDoc } = window.firebaseFirestore;
    const orderRef = doc(window.db, "pedidos", orderId);
    try {
        await updateDoc(orderRef, { status: newStatus, lastStatusUpdate: new Date() });
        window.showToast(`Pedido #${orderId.substring(0,6)} atualizado para ${newStatus}!`);
    } catch (error) {
        console.error("Erro ao atualizar status do pedido:", error);
        window.showToast("Erro ao atualizar status.", "error");
    }
}

// Arquivo: pedidos.js

// SUBSTITUA A FUNÇÃO INTEIRA PELA VERSÃO CORRIGIDA ABAIXO
async function assignDriverToOrder(orderId, driverData) {
    const { doc, updateDoc } = window.firebaseFirestore;
    const orderRef = doc(window.db, "pedidos", orderId);
    try {
        // AQUI ESTÁ A CORREÇÃO:
        // Agora o objeto salvo corresponde exatamente à estrutura que o app do entregador espera.
        const dataToSave = driverData ? { 'delivery.assignedTo': { id: driverData.id, name: driverData.name } } : { 'delivery.assignedTo': null };

        await updateDoc(orderRef, dataToSave);

        if (driverData) {
            window.showToast(`Entregador ${driverData.name} atribuído ao pedido!`);
        } else {
            window.showToast(`Entregador removido do pedido.`);
        }
    } catch (error) {
        console.error("Erro ao atribuir entregador:", error);
        window.showToast("Falha ao atribuir entregador.", "error");
    }
}

// --- Funções de UI (Interface do Painel) ---

function handleSendWppToDeliveryPerson(order) {
    const deliveryPersonSelect = document.getElementById('modal-delivery-person-select');
    if (!order || !deliveryPersonSelect) {
      console.error("Pedido ou seletor de entregador não encontrado.");
      window.showToast("Erro ao encontrar dados do pedido.", "error");
      return;
    }
    
    const selectedOption = deliveryPersonSelect.options[deliveryPersonSelect.selectedIndex];
    const deliveryPersonWhatsapp = selectedOption.dataset.whatsapp;

    if (!deliveryPersonWhatsapp) {
      window.showToast("Selecione um entregador para enviar a mensagem.", "warning");
      return;
    }

    const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
    const addressLine = order.delivery.address || `${order.delivery.street || ''}, ${order.delivery.number || ''}`;
    const customerWhatsappLink = `https://wa.me/55${order.customer.whatsapp.replace(/\D/g, '')}`;
    const itemsList = order.items.map(item => `- ${item.quantity}x ${item.name}`).join('\n');
    const grandTotal = (order.totals?.grandTotal || 0).toFixed(2).replace('.', ',');
    const paymentMethod = order.payment.method || "Não definido";
    
    let paymentStatus = 'Receber na entrega';
    if (order.payment?.method === 'Pix') {
      paymentStatus = order.payment.pixPaid ? 'Já foi pago (Pix)' : 'Aguardando Pagamento';
    }

    let message = `*Nova Entrega D'Italia Pizzaria* 🛵\n\n` +
        `*CLIENTE:*\n${customerName}\n\n*CONTATO:*\n${customerWhatsappLink}\n\n` +
        `*ENDEREÇO:*\n*RUA:* ${addressLine}\n*BAIRRO:* ${order.delivery.neighborhood || ''}\n`;
    if (order.delivery.complement) message += `*COMPLEMENTO:* ${order.delivery.complement}\n`;
    if (order.delivery.reference) message += `*PONTO DE REFERÊNCIA:* ${order.delivery.reference}\n`;
    message += `\n-----------------------------------\n*PEDIDO:*\n${itemsList}\n\n` +
        `-----------------------------------\n*PAGAMENTO:*\n` +
        `Valor a Receber: *R$ ${grandTotal}*\nForma de Pagamento: *${paymentMethod}*\nStatus do Pagamento: *${paymentStatus}*\n`;
    if (paymentMethod === 'Dinheiro' && order.payment.changeFor > 0) {
      message += `*Levar troco para:* R$ ${order.payment.changeFor.toFixed(2).replace('.', ',')}\n`;
    }
    message += `\nBoa entrega! 🛵💨`;
    
    const deliveryPersonWhatsappUrl = `https://wa.me/55${deliveryPersonWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(deliveryPersonWhatsappUrl, '_blank');
}

function openOrderDetailsModal(order) {
    const orderDetailsModal = document.getElementById('order-details-modal');
    if (!order || !orderDetailsModal) {
      console.error("Erro: Pedido ou modal de detalhes não encontrado.");
      return;
    }

    const formatPrice = (price) => (price != null) ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00";
    const modalBody = orderDetailsModal.querySelector('.modal-body');
    const modalTitle = orderDetailsModal.querySelector('#modal-order-title');

    const { customer = {}, delivery = {}, payment = {}, totals = {}, items = [] } = order;
    modalTitle.innerHTML = `<i class="fas fa-receipt"></i> Pedido #${order.id.substring(0, 6).toUpperCase()}`;
    
    const customerHTML = `<h4 class="modal-section-title"><i class="fas fa-user"></i> Cliente</h4><div class="detail-grid"><div class="detail-item full-width"><strong>Nome</strong><span>${`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Não informado'}</span></div><div class="detail-item full-width"><strong>WhatsApp</strong><span>${customer.whatsapp || 'Não informado'}</span></div></div>`;
    const itemsHTML = items.length > 0 ? `<ul>${items.map(item => `<li><span class="item-quantity">${item.quantity}x</span><div class="item-info"><span class="item-name">${item.name}</span>${item.notes ? `<span class="item-notes">Obs: ${item.notes}</span>`: ''}</div><span class="item-price">${formatPrice((item.unitPrice || 0) * item.quantity)}</span></li>`).join('')}</ul>`: '<p>Nenhum item encontrado.</p>';
    const itemsSectionHTML = `<h4 class="modal-section-title"><i class="fas fa-shopping-basket"></i> Itens do Pedido</h4>${itemsHTML}`;
    const addressHTML = `<h4 class="modal-section-title"><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h4><div class="detail-item full-width"><span>${delivery.address || 'Não informado'}, ${delivery.neighborhood || ''}</span></div>`;
    
    let paymentDetailsHTML = `
      <div class="detail-item"><strong>Subtotal</strong><span>${formatPrice(totals.subtotal)}</span></div>
      <div class="detail-item"><strong>Taxa de Entrega</strong><span>${formatPrice(totals.deliveryFee)}</span></div>
      ${totals.discount > 0 ? `<div class="detail-item"><strong>Desconto</strong><span class="text-success">- ${formatPrice(totals.discount)}</span></div>` : ''}
      <div class="detail-item total full-width"><strong>Total a Pagar</strong><span>${formatPrice(totals.grandTotal)}</span></div>
      <div class="detail-item full-width"><strong>Forma de Pagamento</strong><span>${payment.method || 'Não informada'}</span></div>
    `;

    if (payment.method === 'Dinheiro' && payment.changeFor) {
      paymentDetailsHTML += `<div class="detail-item full-width"><strong>Troco para</strong><span>${formatPrice(payment.changeFor)}</span></div>`;
    }

    if (payment.method === 'Pix') {
        const isPaid = payment.pixPaid === true;
        paymentDetailsHTML += `
            <div class="detail-item full-width payment-status-toggle-container">
                <strong>Status do Pagamento</strong>
                <div class="payment-status-wrapper">
                    <span class="status-label ${isPaid ? 'paid' : ''}">${isPaid ? 'Pago' : 'Não Pago'}</span>
                    <label class="switch">
                        <input type="checkbox" id="pix-paid-toggle" ${isPaid ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        `;
    }
    
    const paymentSectionHTML = `<h4 class="modal-section-title"><i class="fas fa-file-invoice-dollar"></i> Financeiro</h4><div class="detail-grid">${paymentDetailsHTML}</div>`;
    
    const deliveryPersonSelectorHTML = `<div class="delivery-assignment-section"><div class="form-group"><label for="modal-delivery-person-select">Atribuir Entregador:</label><div class="input-with-icon right-icon"><select id="modal-delivery-person-select" class="form-control"><option value="">-- Nenhum --</option>${allDeliveryPeople.map(p => `<option value="${p.docId}" data-whatsapp="${p.whatsapp}" data-name="${p.firstName}">${p.firstName} ${p.lastName}</option>`).join('')}</select><button id="modal-save-driver-btn" class="btn btn-sm btn-success" style="height: 100%; border-radius: 0 4px 4px 0;">Salvar</button></div><small>Ao salvar, o pedido aparecerá imediatamente para o entregador.</small></div></div>`;
    
    modalBody.innerHTML = customerHTML + itemsSectionHTML + addressHTML + paymentSectionHTML + `<h4 class="modal-section-title"><i class="fas fa-motorcycle"></i> Entregador</h4>${deliveryPersonSelectorHTML}`;
    
    const deliveryPersonSelect = modalBody.querySelector('#modal-delivery-person-select');
    if (delivery.assignedTo?.id && deliveryPersonSelect) {
        deliveryPersonSelect.value = delivery.assignedTo.id;
    }

    const saveDriverBtn = modalBody.querySelector('#modal-save-driver-btn');
    if (saveDriverBtn) {
        saveDriverBtn.addEventListener('click', () => {
            const selectedOption = deliveryPersonSelect.options[deliveryPersonSelect.selectedIndex];
            if (!selectedOption.value) {
                assignDriverToOrder(order.id, null);
                closeOrderDetailsModal();
                return;
            }
            const driverData = { id: selectedOption.value, name: selectedOption.dataset.name };
            assignDriverToOrder(order.id, driverData);
            closeOrderDetailsModal();
        });
    }

    const pixPaidToggle = modalBody.querySelector('#pix-paid-toggle');
    if (pixPaidToggle) {
        pixPaidToggle.addEventListener('change', async (e) => {
            const newPaidStatus = e.target.checked;
            const { doc, updateDoc } = window.firebaseFirestore;
            const orderRef = doc(window.db, "pedidos", order.id);
            try {
                await updateDoc(orderRef, { 'payment.pixPaid': newPaidStatus });
                window.showToast("Status do pagamento atualizado!");
                const statusLabel = modalBody.querySelector('.payment-status-wrapper .status-label');
                if(statusLabel) {
                    statusLabel.textContent = newPaidStatus ? 'Pago' : 'Não Pago';
                    statusLabel.classList.toggle('paid', newPaidStatus);
                }
            } catch (error) {
                console.error("Erro ao atualizar status do pagamento:", error);
                window.showToast("Erro ao atualizar pagamento.", "error");
                e.target.checked = !newPaidStatus; 
            }
        });
    }

    orderDetailsModal.classList.add('show');
}
window.openOrderDetailsModal = openOrderDetailsModal; 

function closeOrderDetailsModal() {
  const orderDetailsModal = document.getElementById('order-details-modal'); 
  if (orderDetailsModal) orderDetailsModal.classList.remove('show');
}

function getOrderType(order) {
  if (order.orderType) return order.orderType;
  if (order.source === 'WebApp') return 'Delivery';
  return 'Balcao';
}

function getOrderActionHTML(order) {
    if (['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(order.status)) {
        return `<div class="card-actions"><button class="btn btn-sm btn-danger refuse-order-btn" data-order-id="${order.id}"><i class="fas fa-times"></i> Recusar</button><button class="btn btn-sm btn-success accept-order-btn" data-order-id="${order.id}"><i class="fas fa-check"></i> Aceitar</button></div>`;
    } else {
        return `
        <select class="status-select-card" data-order-id="${order.id}">
            <option value="Em Preparo" ${order.status === 'Em Preparo' ? 'selected' : ''}>Em Preparo</option>
            <option value="Saiu para Entrega" ${order.status === 'Saiu para Entrega' ? 'selected' : ''}>Saiu para Entrega</option>
            <option value="Entregue" ${order.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
            <option value="Cancelado" ${order.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
        </select>`;
    }
}

function renderOrders() {
    const ordersListContainer = document.getElementById('orders-list-container');
    if (!ordersListContainer) return;
    const activeStatusFilter = document.querySelector('.order-status-filters .filter-tab.active')?.dataset.statusFilter || 'todos';
    const visibleOrders = allOrders.filter(o => !['Entregue', 'Cancelado', 'Finalizado'].includes(o.status));
    const typeCounters = { balcao: 0, delivery: 0, mesas: 0 };
    visibleOrders.forEach(o => {
        const type = getOrderType(o).toLowerCase();
        if (type in typeCounters) typeCounters[type]++;
    });
    
    const balcaoCountEl = document.querySelector('.summary-item[data-type-filter="balcao"] .count');
    if(balcaoCountEl) balcaoCountEl.textContent = typeCounters.balcao;
    const deliveryCountEl = document.querySelector('.summary-item[data-type-filter="delivery"] .count');
    if(deliveryCountEl) deliveryCountEl.textContent = typeCounters.delivery;
    const mesasCountEl = document.querySelector('.summary-item[data-type-filter="mesas"] .count');
    if(mesasCountEl) mesasCountEl.textContent = typeCounters.mesas;

    const statusCounters = { pendente: 0, 'em-preparo': 0, 'a-caminho': 0 };
    visibleOrders.forEach(o => {
      if(['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(o.status)) statusCounters.pendente++;
      else if(o.status === 'Em Preparo') statusCounters['em-preparo']++;
      else if(o.status === 'Saiu para Entrega') statusCounters['a-caminho']++;
    });
    const pendenteCountEl = document.querySelector('.filter-tab[data-status-filter="pendente"] .count');
    if(pendenteCountEl) pendenteCountEl.textContent = statusCounters.pendente;
    const emPreparoCountEl = document.querySelector('.filter-tab[data-status-filter="em-preparo"] .count');
    if(emPreparoCountEl) emPreparoCountEl.textContent = statusCounters['em-preparo'];
    const aCaminhoCountEl = document.querySelector('.filter-tab[data-status-filter="a-caminho"] .count');
    if(aCaminhoCountEl) aCaminhoCountEl.textContent = statusCounters['a-caminho'];
    
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
        ordersListContainer.innerHTML = `<div class="empty-orders-state"><i class="fas fa-receipt empty-state-icon"></i><p class="empty-state-message">Nenhum pedido encontrado com os filtros atuais.</p></div>`;
        return;
    }
    
    ordersListContainer.innerHTML = filteredOrders.map(order => {
        const orderTimestamp = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
        let typeIcon, typeText;
        const orderType = getOrderType(order);
        if (orderType === 'Delivery') { typeIcon = '<i class="fas fa-motorcycle"></i>'; typeText = 'Delivery'; } 
        else if (orderType === 'Mesa') { typeIcon = '<i class="fas fa-utensils"></i>'; typeText = 'Mesa'; } 
        else { typeIcon = '<i class="fas fa-store-alt"></i>'; typeText = 'Balcão'; }
        if (order.status === 'Saiu para Entrega') { typeIcon = '<i class="fas fa-shipping-fast a-caminho-icon"></i>'; typeText = 'A CAMINHO'; }
        let paymentTagHTML = '';
        if (order.payment) {
            if (order.payment.method === 'Pix') { paymentTagHTML = order.payment.pixPaid ? '<span class="tag tag-payment-paid">Pago</span>' : '<span class="tag tag-payment-unpaid">Pix Não Pago</span>'; } 
            else if (order.payment.method === 'Dinheiro' || order.payment.method.includes('Cartão')) { paymentTagHTML = '<span class="tag tag-payment-delivery">Pgto na Entrega</span>'; }
        }
        let actionHtml = getOrderActionHTML(order);
        return `<div class="order-card" data-order-id="${order.id}"><div class="card-header"><div class="order-type-id">${typeIcon} ${typeText} #${order.id.substring(0, 6)}</div><div class="order-timestamp">${orderTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div></div><div class="card-body"><div class="customer-name">${order.customer.firstName} ${order.customer.lastName}</div><div class="order-tags"><span class="tag tag-status">${order.status}</span>${paymentTagHTML}</div></div><div class="card-footer"><div class="order-value">R$ ${(order.totals.grandTotal || 0).toFixed(2).replace('.', ',')}</div>${actionHtml}</div></div>`;
    }).join('');
    
    addOrderCardEventListeners();
}

function listenForRealTimeOrders() {
    if (unsubscribeFromOrders) unsubscribeFromOrders();
    const { collection, query, orderBy, onSnapshot } = window.firebaseFirestore;
    const q = query(collection(window.db, "pedidos"), orderBy("createdAt", "desc"));
    let isInitialLoad = true;
    unsubscribeFromOrders = onSnapshot(q, snapshot => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderOrders();
        snapshot.docChanges().forEach(change => {
            if (change.type === "added" && !isInitialLoad) {
                new Audio('../audio/notification.mp3').play().catch(e => {});
            }
        });
        isInitialLoad = false;
    }, error => {
        console.error("Erro ao escutar pedidos em tempo real: ", error);
        const container = document.getElementById('orders-list-container');
        if(container) container.innerHTML = `<p>Erro ao carregar pedidos.</p>`;
    });
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
    if(!container) return;

    container.querySelectorAll('.accept-order-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        updateOrderStatus(btn.dataset.orderId, 'Em Preparo');
    }));

    container.querySelectorAll('.refuse-order-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateOrderStatus(btn.dataset.orderId, 'Cancelado');
    }));

    container.querySelectorAll('.status-select-card').forEach(select => {
        select.addEventListener('change', (e) => {
            const newStatus = e.target.value;
            const orderId = select.dataset.orderId;
            updateOrderStatus(orderId, newStatus);
        });
        select.addEventListener('click', e => e.stopPropagation());
    });

    container.querySelectorAll('.order-card').forEach(card => card.addEventListener('click', () => {
        const order = allOrders.find(o => o.id === card.dataset.orderId);
        if (order) openOrderDetailsModal(order);
    }));
}

async function initializeOrdersSection() {
    if (ordersSectionInitialized) {
        await fetchDeliveryPeople();
        renderOrders();
        return;
    }
    ordersSectionInitialized = true;
    
    console.log("Módulo Pedidos.js: Configurando pela primeira vez...");

    await fetchDeliveryPeople();
    listenForRealTimeOrders();

    const orderDetailsModal = document.getElementById('order-details-modal');
    if (orderDetailsModal) {
        const closeBtn = orderDetailsModal.querySelector('.close-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeOrderDetailsModal);
        }
        orderDetailsModal.addEventListener('click', (e) => {
            if (e.target === orderDetailsModal) closeOrderDetailsModal();
        });
    }

    const typeFilterTabs = document.querySelectorAll('.order-summary-bar .summary-item');
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

    const statusFilterTabs = document.querySelectorAll('.order-status-filters .filter-tab');
    if (statusFilterTabs.length > 0) {
        statusFilterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelector('.order-status-filters .filter-tab.active')?.classList.remove('active');
                tab.classList.add('active');
                renderOrders();
            });
        });
    }
}

window.initializeOrdersSection = initializeOrdersSection;