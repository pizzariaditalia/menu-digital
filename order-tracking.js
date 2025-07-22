// order-tracking.js

document.addEventListener('DOMContentLoaded', () => {
  // Array com as etapas do pedido na ordem correta
  const ORDER_STEPS = [{
    status: "Recebido", description: "Pedido feito"
  },
    {
      status: "Aguardando Comprovante", description: "Aguardando comprovante Pix"
    },
    {
      status: "Em Preparo", description: "Pedido confirmado e sendo preparado"
    },
    {
      status: "Saiu para Entrega", description: "Pedido a caminho da sua casa"
    },
    {
      status: "Entregue", description: "Pedido entregue. Bom apetite!"
    }];

  let unsubscribeFromOrder = null; // Variável para parar de "ouvir" o pedido antigo

  // Função principal que inicia o acompanhamento
  function startOrderTracking(orderId) {
    if (unsubscribeFromOrder) {
      unsubscribeFromOrder(); // Para de ouvir o pedido anterior, se houver
    }

    const {
      doc,
      onSnapshot
    } = window.firebaseFirestore;
    const orderRef = doc(window.db, "pedidos", orderId);

    unsubscribeFromOrder = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        const orderData = docSnap.data();
        updateTrackerUI(orderData, orderId);
      } else {
        // Pedido não encontrado ou foi excluído
        hideTrackerUI();
      }
    });
  }

  // Função que atualiza a interface (card e modal)
  function updateTrackerUI(orderData,
    orderId) {
    const trackerBar = document.getElementById('order-status-tracker');
    const trackerTitle = trackerBar.querySelector('.tracker-title');
    const progressBar = trackerBar.querySelector('.progress');

    const modal = document.getElementById('order-tracking-modal');
    const modalOrderId = document.getElementById('tracking-order-id');
    const modalStatusList = document.getElementById('tracking-status-list');

    const currentStatus = orderData.status;
    const currentIndex = ORDER_STEPS.findIndex(step => step.status === currentStatus);

    // Se o pedido foi entregue ou cancelado, esconde o tracker após alguns segundos
    if (currentStatus === "Entregue" || currentStatus === "Cancelado") {
      setTimeout(() => {
        hideTrackerUI();
        localStorage.removeItem('lastActiveOrderId');
      }, 10000); // Esconde após 10 segundos
    } else {
      trackerBar.classList.remove('hidden');
    }

    // Atualiza o card flutuante
    const currentStepInfo = ORDER_STEPS[currentIndex] || {
      description: currentStatus
    };
    trackerTitle.textContent = `Seu pedido está ${currentStatus.toLowerCase()}`;

    // A barra de progresso avança uma etapa extra para parecer mais completa
    const progressPercentage = (currentIndex + 1) / (ORDER_STEPS.length - 1) * 100;
    progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;

    // Atualiza o modal
    modalOrderId.textContent = `#${orderId.substring(0, 6)}`;
    modalStatusList.innerHTML = ''; // Limpa a lista antiga

    let stepCompleted = true;
    ORDER_STEPS.forEach((step, index) => {
      const isCompleted = stepCompleted && index <= currentIndex;
      const isActive = index === currentIndex;

      if (isActive) stepCompleted = false; // Os próximos passos não estarão completos

      const time = orderData.createdAt?.toDate().toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit'
      }) || '';

      const item = document.createElement('div');
      item.className = 'tracking-item';
      if (isCompleted) item.classList.add('completed');
      if (isActive) item.classList.add('active');

      item.innerHTML = `
      <div class="tracking-time">${isCompleted || isActive ? time: ''}</div>
      <div class="tracking-description">${step.description}</div>
      `;
      modalStatusList.appendChild(item);
    });
  }

  // Função para esconder o tracker
  function hideTrackerUI() {
    const trackerBar = document.getElementById('order-status-tracker');
    trackerBar.classList.add('hidden');
  }

  // Procura por um pedido ativo no localStorage quando a página carrega
  function checkForActiveOrder() {
    const lastOrderId = localStorage.getItem('lastActiveOrderId');
    if (lastOrderId) {
      startOrderTracking(lastOrderId);
    }
  }

  // Adiciona o novo evento global para ser chamado pelo checkout.js
  window.addEventListener('newOrderPlaced', (event) => {
    const orderId = event.detail.orderId;
    if (orderId) {
      localStorage.setItem('lastActiveOrderId', orderId);
      startOrderTracking(orderId);
    }
  });

  // --- Configuração dos Botões e Modais ---
  const viewDetailsBtn = document.getElementById('view-tracker-details-btn');
  const trackingModal = document.getElementById('order-tracking-modal');
  const closeModalBtn = trackingModal.querySelector('.close-button');

  viewDetailsBtn.addEventListener('click',
    () => trackingModal.classList.add('show'));
  closeModalBtn.addEventListener('click',
    () => trackingModal.classList.remove('show'));
  trackingModal.addEventListener('click',
    (e) => {
      if (e.target === trackingModal) trackingModal.classList.remove('show');
    });

  checkForActiveOrder(); // Verifica se já existe um pedido ativo ao carregar a página
});