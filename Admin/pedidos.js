// pedidos.js - VERSÃO 100% COMPLETA E FINAL

let ordersSectionInitialized = false;
let unsubscribeFromOrders = null;
let allOrders = [];
let allDeliveryPeople = [];

// --- FUNÇÃO PARA DAR BAIXA NO ESTOQUE ---
async function deductIngredientsFromStock(orderId) {
    console.log(`Iniciando baixa de estoque para o pedido ${orderId}`);
    
    // Usa a instância e as funções que foram carregadas globalmente pelo firebase-init.js
    const { doc, collection, increment, runTransaction } = window.firebaseFirestore;
    const db = window.db;

    const orderRef = doc(db, "pedidos", orderId);

    try {
        // Agora o 'runTransaction' será encontrado corretamente
        await runTransaction(db, async (transaction) => {
            const orderSnap = await transaction.get(orderRef);
            if (!orderSnap.exists()) throw "Pedido não encontrado!";

            const orderData = orderSnap.data();
            if (orderData.stockDeducted) {
                console.log(`Estoque para o pedido ${orderId} já foi debitado.`);
                return;
            }

            const items = orderData.items || [];
            for (const item of items) {
                if (item.recipe && item.recipe.length > 0) {
                    for (const recipeItem of item.recipe) {
                        const ingredientRef = doc(db, "ingredientes", recipeItem.id);
                        const totalDeduction = recipeItem.quantity * item.quantity;
                        transaction.update(ingredientRef, { stock: increment(-totalDeduction) });
                    }
                }
            }
            transaction.update(orderRef, { stockDeducted: true });
        });
        window.showToast("Estoque atualizado com sucesso!", "success");
    } catch (error) {
        console.error("Erro na transação de baixa de estoque:", error);
        window.showToast("Falha ao atualizar o estoque.", "error");
    }
}


// --- FUNÇÕES DE DADOS (Firestore) ---
async function fetchDeliveryPeople() {
    if (!window.db) return [];
    const { collection, getDocs, query } = window.firebaseFirestore;
    try {
        const q = query(collection(window.db, "delivery_people"));
        const querySnapshot = await getDocs(q);
        allDeliveryPeople = querySnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        window.allDeliveryPeople = allDeliveryPeople;
        return allDeliveryPeople;
    } catch(e) {
        console.error("Erro ao buscar entregadores:", e);
        return [];
    }
}

async function updateOrderStatus(orderId, newStatus) {
    const { doc, updateDoc } = window.firebaseFirestore;
    const orderRef = doc(window.db, "pedidos", orderId);
    try {
        await updateDoc(orderRef, { status: newStatus, lastStatusUpdate: new Date() });
        window.showToast(`Pedido #${orderId.substring(0,6)} atualizado para ${newStatus}!`);
        if (newStatus === 'Em Preparo') {
            await deductIngredientsFromStock(orderId);
        }
    } catch (error) {
        console.error("Erro ao atualizar status do pedido:", error);
    }
}

async function assignDriverToOrder(orderId, driverData) {
    const { doc, updateDoc } = window.firebaseFirestore;
    const orderRef = doc(window.db, "pedidos", orderId);
    const dataToSave = driverData ? { 'delivery.assignedTo': { id: driverData.id, name: driverData.name } } : { 'delivery.assignedTo': null };
    await updateDoc(orderRef, dataToSave);
}

