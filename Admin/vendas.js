// Arquivo: vendas.js
// VERSÃO FINAL COM TOP 5 EM FORMATO DE LISTA

async function initializeVendasSection() {
    const startDateInput = document.getElementById('sales-start-date');
    const endDateInput = document.getElementById('sales-end-date');
    const filterBtn = document.getElementById('filter-sales-btn');
    const totalValueEl = document.getElementById('sales-total-value');
    const totalCountEl = document.getElementById('sales-total-count');
    const totalDeliveryFeesEl = document.getElementById('sales-total-delivery-fees');
    const salesListContainer = document.getElementById('sales-list-container');
    const paymentSummaryContainer = document.getElementById('payment-method-summary');
    const bestsellersContainer = document.getElementById('bestsellers-section-container');
    const bestsellersList = document.getElementById('bestsellers-list');
    let salesData = [];

    const formatDate = (date) => {
        if (!date || !date.getDate) return '--';
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    }

    const fetchAndRenderSales = async (startDate, endDate) => {
        salesListContainer.innerHTML = '<p class="empty-list-message">Buscando pedidos...</p>';
        if (paymentSummaryContainer) paymentSummaryContainer.innerHTML = '';
        if (bestsellersContainer) bestsellersContainer.style.display = 'none';
        if (bestsellersList) bestsellersList.innerHTML = '';
        
        const { collection, query, where, getDocs, orderBy, Timestamp } = window.firebaseFirestore;
        const db = window.db;

        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);

        try {
            const q = query(
                collection(db, "pedidos"),
                where('createdAt', '>=', Timestamp.fromDate(startDate)),
                where('createdAt', '<', Timestamp.fromDate(adjustedEndDate)),
                orderBy('createdAt', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const allFetchedOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            salesData = allFetchedOrders.filter(order => order.status !== 'Cancelado');

            const totalValue = salesData.reduce((sum, order) => sum + (order.totals?.grandTotal || 0), 0);
            const totalCount = salesData.length;
            const totalDeliveryFees = salesData.reduce((sum, order) => sum + (order.totals?.deliveryFee || 0), 0);

            totalValueEl.textContent = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            totalCountEl.textContent = totalCount;
            if (totalDeliveryFeesEl) {
                totalDeliveryFeesEl.textContent = totalDeliveryFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            if (paymentSummaryContainer) {
                const paymentTotals = { 'Pix': 0, 'Cartão de Crédito': 0, 'Cartão de Débito': 0, 'Dinheiro': 0 };
                salesData.forEach(order => {
                    const method = order.payment?.method;
                    const value = order.totals?.grandTotal || 0;
                    if (method in paymentTotals) { paymentTotals[method] += value; }
                });
                paymentSummaryContainer.innerHTML = `
                    <div class="payment-summary-box pix"><span class="label"><i class="fas fa-qrcode"></i> Pix</span><span class="value">${paymentTotals['Pix'].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                    <div class="payment-summary-box cartao"><span class="label"><i class="fas fa-credit-card"></i> Cartão</span><span class="value">${(paymentTotals['Cartão de Crédito'] + paymentTotals['Cartão de Débito']).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                    <div class="payment-summary-box dinheiro"><span class="label"><i class="fas fa-money-bill-wave"></i> Dinheiro</span><span class="value">${paymentTotals['Dinheiro'].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                `;
            }
            
            // LÓGICA ATUALIZADA PARA O TOP 5 EM FORMATO DE LISTA
            if (bestsellersContainer && salesData.length > 0) {
                const productCount = {};
                salesData.forEach(order => {
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach(item => {
                            const name = item.name.split(' (Borda:')[0].trim();
                            productCount[name] = (productCount[name] || 0) + item.quantity;
                        });
                    }
                });
                const sortedProducts = Object.entries(productCount).sort((a, b) => b[1] - a[1]);
                
                bestsellersList.innerHTML = sortedProducts.slice(0, 5).map(([name, quantity], index) => {
                    const rank = index + 1;
                    return `
                        <li class="top5-list-item rank-${rank}">
                            <span class="rank">#${rank}</span>
                            <span class="product-name">${name}</span>
                            <span class="quantity-sold">${quantity}<span> vendas</span></span>
                        </li>
                    `;
                }).join('');
                
                bestsellersContainer.style.display = 'block';
            }

            if (totalCount === 0) {
                salesListContainer.innerHTML = '<p class="empty-list-message">Nenhum pedido (não cancelado) encontrado para o período selecionado.</p>';
            } else {
                const cardsHTML = salesData.map(order => {
                    const orderDate = order.createdAt.toDate();
                    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim();
                    return `<div class="sales-card" data-order-id="${order.id}" style="cursor: pointer;"><div class="info-id">#${order.id.substring(0, 6).toUpperCase()}</div><div class="info-date">${formatDate(orderDate)}</div><div class="info-customer">${customerName || 'Cliente PDV'}</div><div class="info-status"><span class="tag tag-status">${order.status || 'N/A'}</span></div><div class="info-value">${(order.totals?.grandTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div></div>`;
                }).join('');
                salesListContainer.innerHTML = `<div class="sales-card-grid">${cardsHTML}</div>`;
                salesListContainer.querySelectorAll('.sales-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const orderId = card.dataset.orderId;
                        const orderData = salesData.find(o => o.id === orderId);
                        if(orderData && typeof openOrderDetailsModal === 'function') { openOrderDetailsModal(orderData); }
                    });
                });
            }
        } catch (error) {
            console.error("Erro ao buscar relatório de vendas:", error);
            salesListContainer.innerHTML = `<p class="empty-list-message" style="color:var(--admin-danger-red);">Ocorreu um erro ao buscar os pedidos.</p>`;
        }
    }

    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            const startDateValue = startDateInput.value;
            const endDateValue = endDateInput.value;
            if (startDateValue && endDateValue) {
                const startDate = new Date(startDateValue.replace(/-/g, '/'));
                const endDate = new Date(endDateValue.replace(/-/g, '/'));
                fetchAndRenderSales(startDate, endDate);
            } else {
                window.showToast("Por favor, selecione data de início e fim.", "warning");
            }
        });
    }

    const today = new Date();
    startDateInput.valueAsDate = today;
    endDateInput.valueAsDate = today;
    fetchAndRenderSales(today, today);
}
window.initializeVendasSection = initializeVendasSection;