// app-entregador.js - VERSÃO COMPLETA COM FILTRO DE HISTÓRICO E PAINEL DE ESTATÍSTICAS

// Importa as funções necessárias do Firebase SDK
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDMaD6Z3CDxdkyzQXHpV3b0QBWr--xQTso",
  authDomain: "app-ditalia.firebaseapp.com",
  projectId: "app-ditalia",
  storageBucket: "app-ditalia.firebasestorage.app",
  messagingSenderId: "122567535166",
  appId: "1:122567535166:web:19de7b8925042027063f6f",
  measurementId: "G-5QW3MVGYME"
};

// Inicializa os serviços do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- SELETORES DE ELEMENTOS DO DOM ---
const driverNameSpan = document.getElementById('driver-name');
const logoutBtn = document.getElementById('logout-btn');
const historyBtn = document.getElementById('history-btn');
const historySection = document.getElementById('history-section');
const currentDeliveriesSection = document.getElementById('current-deliveries-section');
const deliveryQueueList = document.getElementById('delivery-queue-list');
const historyList = document.getElementById('history-list');
const totalFeesValue = document.getElementById('total-fees-value');
const totalDeliveriesCount = document.getElementById('total-deliveries-count');
const deliveryDetailsModal = document.getElementById('delivery-details-modal');
const modalBody = deliveryDetailsModal.querySelector('.modal-body');
const closeModalBtn = deliveryDetailsModal.querySelector('.close-modal-btn');
const btnDeliveryAction = document.getElementById('btn-delivery-action');
const btnCompleteDelivery = document.getElementById('btn-complete-delivery');
const modalFooter = deliveryDetailsModal.querySelector('.modal-footer');

// Seletores para os controles do filtro de histórico
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const filterHistoryBtn = document.getElementById('filter-history-btn');

// NOVO: Seletores para o painel de estatísticas
const statsDeliveriesToday = document.getElementById('stats-deliveries-today');
const statsEarningsToday = document.getElementById('stats-earnings-today');


// --- VARIÁVEIS DE ESTADO ---
let currentOrders = [];
let historicalOrders = [];
let selectedOrder = null;
let isFirstLoad = true;

// --- FUNÇÕES UTILITÁRIAS ---
const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL'
}): 'R$ 0,00';

// --- FUNÇÕES DE RENDERIZAÇÃO E UI ---

function createDeliveryCard(order) {
  const paymentMethod = order.payment?.method || 'N/A';
  const paymentClass = paymentMethod.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
  const status = order.status || 'Indefinido';
  let cardClass = 'delivery-card';
  if (status === 'Entregue') {
    cardClass += ' history-card';
  }

  return `
  <div class="${cardClass}" data-order-id="${order.id}">
  <div class="card-row">
  <div class="customer-info">
  <div class="name">${order.customer?.firstName || 'Cliente'} ${order.customer?.lastName || ''}</div>
  <div class="address">${order.delivery?.neighborhood || 'Bairro não informado'}</div>
  </div>
  <div class="order-value">${formatPrice(order.totals?.grandTotal)}</div>
  </div>
  <div class="card-row">
  <div class="payment-info"><span class="tag ${paymentClass}">${paymentMethod}</span></div>
  <div class="status-info"><span class="tag status-${status.toLowerCase().replace(/ /g, '-')}">${status}</span></div>
  </div>
  </div>`;
}