// --- FUNÇÕES DE UI (INTERFACE DO PAINEL) ---
function openOrderDetailsModal(order) {
    const orderDetailsModal = document.getElementById('order-details-modal');
    if (!order || !orderDetailsModal) return;

    const modalBody = orderDetailsModal.querySelector('.modal-body');
    const modalTitle = orderDetailsModal.querySelector('#modal-order-title');
    const { customer = {}, delivery = {}, payment = {}, totals = {}, items = [] } = order;

    modalTitle.innerHTML = `<i class="fas fa-receipt"></i> Pedido #${order.id.substring(0, 6).toUpperCase()}`;
    
    const customerHTML = `<h4 class="modal-section-title"><i class="fas fa-user"></i> Cliente</h4><div class="detail-grid"><div class="detail-item full-width"><strong>Nome</strong><span>${`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Não informado'}</span></div><div class="detail-item full-width"><strong>WhatsApp</strong><span>${customer.whatsapp || 'Não informado'}</span></div></div>`;
    
    const itemsHTML = items.length > 0 ? `<ul>${items.map(item => `<li><span class="item-quantity">${item.quantity}x</span><div class="item-info"><span class="item-name">${item.name}</span>${item.notes ? `<span class="item-notes">Obs: ${item.notes}</span>`: ''}</div><span class="item-price">${formatPrice((item.unitPrice || 0) * item.quantity)}</span></li>`).join('')}</ul>` : '<p>Nenhum item encontrado.</p>';
    const itemsSectionHTML = `<h4 class="modal-section-title"><i class="fas fa-shopping-basket"></i> Itens do Pedido</h4>${itemsHTML}`;

    const orderType = getOrderType(order);
    let addressHTML = '';
    if (orderType === 'Delivery') {
        const addressString = (delivery.address && delivery.address.replace(/,\s*$/, '').trim()) ? `${delivery.address}, ${delivery.neighborhood || ''}` : 'Endereço não fornecido';
        addressHTML = `<h4 class="modal-section-title"><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h4><div class="detail-item full-width"><span>${addressString}</span></div>`;
    }

    let paymentDetailsHTML = `
      <div class="detail-item"><strong>Subtotal</strong><span>${formatPrice(totals.subtotal)}</span></div>
      <div class="detail-item"><strong>Taxa de Entrega</strong><span>${formatPrice(totals.deliveryFee)}</span></div>
      ${totals.discount > 0 ? `<div class="detail-item"><strong>Desconto</strong><span class="text-success">- ${formatPrice(totals.discount)}</span></div>` : ''}
      <div class="detail-item total full-width"><strong>Total a Pagar</strong><span>${formatPrice(totals.grandTotal)}</span></div>
      <div class="detail-item full-width"><strong>Forma de Pagamento</strong><span>${payment.method || 'Não informada'}</span></div>
    `;
    if (payment.method === 'Pix') {
        const isPaid = payment.pixPaid === true;
        paymentDetailsHTML += `<div class="detail-item full-width payment-status-toggle-container"><strong>Status do Pagamento</strong><div class="payment-status-wrapper"><span class="status-label ${isPaid ? 'paid' : ''}">${isPaid ? 'Pago' : 'Não Pago'}</span><label class="switch"><input type="checkbox" id="pix-paid-toggle" ${isPaid ? 'checked' : ''}><span class="slider round"></span></label></div></div>`;
    }
    const paymentSectionHTML = `<h4 class="modal-section-title"><i class="fas fa-file-invoice-dollar"></i> Financeiro</h4><div class="detail-grid">${paymentDetailsHTML}</div>`;

    let deliveryPersonSelectorHTML = '';
    if (orderType === 'Delivery') {
        deliveryPersonSelectorHTML = `<h4 class="modal-section-title"><i class="fas fa-motorcycle"></i> Entregador</h4><div class="delivery-assignment-section"><div class="form-group"><label for="modal-delivery-person-select">Atribuir Entregador:</label><div class="input-with-icon right-icon"><select id="modal-delivery-person-select" class="form-control"><option value="">-- Nenhum --</option>${(allDeliveryPeople || []).map(p => `<option value="${p.docId}" data-name="${p.firstName}">${p.firstName} ${p.lastName}</option>`).join('')}</select><button id="modal-save-driver-btn" class="btn btn-sm btn-success" style="height: 100%; border-radius: 0 4px 4px 0;">Salvar</button></div></div></div>`;
    }

    modalBody.innerHTML = customerHTML + itemsSectionHTML + addressHTML + paymentSectionHTML + deliveryPersonSelectorHTML;
    
    if (orderType === 'Delivery') {
        const deliveryPersonSelect = modalBody.querySelector('#modal-delivery-person-select');
        if (delivery.assignedTo?.id && deliveryPersonSelect) {
            deliveryPersonSelect.value = delivery.assignedTo.id;
        }
        const saveDriverBtn = modalBody.querySelector('#modal-save-driver-btn');
        if (saveDriverBtn) {
            saveDriverBtn.addEventListener('click', () => {
                const selectedOption = deliveryPersonSelect.options[deliveryPersonSelect.selectedIndex];
                const driverData = selectedOption.value ? { id: selectedOption.value, name: selectedOption.dataset.name } : null;
                assignDriverToOrder(order.id, driverData);
                closeOrderDetailsModal();
            });
        }
    }

    const pixPaidToggle = modalBody.querySelector('#pix-paid-toggle');
    if (pixPaidToggle) {
        pixPaidToggle.addEventListener('change', async (e) => {
            const { doc, updateDoc } = window.firebaseFirestore;
            await updateDoc(doc(window.db, "pedidos", order.id), { 'payment.pixPaid': e.target.checked });
            window.showToast("Status do pagamento atualizado!");
        });
    }
    
    orderDetailsModal.classList.add('show');
}
window.openOrderDetailsModal = openOrderDetailsModal;

function closeOrderDetailsModal() {
  const orderDetailsModal = document.getElementById('order-details-modal'); 
  if (orderDetailsModal) orderDetailsModal.classList.remove('show');
}

