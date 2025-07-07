// pedidos.js - VERSÃO COMPLETA E CORRIGIDA COM O ID CORRETO DO ENTREGADOR

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

async function assignDriverToOrder(orderId, driverData) {
    const { doc, updateDoc } = window.firebaseFirestore;
    const orderRef = doc(window.db, "pedidos", orderId);
    try {
        // Salva um objeto com o ID (googleUid) e o nome do entregador
        await updateDoc(orderRef, { 'delivery.assignedTo': { id: driverData.id, name: driverData.name } });
        window.showToast(`Entregador ${driverData.name} atribuído ao pedido!`);
    } catch (error) {
        console.error("Erro ao atribuir entregador:", error);
        window.showToast("Falha ao atribuir entregador.", "error");
    }
}

// --- Funções de UI (Interface do Painel) ---

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
        paymentDetailsHTML += `<div class="detail-item full-width payment-status-toggle-container"><strong>Status do Pagamento</strong><div class="payment-status-wrapper"><span class="status-label ${isPaid ? 'paid' : ''}">${isPaid ? 'Pago' : 'Não Pago'}</span><label class="switch"><input type="checkbox" id="pix-paid-toggle" ${isPaid ? 'checked' : ''}><span class="slider round"></span></label></div></div>`;
    }
    const paymentSectionHTML = `<h4 class="modal-section-title"><i class="fas fa-file-invoice-dollar"></i> Financeiro</h4><div class="detail-grid">${paymentDetailsHTML}</div>`;
    
    // --- CORREÇÃO PRINCIPAL AQUI ---
    // Agora, a lista de entregadores usa o 'googleUid' como valor da opção.
    // E só mostra entregadores que já fizeram login pelo menos uma vez.
    const deliveryPersonSelectorHTML = `<div class="delivery-assignment-section">
        <div class="form-group">
            <label for="modal-delivery-person-select">Atribuir Entregador:</label>
            <div class="input-with-icon right-icon">
                <select id="modal-delivery-person-select" class="form-control">
                    <option value="">-- Nenhum --</option>
                    ${allDeliveryPeople
                        .filter(p => p.googleUid) // Filtra para incluir apenas quem tem googleUid
                        .map(p => `<option value="${p.googleUid}" data-name="${p.firstName}">${p.firstName} ${p.lastName}</option>`)
                        .join('')
                    }
                </select>
                <button id="modal-save-driver-btn" class="btn btn-sm btn-success" style="height: 100%; border-radius: 0 4px 4px 0;">Salvar</button>
            </div>
            <small>Apenas entregadores que já fizeram login ao menos uma vez aparecerão aqui.</small>
        </div>
    </div>`;
    // --- FIM DA CORREÇÃO ---

    modalBody.innerHTML = customerHTML + itemsSectionHTML + addressHTML + paymentSectionHTML + `<h4 class="modal-section-title"><i class="fas fa-motorcycle"></i> Entregador</h4>${deliveryPersonSelectorHTML}`;
    
    const deliveryPersonSelect = modalBody.querySelector('#modal-delivery-person-select');
    if (delivery.assignedTo?.id && deliveryPersonSelect) {
        deliveryPersonSelect.value = delivery.assignedTo.id;
    }

    const saveDriverBtn = modalBody.querySelector('#modal-save-driver-btn');
    if (saveDriverBtn) {
        saveDriverBtn.addEventListener('click', () => {
            const selectedOption = deliveryPersonSelect.options[deliveryPersonSelect.selectedIndex];
            if (!selectedOption.value) { return; }
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

function closeOrderDetailsModal() {
  const orderDetailsModal = document.getElementById('order-details-modal'); 
  if (orderDetailsModal) orderDetailsModal.classList.remove('show');
}

function getOrderActionHTML(order) {
    if (['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(order.status)) {
        return `<div class="card-actions"><button class="btn btn-sm btn-danger refuse-order-btn" data-order-id="${order.id}"><i class="fas fa-times"></i> Recusar</button><button class="btn btn-sm btn-success accept-order-btn" data-order-id="${order.id}"><i class="fas fa-check"></i> Aceitar</button></div>`;
    } else {
        return `<select class="status-select-card" data-order-id="${order.id}"><option value="Em Preparo" ${order.status === 'Em Preparo' ? 'selected' : ''}>Em Preparo</option><option value="Saiu para Entrega" ${order.status === 'Saiu para Entrega' ? 'selected' : ''}>Saiu para Entrega</option><option value="Entregue" ${order.status === 'Entregue' ? 'selected' : ''}>Entregue</option><option value="Cancelado" ${order.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option></select>`;
    }
}

function renderOrders() {
    const ordersListContainer = document.getElementById('orders-list-container');
    if (!ordersListContainer) return;

    const visibleOrders = allOrders.filter(o => !['Entregue', 'Cancelado', 'Finalizado'].includes(o.status));
    
    if (visibleOrders.length === 0) {
        ordersListContainer.innerHTML = `<div class="empty-orders-state"><i class="fas fa-receipt empty-state-icon"></i><p class="empty-state-message">Nenhum pedido ativo no momento.</p></div>`;
        return;
    }
    
    ordersListContainer.innerHTML = visibleOrders.map(order => {
        const orderTimestamp = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
        let paymentTagHTML = '';
        if (order.payment) {
            if (order.payment.method === 'Pix') { paymentTagHTML = order.payment.pixPaid ? '<span class="tag tag-payment-paid">Pago</span>' : '<span class="tag tag-payment-unpaid">Pix Não Pago</span>'; } 
            else if (order.payment.method === 'Dinheiro' || order.payment.method.includes('Cartão')) { paymentTagHTML = '<span class="tag tag-payment-delivery">Pgto na Entrega</span>'; }
        }
        let actionHtml = getOrderActionHTML(order);
        return `<div class="order-card" data-order-id="${order.id}"><div class="card-header"><div class="order-type-id">#${order.id.substring(0, 6)}</div><div class="order-timestamp">${orderTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div></div><div class="card-body"><div class="customer-name">${order.customer.firstName} ${order.customer.lastName}</div><div class="order-tags"><span class="tag tag-status">${order.status}</span>${paymentTagHTML}</div></div><div class="card-footer"><div class="order-value">R$ ${(order.totals.grandTotal || 0).toFixed(2).replace('.', ',')}</div>${actionHtml}</div></div>`;
    }).join('');
    
    addOrderCardEventListeners();
}

function listenForRealTimeOrders() {
    if (unsubscribeFromOrders) unsubscribeFromOrders();
    const { collection, query, orderBy, onSnapshot, limit } = window.firebaseFirestore;
    const q = query(collection(window.db, "pedidos"), orderBy("createdAt", "desc"), limit(50));
    let isInitialLoad = true;
    unsubscribeFromOrders = onSnapshot(q, snapshot => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderOrders();
        if (!isInitialLoad && snapshot.docChanges().some(c => c.type === 'added')) {
            new Audio('../audio/notification.mp3').play().catch(e => {});
        }
        isInitialLoad = false;
    }, error => {
        console.error("Erro ao escutar pedidos em tempo real: ", error);
        const container = document.getElementById('orders-list-container');
        if(container) container.innerHTML = `<p>Erro ao carregar pedidos.</p>`;
    });
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
}

window.initializeOrdersSection = initializeOrdersSection;