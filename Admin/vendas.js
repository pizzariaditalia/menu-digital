// vendas.js - VERSÃO FINAL COM TRAVA DE SEGURANÇA NA INICIALIZAÇÃO

// Esta função não muda e permanece como está
async function deleteOrder(orderId) {
  if (!confirm(`Tem certeza que deseja excluir o pedido #${orderId.substring(0, 6)} permanentemente? Esta ação não pode ser desfeita.`)) {
    return false;
  }
  try {
    const {
      doc,
      deleteDoc
    } = window.firebaseFirestore;
    await deleteDoc(doc(window.db, "pedidos", orderId));
    window.showToast("Pedido excluído com sucesso!", "success");
    return true;
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    window.showToast("Ocorreu um erro ao excluir o pedido.", "error");
    return false;
  }
}

// A função de inicialização foi reestruturada para ser mais segura
async function initializeVendasSection() {

  // Seleciona os elementos do DOM
  const startDateInput = document.getElementById('sales-start-date');
  const endDateInput = document.getElementById('sales-end-date');
  const filterBtn = document.getElementById('filter-sales-btn');
  const salesListContainer = document.getElementById('sales-list-container');
  const totalValueEl = document.getElementById('sales-total-value');
  const totalCountEl = document.getElementById('sales-total-count');

  // ================== AQUI ESTÁ A CORREÇÃO ==================
  // Trava de segurança: Se algum elemento essencial não for encontrado,
  // a função para e avisa no console, evitando o erro.
  if (!startDateInput || !endDateInput || !filterBtn || !salesListContainer) {
    console.error("Erro Crítico: Elementos essenciais da seção de Vendas não foram encontrados no HTML.");
    return;
  }
  // =========================================================

  // Função interna para formatar a data
  const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR');

  // Função principal que busca e desenha os dados na tela
  const fetchAndRenderSales = async (startDate, endDate) => {
    salesListContainer.innerHTML = '<p class="empty-list-message">Buscando dados...</p>';

    const {
      collection,
      query,
      where,
      getDocs,
      orderBy,
      Timestamp
    } = window.firebaseFirestore;

    try {
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);

      const ordersQuery = query(
        collection(window.db, "pedidos"),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<', Timestamp.fromDate(adjustedEndDate)),
        orderBy('createdAt', 'desc')
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const allFetchedOrders = ordersSnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }));
      let salesData = allFetchedOrders.filter(order => order.status !== 'Cancelado');

      // Atualiza os totais no painel
      totalValueEl.textContent = salesData.reduce((sum, order) => sum + (order.totals?.grandTotal || 0), 0).toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL'
      });
      totalCountEl.textContent = salesData.length;

      // Renderiza a lista de pedidos
      if (salesData.length === 0) {
        salesListContainer.innerHTML = '<p class="empty-list-message">Nenhum pedido encontrado para o período.</p>';
      } else {
        const cardsHTML = salesData.map(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate(): new Date();
          const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim();
          return `
          <div class="sales-card" data-order-id="${order.id}">
          <div class="info-id">#${order.id.substring(0, 6).toUpperCase()}</div>
          <div class="info-date">${formatDate(orderDate)}</div>
          <div class="info-customer">${customerName || 'Cliente PDV'}</div>
          <div class="info-status"><span class="tag tag-status">${order.status || 'N/A'}</span></div>
          <div class="info-value">${(order.totals?.grandTotal || 0).toLocaleString('pt-BR', {
            style: 'currency', currency: 'BRL'
          })}</div>
          <div class="info-actions">
          <button class="btn-icon delete-order-btn" title="Excluir Pedido"><i class="fas fa-trash-alt"></i></button>
          </div>
          </div>`;
        }).join('');
        salesListContainer.innerHTML = `<div class="sales-card-grid">${cardsHTML}</div>`;

        salesListContainer.querySelectorAll('.delete-order-btn').forEach(button => {
          button.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (await deleteOrder(e.target.closest('.sales-card').dataset.orderId)) {
              filterBtn.click();
            }
          });
        });
        salesListContainer.querySelectorAll('.sales-card').forEach(card => {
          card.addEventListener('click',
            (e) => {
              if (e.target.closest('.delete-order-btn')) return;
              const orderData = allFetchedOrders.find(o => o.id === card.dataset.orderId);
              if (orderData && typeof openOrderDetailsModal === 'function') {
                openOrderDetailsModal(orderData);
              }
            });
        });
      }
    } catch (error) {
      console.error("Erro ao buscar relatório de vendas:", error);
      salesListContainer.innerHTML = `<p class="empty-list-message" style="color:var(--admin-danger-red);">Ocorreu um erro ao buscar os pedidos.</p>`;
    }
  }

  // Função que é chamada pelo botão de filtro
  const handleFilterClick = () => {
    if (startDateInput.value && endDateInput.value) {
      const startDate = new Date(startDateInput.value.replace(/-/g, '/'));
      const endDate = new Date(endDateInput.value.replace(/-/g, '/'));
      fetchAndRenderSales(startDate, endDate);
    } else {
      window.showToast("Por favor, selecione data de início e fim.", "warning");
    }
  };

  // Esta parte só executa na PRIMEIRA vez para configurar o botão
  if (!filterBtn.dataset.listenerAttached) {
    filterBtn.dataset.listenerAttached = 'true';
    console.log("Módulo Vendas.js: Configurando eventos pela primeira vez...");
    filterBtn.addEventListener('click', handleFilterClick);

    const today = new Date();
    startDateInput.valueAsDate = today;
    endDateInput.valueAsDate = today;
  }

  // Esta linha executa TODA VEZ, garantindo que os dados sejam carregados
  handleFilterClick();
}

window.initializeVendasSection = initializeVendasSection;