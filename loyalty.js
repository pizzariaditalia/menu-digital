// loyalty.js - VERSÃO COM BOTÃO "PEDIR NOVAMENTE" FUNCIONAL E CORREÇÕES DE RENDERIZAÇÃO

// --- Estrutura dos Níveis de Desconto de Fidelidade ---
const DISCOUNT_TIERS = [{
  points: 20,
  percentage: 0.20,
  label: "Usar 20 pontos para 20% de desconto em pizzas"
},
  {
    points: 16,
    percentage: 0.15,
    label: "Usar 16 pontos para 15% de desconto em pizzas"
  },
  {
    points: 12,
    percentage: 0.10,
    label: "Usar 12 pontos para 10% de desconto em pizzas"
  },
  {
    points: 8,
    percentage: 0.05,
    label: "Usar 8 pontos para 5% de desconto em pizzas"
  }];

window.getApplicableDiscount = (customerPoints) => {
  if (typeof customerPoints !== 'number' || customerPoints <= 0) return null;
  for (const tier of DISCOUNT_TIERS) {
    if (customerPoints >= tier.points) {
      return {
        pointsToUse: tier.points,
        percentage: tier.percentage,
        label: tier.label
      };
    }
  }
  return null;
};


document.addEventListener('DOMContentLoaded', () => {
  // --- Seletores de Elementos do DOM ---
  const loyaltyButton = document.getElementById('loyalty-button');
  const loyaltyModal = document.getElementById('loyalty-modal');
  const closeLoyaltyModalButton = document.getElementById('close-loyalty-modal');
  const loyaltyWhatsAppInput = document.getElementById('loyalty-whatsapp');
  const viewPointsButton = document.getElementById('view-points-button');
  const loyaltyResultsArea = document.getElementById('loyalty-results-area');
  const lastOrdersButton = document.getElementById('last-orders-button');
  const lastOrdersModal = document.getElementById('last-orders-modal');
  const lastOrdersListDiv = document.getElementById('last-orders-list');
  const closeLastOrdersModalButton = lastOrdersModal?.querySelector('.close-button');


  function showWelcomePointsPopup(points) {
    const popup = document.getElementById('welcome-points-popup');
    const pointsValueSpan = document.getElementById('popup-points-value');
    if (!popup || !pointsValueSpan) return;
    pointsValueSpan.textContent = points || 0;
    popup.classList.add('show');
    setTimeout(() => {
      popup.classList.remove('show');
    }, 5000);
  }

  async function getCustomerFromFirestore(whatsappNumber) {
    if (!window.db || !window.firebaseFirestore) {
      console.error("Firestore não inicializado.");
      return null;
    }
    try {
      const {
        doc,
        getDoc
      } = window.firebaseFirestore;
      const customerDocRef = doc(window.db, "customer", whatsappNumber);
      const docSnap = await getDoc(customerDocRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Erro ao buscar cliente no Firestore:", error);
      return null;
    }
  }

  function displayCustomerWelcomeInfo(customer) {
    if (lastOrdersButton) {
      if (customer && customer.points > 0) {
        lastOrdersButton.style.display = 'flex';
      } else {
        lastOrdersButton.style.display = 'none';
      }
    }
  }
  window.displayCustomerWelcomeInfo = displayCustomerWelcomeInfo;

  async function loadCurrentCustomerOnPageLoad() {
    const activeWhatsapp = localStorage.getItem('activeCustomerWhatsapp');
    if (activeWhatsapp) {
      const customer = await getCustomerFromFirestore(activeWhatsapp);
      if (customer) {
        window.currentCustomerDetails = customer;
        displayCustomerWelcomeInfo(customer);
        showWelcomePointsPopup(customer.points);
      } else {
        localStorage.removeItem('activeCustomerWhatsapp');
        window.currentCustomerDetails = null;
        displayCustomerWelcomeInfo(null);
      }
    } else {
      window.currentCustomerDetails = null;
      displayCustomerWelcomeInfo(null);
    }
  }

  function openLoyaltyModal() {
    if (!loyaltyModal) return;
    if (loyaltyWhatsAppInput) {
      loyaltyWhatsAppInput.value = localStorage.getItem('activeCustomerWhatsapp') || '';
    }
    if (loyaltyResultsArea) loyaltyResultsArea.innerHTML = '';
    loyaltyModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeLoyaltyModal() {
    if (loyaltyModal) loyaltyModal.classList.remove('show');
    document.body.style.overflow = '';
  }

  async function fetchLastOrders(customerId) {
    if (!window.db || !window.firebaseFirestore) return [];
    const {
      collection,
      query,
      where,
      orderBy,
      limit,
      getDocs
    } = window.firebaseFirestore;
    const q = query(collection(window.db, "pedidos"), where("customer.whatsapp", "==", customerId), orderBy("createdAt", "desc"), limit(3));
    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar últimos pedidos:", error);
      return [];
    }
  }

  // =========================================================================
  // FUNÇÃO ATUALIZADA E ROBUSTA PARA RENDERIZAR OS PEDIDOS
  // =========================================================================
  function renderLastOrders(orders) {
    if (!lastOrdersListDiv) return;

    if (orders.length === 0) {
      lastOrdersListDiv.innerHTML = '<p class="empty-list-message">Nenhum pedido encontrado no seu histórico.</p>';
      return;
    }

    const formatPrice = (price) => price.toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL'
    });

    lastOrdersListDiv.innerHTML = orders.map(order => {
      // Verificação de segurança para a data do pedido
      let formattedDate = 'Data indisponível';
      if (order.createdAt && typeof order.createdAt.toDate === 'function') {
        const orderDate = order.createdAt.toDate();
        formattedDate = `${orderDate.toLocaleDateString('pt-BR')} às ${orderDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit'
        })}`;
      }

      // Verificação de segurança para o ID do pedido, usando o ID do documento como fallback
      const displayOrderId = (order.orderId || order.id || 'N/A').substring(0, 8);

      return `
      <div class="order-history-card">
        <div class="order-history-header">
          <span class="order-id">Pedido #${displayOrderId}</span>
          <span class="order-status">${order.status || 'Status N/A'}</span>
        </div>
        <div class="order-history-body">
          <p class="order-date">${formattedDate}</p>
          <ul>
            ${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}
          </ul>
        </div>
        <div class="order-history-footer">
          <span class="order-total">Total: ${formatPrice(order.totals.grandTotal)}</span>
          <button class="btn-reorder" data-order-id="${order.id}">Pedir Novamente</button>
        </div>
      </div>
      `;
    }).join('');

    // Adiciona o evento de clique aos novos botões
    lastOrdersListDiv.querySelectorAll('.btn-reorder').forEach(button => {
      button.addEventListener('click', (event) => {
        const orderId = event.target.dataset.orderId;
        const orderToReorder = orders.find(o => o.id === orderId);

        if (orderToReorder && orderToReorder.items) {
          // Adiciona cada item do pedido antigo ao carrinho
          orderToReorder.items.forEach(item => {
            window.addToCart(item);
          });

          // Fecha o modal de histórico e abre o carrinho para o cliente ver
          closeLastOrdersModal();
          window.openCartModal();
        }
      });
    });
  }


  async function openLastOrdersModal() {
    if (!lastOrdersModal || !window.currentCustomerDetails) return;
    lastOrdersModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    lastOrdersListDiv.innerHTML = '<p>Buscando seu histórico de pedidos...</p>';
    const orders = await fetchLastOrders(window.currentCustomerDetails.whatsapp);
    renderLastOrders(orders);
  }

  function closeLastOrdersModal() {
    if (lastOrdersModal) lastOrdersModal.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (loyaltyButton) loyaltyButton.addEventListener('click', openLoyaltyModal);
  if (closeLoyaltyModalButton) closeLoyaltyModalButton.addEventListener('click', closeLoyaltyModal);
  if (loyaltyModal) loyaltyModal.addEventListener('click', (event) => {
    if (event.target === loyaltyModal) closeLoyaltyModal();
  });
  if (lastOrdersButton) lastOrdersButton.addEventListener('click', openLastOrdersModal);
  if (closeLastOrdersModalButton) closeLastOrdersModalButton.addEventListener('click', closeLastOrdersModal);
  if (lastOrdersModal) lastOrdersModal.addEventListener('click', (event) => {
    if (event.target === lastOrdersModal) closeLastOrdersModal();
  });

  // Copie e cole esta função inteira, substituindo a antiga em loyalty.js

async function handleViewPoints() {
    if (!loyaltyWhatsAppInput || !loyaltyResultsArea) return;
    const whatsappNumber = loyaltyWhatsAppInput.value.trim().replace(/\D/g, '');

    if (!/^[0-9]{10,11}$/.test(whatsappNumber)) {
        loyaltyResultsArea.innerHTML = `<p style="color: var(--primary-red);">Número do WhatsApp inválido.</p>`;
        return;
    }

    viewPointsButton.disabled = true;
    viewPointsButton.textContent = "Buscando...";
    const customer = await getCustomerFromFirestore(whatsappNumber);
    viewPointsButton.disabled = false;
    viewPointsButton.textContent = "Ver Meus Pontos";

    // --- Início da Correção ---
    // Removemos a lógica de atualização daqui e centralizamos em uma nova função.
    updateGlobalCustomerState(customer, whatsappNumber);
    // --- Fim da Correção ---
}

// NOVA FUNÇÃO: Adicione esta nova função em qualquer lugar dentro do arquivo loyalty.js
// Ela será a responsável por atualizar todo o site com os dados do cliente.
function updateGlobalCustomerState(customerData, whatsapp) {
    if (customerData) {
        // 1. Armazena os dados globalmente e no navegador
        window.currentCustomerDetails = customerData;
        localStorage.setItem('activeCustomerWhatsapp', whatsapp);

        // 2. Mostra a mensagem de pontos no modal de fidelidade
        if (loyaltyResultsArea) {
             loyaltyResultsArea.innerHTML = `
                <div class="points-display-banner">
                    <p class="points-banner-text">Parabéns, ${customerData.firstName || ''}! Você tem</p>
                    <span class="points-banner-value">${customerData.points || 0}</span>
                    <span class="points-banner-label">PTS</span>
                </div>
            `;
        }
       
        // 3. Atualiza a UI principal (botão de últimos pedidos e pop-up de boas-vindas)
        displayCustomerWelcomeInfo(customerData);
        showWelcomePointsPopup(customerData.points);

    } else {
        // Se não encontrou cliente, limpa tudo
        window.currentCustomerDetails = null;
        localStorage.removeItem('activeCustomerWhatsapp');
        if (loyaltyResultsArea) {
            loyaltyResultsArea.innerHTML = `
                <p>Nenhum cadastro encontrado para este número.</p>
                <p style="font-size:0.9em; margin-top:10px;">Faça seu primeiro pedido para se cadastrar!</p>
            `;
        }
        displayCustomerWelcomeInfo(null);
    }
    
    // 4. AVISA O CARRINHO PARA ATUALIZAR A UI (mostrar opções de desconto, etc)
    // Esta é a parte crucial que estava faltando ser mais robusta.
    if (typeof window.updateCartUI === 'function') {
        window.updateCartUI();
    }
}