function openDetailsModal(order) {
  selectedOrder = order;

  const address = order.delivery.address || `${order.delivery.street}, ${order.delivery.number}`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + order.delivery.neighborhood)}`;

  const customerHTML = `<div class="modal-section"><h4><i class="fas fa-user"></i> Cliente</h4><div class="detail-line"><span class="label">Nome</span><span class="value">${order.customer.firstName} ${order.customer.lastName}</span></div><a href="https://wa.me/55${order.customer.whatsapp}" target="_blank" class="btn" style="background-color:#25D366; width: 100%; margin-top: 10px;"><i class="fab fa-whatsapp"></i> Chamar no WhatsApp</a></div><div class="modal-section"><h4><i class="fas fa-map-marker-alt"></i> Endereço</h4><div class="address-block">${address}<br>Bairro: ${order.delivery.neighborhood}<br>${order.delivery.complement ? `Comp: ${order.delivery.complement}<br>`: ''}${order.delivery.reference ? `Ref: ${order.delivery.reference}`: ''}</div><a href="${mapLink}" target="_blank" class="btn" style="background-color:#4285F4; width:100%; margin-top:10px;"><i class="fas fa-map-signs"></i> Ver no Mapa</a></div>`;

  const {
    subtotal = 0,
    discount = 0,
    deliveryFee = 0,
    grandTotal = 0
  } = order.totals;
  const financialHTML = `<div class="modal-section"><h4><i class="fas fa-file-invoice-dollar"></i> Resumo Financeiro</h4><div class="detail-line"><span class="label">Subtotal dos Produtos</span><span class="value">${formatPrice(subtotal)}</span></div>${discount > 0 ? `<div class="detail-line"><span class="label">Desconto Aplicado</span><span class="value" style="color:var(--primary-red);">- ${formatPrice(discount)}</span></div>`: ''}<div class="detail-line"><span class="label">Taxa de Entrega</span><span class="value">${formatPrice(deliveryFee)}</span></div><hr><div class="detail-line"><span class="label">VALOR A COBRAR</span><span class="value total">${formatPrice(grandTotal)}</span></div><div class="detail-line"><span class="label">Forma de Pagamento</span><span class="value">${order.payment.method}</span></div>${order.payment.method === 'Dinheiro' && order.payment.changeFor > 0 ? `<div class="detail-line"><span class="label">Levar Troco Para</span><span class="value">${formatPrice(order.payment.changeFor)}</span></div>`: ''}</div>`;

  const itemsHTML = `<div class="modal-section"><h4><i class="fas fa-shopping-basket"></i> Itens do Pedido</h4><ul class="order-items-list">${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}</ul></div>`;

  modalBody.innerHTML = customerHTML + financialHTML + itemsHTML;

  if (order.status === "Entregue") {
    modalFooter.style.display = 'none';
  } else {
    modalFooter.style.display = 'grid';
    if (order.status === "Em Preparo") {
      btnDeliveryAction.style.display = 'grid';
      btnCompleteDelivery.style.display = 'none';
    } else if (order.status === "Saiu para Entrega") {
      btnDeliveryAction.style.display = 'none';
      btnCompleteDelivery.style.display = 'grid';
    }
  }

  deliveryDetailsModal.classList.add('show');
}

function closeDetailsModal() {
  if (deliveryDetailsModal) deliveryDetailsModal.classList.remove('show');
}

function addCardClickListeners(container, orderArray) {
  if (!container) return;
  container.querySelectorAll('.delivery-card').forEach(card => {
    card.addEventListener('click', () => {
      const orderId = card.dataset.orderId;
      const order = orderArray.find(o => o.id === orderId);
      if (order) openDetailsModal(order);
    });
  });
}

// --- FUNÇÃO DE SOM DUPLO ---
function playNotificationSoundTwice() {
  const audio = new Audio('../audio/notification.mp3');
  audio.play().catch(e => console.warn("Aviso: O navegador bloqueou o autoplay do som.",
    e));
  audio.onended = () => {
    setTimeout(() => {
      audio.play().catch(e => console.warn("Aviso: O navegador bloqueou o autoplay do segundo som.", e));
    }, 500);
  };
}

// --- LÓGICA DO HISTÓRICO ---

// ALTERADO: Função de renderização agora também atualiza o painel de estatísticas
function renderHistory(orders) {
  historicalOrders = orders;
  if (!historyList || !totalFeesValue || !totalDeliveriesCount) return;

  // Calcula os totais
  let totalFees = orders.reduce((sum, order) => sum + (order.delivery?.fee || 0), 0);
  let totalDeliveries = orders.length;

  // --- NOVO: Atualiza o Painel Rápido de Estatísticas ---
  if (statsDeliveriesToday && statsEarningsToday) {
    statsDeliveriesToday.textContent = totalDeliveries;
    statsEarningsToday.textContent = formatPrice(totalFees);
  }
  // --- Fim da nova lógica ---

  // Atualiza a seção de histórico (lógica que você já tinha)
  totalFeesValue.textContent = formatPrice(totalFees);
  totalDeliveriesCount.textContent = totalDeliveries;

  if (orders.length === 0) {
    historyList.innerHTML = `<div class="loading-state"><p>Nenhuma entrega encontrada para o período selecionado.</p></div>`;
  } else {
    historyList.innerHTML = orders.map(createDeliveryCard).join('');
    addCardClickListeners(historyList, historicalOrders);
  }
}

async function listenForHistory(driverId, startDate = null, endDate = null) {
  if (!historyList) return;

  historyList.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Buscando histórico...</p></div>`;

  let historyQuery = query(
    collection(db, "pedidos"),
    where("delivery.assignedTo.id", "==", driverId),
    where("status", "==", "Entregue")
  );

  if (startDate) {
    historyQuery = query(historyQuery, where("lastStatusUpdate", ">=", Timestamp.fromDate(startDate)));
  }
  if (endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    historyQuery = query(historyQuery, where("lastStatusUpdate", "<=", Timestamp.fromDate(endOfDay)));
  }

  historyQuery = query(historyQuery, orderBy("lastStatusUpdate", "desc"));

  try {
    const snapshot = await getDocs(historyQuery);
    const historyOrders = snapshot.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    renderHistory(historyOrders);

  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    if (error.code === 'failed-precondition') {
      historyList.innerHTML = `<div class="loading-state error"><p><strong>Erro:</strong> O banco de dados precisa de um índice para esta busca.</p><p>Abra o console do navegador (F12), clique no link do erro para criar o índice e tente novamente em alguns minutos.</p></div>`;
    } else {
      historyList.innerHTML = `<div class="loading-state error"><p>Ocorreu um erro ao buscar o histórico.</p></div>`;
    }
  }
}