function getOrderActionHTML(order) {
    if (['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(order.status)) {
        return `<div class="card-actions"><button class="btn btn-sm btn-danger refuse-order-btn" data-order-id="${order.id}"><i class="fas fa-times"></i> Recusar</button><button class="btn btn-sm btn-success accept-order-btn" data-order-id="${order.id}"><i class="fas fa-check"></i> Aceitar</button></div>`;
    } else {
        return `<select class="status-select-card" data-order-id="${order.id}"><option value="Aprovado" ${order.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option><option value="Em Preparo" ${order.status === 'Em Preparo' ? 'selected' : ''}>Em Preparo</option><option value="Saiu para Entrega" ${order.status === 'Saiu para Entrega' ? 'selected' : ''}>Saiu para Entrega</option><option value="Entregue" ${order.status === 'Entregue' ? 'selected' : ''}>Entregue</option><option value="Cancelado" ${order.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option></select>`;
    }
}

function getOrderType(order) {
    if (order.orderType) return order.orderType;
    if (order.source === 'WebApp') return 'Delivery';
    return 'Balcao';
}

function renderOrders() {
    const ordersListContainer = document.getElementById('orders-list-container');
    if (!ordersListContainer) return;
    allOrders.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
    const visibleOrders = allOrders.filter(o => !['Entregue', 'Cancelado', 'Finalizado'].includes(o.status));
    if (visibleOrders.length === 0) {
        ordersListContainer.innerHTML = `<div class="empty-orders-state"><i class="fas fa-receipt empty-state-icon"></i><p class="empty-state-message">Nenhum pedido ativo no momento.</p></div>`;
        return;
    }
    ordersListContainer.innerHTML = visibleOrders.map(order => {
        const customerName = `${order.customer?.firstName ?? ''} ${order.customer?.lastName ?? 'Cliente'}`.trim();
        const grandTotal = order.totals?.grandTotal ?? 0;
        const status = order.status ?? 'Indefinido';
        const orderTimestamp = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
        const orderType = getOrderType(order);
        let typeIcon, typeText;
        if (orderType === 'Delivery') { typeIcon = '<i class="fas fa-motorcycle"></i>'; typeText = 'Delivery'; }
        else { typeIcon = '<i class="fas fa-store-alt"></i>'; typeText = 'Balcão'; }
        if (status === 'Saiu para Entrega') { typeIcon = '<i class="fas fa-shipping-fast a-caminho-icon"></i>'; typeText = 'A CAMINHO'; }
        return `<div class="order-card" data-order-id="${order.id}"><div class="card-header"><div class="order-type-id">${typeIcon} ${typeText} #${order.id.substring(0, 6)}</div><div class="order-timestamp">${orderTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div></div><div class="card-body"><div class="customer-name">${customerName}</div><div class="order-tags"><span class="tag tag-status">${status}</span></div></div><div class="card-footer"><div class="order-value">R$ ${grandTotal.toFixed(2).replace('.', ',')}</div>${getOrderActionHTML(order)}</div></div>`;
    }).join('');
    addOrderCardActionListeners();
}

function listenForRealTimeOrders() {
    if (unsubscribeFromOrders) return;
    const { collection, query, onSnapshot, orderBy } = window.firebaseFirestore;
    const q = query(collection(window.db, "pedidos"), orderBy("createdAt", "desc"));
    unsubscribeFromOrders = onSnapshot(q, snapshot => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderOrders();
    });
}

function addOrderCardActionListeners() {
    const container = document.getElementById('orders-list-container');
    if(!container) return;
    container.querySelectorAll('.accept-order-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); updateOrderStatus(btn.dataset.orderId, 'Aprovado'); }));
    container.querySelectorAll('.refuse-order-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); updateOrderStatus(btn.dataset.orderId, 'Cancelado'); }));
    container.querySelectorAll('.status-select-card').forEach(select => {
        select.addEventListener('change', (e) => updateOrderStatus(select.dataset.orderId, e.target.value));
        select.addEventListener('click', e => e.stopPropagation());
    });
    container.querySelectorAll('.order-card').forEach(card => card.addEventListener('click', () => {
        const order = allOrders.find(o => o.id === card.dataset.orderId);
        if (order) openOrderDetailsModal(order);
    }));
}

async function initializeOrdersSection() {
    if (!ordersSectionInitialized) {
        ordersSectionInitialized = true;
        console.log("Módulo Pedidos.js: Configurando eventos pela primeira vez...");
        
        const orderDetailsModal = document.getElementById('order-details-modal');
        if (orderDetailsModal) {
            orderDetailsModal.querySelector('.close-modal-btn')?.addEventListener('click', closeOrderDetailsModal);
            orderDetailsModal.addEventListener('click', (e) => {
                if (e.target === orderDetailsModal) closeOrderDetailsModal();
            });
        }
        
        await fetchDeliveryPeople();
        listenForRealTimeOrders();

        document.querySelectorAll('.order-status-filters .filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelector('.order-status-filters .filter-tab.active')?.classList.remove('active');
                tab.classList.add('active');
                renderOrders();
            });
        });
    }
    renderOrders();
}

window.initializeOrdersSection = initializeOrdersSection;