// --- LÓGICA DAS ENTREGAS ATUAIS ---
function listenForDeliveries(driverId) {
  if (!driverId) return;
  const q = query(
    collection(db, "pedidos"),
    where("delivery.assignedTo.id", "==", driverId),
    where("status", "in", ["Em Preparo", "Saiu para Entrega"])
  );
  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added" && !isFirstLoad) {
        playNotificationSoundTwice();
      }
    });
    isFirstLoad = false;

    currentOrders = snapshot.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    if (!deliveryQueueList) return;
    if (currentOrders.length === 0) {
      deliveryQueueList.innerHTML = `<div class="loading-state"><i class="fas fa-motorcycle" style="font-size: 3em; color: #ccc;"></i><p>Nenhuma entrega para você no momento. Aguardando...</p></div>`;
    } else {
      currentOrders.sort((a, b) => (b.createdAt?.toDate() ?? 0) - (a.createdAt?.toDate() ?? 0));
      deliveryQueueList.innerHTML = currentOrders.map(createDeliveryCard).join('');
      addCardClickListeners(deliveryQueueList, currentOrders);
    }
  },
    (error) => {
      console.error("Erro ao buscar entregas: ", error);
      if (deliveryQueueList) deliveryQueueList.innerHTML = "<p>Ocorreu um erro ao carregar as entregas.</p>";
    });
}

// --- LÓGICA DE AÇÃO DOS BOTÕES ---
if (closeModalBtn) closeModalBtn.addEventListener('click', closeDetailsModal);
if (btnDeliveryAction) {
  btnDeliveryAction.addEventListener('click', async () => {
    if (!selectedOrder) return;
    btnDeliveryAction.disabled = true;
    btnDeliveryAction.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    const orderRef = doc(db, "pedidos", selectedOrder.id);
    await updateDoc(orderRef, {
      status: "Saiu para Entrega", lastStatusUpdate: new Date()
    });
    btnDeliveryAction.disabled = false;
    btnDeliveryAction.innerHTML = '<i class="fas fa-motorcycle"></i> Peguei o Pedido';
    closeDetailsModal();
  });
}
if (btnCompleteDelivery) {
  btnCompleteDelivery.addEventListener('click', async () => {
    if (!selectedOrder) return;
    btnCompleteDelivery.disabled = true;
    btnCompleteDelivery.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';
    const orderRef = doc(db, "pedidos", selectedOrder.id);
    await updateDoc(orderRef, {
      status: "Entregue", lastStatusUpdate: new Date()
    });
    btnCompleteDelivery.disabled = false;
    btnCompleteDelivery.innerHTML = '<i class="fas fa-check-circle"></i> Entrega Finalizada';
    closeDetailsModal();
  });
}

if (historyBtn && historySection && currentDeliveriesSection) {
  historyBtn.addEventListener('click', () => {
    const isHistoryVisible = historySection.classList.contains('hidden');
    historySection.classList.toggle('hidden', !isHistoryVisible);
    currentDeliveriesSection.classList.toggle('hidden', isHistoryVisible);
    historyBtn.classList.toggle('active', isHistoryVisible);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).catch(error => console.error("Erro no logout:", error));
  });
}

if (filterHistoryBtn) {
  filterHistoryBtn.addEventListener('click', () => {
    const startDateValue = startDateInput.value;
    const endDateValue = endDateInput.value;

    if (!startDateValue) {
      alert("Por favor, selecione pelo menos a data de início.");
      return;
    }

    const startDate = new Date(startDateValue + 'T00:00:00');
    const endDate = endDateValue ? new Date(endDateValue + 'T00:00:00'): null;

    const user = auth.currentUser;
    if (user) {
      listenForHistory(user.uid, startDate, endDate);
    }
  });
}

// --- LÓGICA PRINCIPAL DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (driverNameSpan) {
      driverNameSpan.textContent = user.displayName ? user.displayName.split(' ')[0]: "Entregador";
    }

    listenForDeliveries(user.uid);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    listenForHistory(user.uid, today, today);

  } else {
    window.location.href = 'login.html';
  }
});