// app-entregador.js - VERSÃO DE TESTE COM FLAG VISUAL

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, updateDoc, Timestamp, orderBy, getDocs, runTransaction, addDoc, serverTimestamp, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// --- Variáveis de estado ---
let locationWatcherId = null;
let currentDriverProfile = null;
let currentOrders = [];
let historicalOrders = [];
let selectedOrder = null;
let isFirstLoad = true;

const db = window.db;
const auth = window.auth;

// --- Seletores de Elementos do DOM ---
const driverNameSpan = document.getElementById('driver-name');
const driverBalanceSpan = document.getElementById('driver-balance');
const logoutBtn = document.getElementById('logout-btn');
const historyBtn = document.getElementById('history-btn');
const achievementsBtn = document.getElementById('achievements-btn');
const financialBtn = document.getElementById('financial-btn');
const homeBtn = document.getElementById('home-btn');
const mainViews = {
  deliveries: document.getElementById('current-deliveries-section'),
  history: document.getElementById('history-section'),
  financial: document.getElementById('financial-control-view')
};
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
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const filterHistoryBtn = document.getElementById('filter-history-btn');
const achievementsModal = document.getElementById('achievements-modal');
const achievementsListDiv = document.getElementById('achievements-list');
const closeAchievementsModalBtn = achievementsModal.querySelector('.close-modal-btn');
const btnSendMessage = document.getElementById('btn-send-message');
const quickMessageModal = document.getElementById('quick-message-modal');
const closeMessageModalBtn = quickMessageModal.querySelector('.close-modal-btn');
const formFinanceiro = document.getElementById('form-financeiro');
const tipoMovimentacao = document.getElementById('tipo-movimentacao');
const valorMovimentacao = document.getElementById('valor-movimentacao');
const descricaoMovimentacao = document.getElementById('descricao-movimentacao');
const saldoAtualViewEl = document.getElementById('saldo-atual-view');
const listaHistoricoEl = document.getElementById('lista-historico-financeiro');
const todayFeesEl = document.getElementById('today-fees-value');
const todayCountEl = document.getElementById('today-deliveries-count');
const requestWithdrawalBtn = document.getElementById('request-withdrawal-btn');

// Lógica de Notificações
async function requestAndSaveToken(driverDocId) {
    if (!driverDocId) return;
    try {
        const messaging = getMessaging();
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const vapidKey = 'BMYSc8laKJbTISeIp7KpYrdP9M3gvyums_RphL8xJ8_IxPyi_aTIjIMsCNvA3sXiuLBeqvr5bwPDX5Ji9gEsHCQ';
            const currentToken = await getToken(messaging, { vapidKey: vapidKey });
            if (currentToken) {
                const driverRef = doc(db, "delivery_people", driverDocId);
                await updateDoc(driverRef, {
                    notificationTokens: arrayUnion(currentToken)
                });
                console.log("Token de notificação do entregador salvo com sucesso!");
                window.showToast("Notificações ativadas!", "success");
            }
        } else {
            console.log('Permissão de notificação negada pelo entregador.');
            window.showToast("Você bloqueou as notificações.", "warning");
        }
    } catch (error) {
        console.error('Erro ao obter ou salvar o token de notificação:', error);
    }
}

function initializeNotificationPrompt(driverDocId) {
    const promptModal = document.getElementById('notification-prompt-modal');
    if (!promptModal || !('Notification' in window)) return;
    const permissionStatus = Notification.permission;
    if (permissionStatus === 'default') {
        const activateBtn = document.getElementById('prompt-activate-notifications-btn');
        const declineBtn = document.getElementById('prompt-decline-notifications-btn');
        const closeModal = () => promptModal.classList.remove('show');
        activateBtn.addEventListener('click', () => {
            requestAndSaveToken(driverDocId);
            closeModal();
        });
        declineBtn.addEventListener('click', closeModal);
        setTimeout(() => {
            promptModal.classList.add('show');
        }, 3000);
    }
}

// Rastreamento de Localização
function startLocationTracking(driverId) {
  if (locationWatcherId) {
    navigator.geolocation.clearWatch(locationWatcherId);
  }
  if ("geolocation" in navigator) {
    locationWatcherId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const user = auth.currentUser;
        if (!user) return;
        try {
          const locationRef = doc(db, "driver_locations", driverId);
          await setDoc(locationRef, {
            lat: latitude,
            lng: longitude,
            name: user.displayName || "Entregador",
            lastUpdate: serverTimestamp()
          });
        } catch (error) {
          console.error("Erro ao salvar localização do entregador:", error);
        }
      },
      (error) => { console.error("Erro no Geolocation: ", error.message); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }
}

function stopLocationTracking() {
  if (locationWatcherId) {
    navigator.geolocation.clearWatch(locationWatcherId);
    locationWatcherId = null;
    console.log("Rastreamento de localização interrompido.");
  }
}

// Conquistas
const ACHIEVEMENTS = {
  '10_deliveries': { name: 'Entregador Iniciante', description: 'Complete 10 entregas', requiredCount: 10, icon: 'fa-baby-carriage' },
  '50_deliveries': { name: 'Entregador Experiente', description: 'Complete 50 entregas', requiredCount: 50, icon: 'fa-motorcycle' },
  '100_deliveries': { name: 'Profissional da Entrega', description: 'Complete 100 entregas', requiredCount: 100, icon: 'fa-rocket' },
  '250_deliveries': { name: 'Lenda das Ruas', description: 'Complete 250 entregas', requiredCount: 250, icon: 'fa-crown' }
};

// Funções Utilitárias
const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
function showView(viewName) {
  Object.values(mainViews).forEach(view => { if(view) view.classList.add('hidden'); });
  if (mainViews[viewName]) mainViews[viewName].classList.remove('hidden');
  homeBtn.classList.toggle('active', viewName === 'deliveries');
  historyBtn.classList.toggle('active', viewName === 'history');
  financialBtn.classList.toggle('active', viewName === 'financial');
}
window.showToast = function(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// --- LÓGICA DO CHAT ---
if (btnSendMessage) {
  btnSendMessage.addEventListener('click', () => {
    if (selectedOrder) quickMessageModal.classList.add('show');
  });
}
if (closeMessageModalBtn) {
  closeMessageModalBtn.addEventListener('click', () => quickMessageModal.classList.remove('show'));
}
if (quickMessageModal) {
  quickMessageModal.querySelectorAll('.quick-message-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      const message = e.target.dataset.message;
      if (!auth.currentUser || !selectedOrder) return;
      e.target.disabled = true;
      try {
        await addDoc(collection(db, "chat_messages"), {
          driverId: auth.currentUser.uid,
          driverName: auth.currentUser.displayName || 'Entregador',
          orderId: selectedOrder.id,
          message: message,
          timestamp: serverTimestamp(),
          isRead: false
        });
        window.showToast("Mensagem enviada!", "success");
        quickMessageModal.classList.remove('show');
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
      } finally {
        e.target.disabled = false;
      }
    });
  });
}

// --- LÓGICA DAS CONQUISTAS ---
function renderAchievements() {
  if (!achievementsListDiv || !currentDriverProfile) return;
  achievementsListDiv.innerHTML = Object.keys(ACHIEVEMENTS).map(id => {
    const achievement = ACHIEVEMENTS[id];
    const isUnlocked = currentDriverProfile.achievements && currentDriverProfile.achievements[id];
    return `<div class="achievement-card ${isUnlocked ? 'unlocked' : ''}"><div class="icon"><i class="fas ${achievement.icon}"></i></div><div class="name">${achievement.name}</div><div class="description">${achievement.description}</div></div>`;
  }).join('');
}

if (achievementsBtn) {
  achievementsBtn.addEventListener('click', () => {
    if (currentDriverProfile) {
      renderAchievements();
      achievementsModal.classList.add('show');
    }
  });
}
if (closeAchievementsModalBtn) {
  closeAchievementsModalBtn.addEventListener('click', () => achievementsModal.classList.remove('show'));
}

async function checkAndAwardAchievements(driverRef) {
  try {
    const newAchievementsAwarded = await runTransaction(db, async (transaction) => {
      const driverDoc = await transaction.get(driverRef);
      if (!driverDoc.exists()) throw "Documento do entregador não existe!";
      const driverData = driverDoc.data();
      const currentTotal = (driverData.totalDeliveries || 0) + 1;
      const currentAchievements = driverData.achievements || {};
      let awardedInThisTransaction = [];
      for (const id in ACHIEVEMENTS) {
        if (!currentAchievements[id] && currentTotal >= ACHIEVEMENTS[id].requiredCount) {
          currentAchievements[id] = true;
          awardedInThisTransaction.push(ACHIEVEMENTS[id]);
        }
      }
      transaction.update(driverRef, { totalDeliveries: currentTotal, achievements: currentAchievements });
      return awardedInThisTransaction;
    });
    if (newAchievementsAwarded.length > 0) {
      const driverDoc = await getDoc(driverRef);
      if (driverDoc.exists()) currentDriverProfile = { id: driverDoc.id, ...driverDoc.data() };
      setTimeout(() => {
        newAchievementsAwarded.forEach(ach => window.showToast(`Conquista desbloqueada: ${ach.name}!`, 'success'));
      }, 500);
    }
  } catch (e) {
    console.error("Erro na transação de conquista: ", e);
  }
}

// --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
function createDeliveryCard(order) {
    const status = order.status || 'Indefinido';
    let paymentTagHTML = '';
    const paymentMethod = order.payment?.method || 'N/A';
    if (paymentMethod === 'Pix') {
        const isPaid = order.payment?.pixPaid === true;
        paymentTagHTML = isPaid ? '<span class="tag tag-payment-paid">Pix (Pago)</span>' : '<span class="tag tag-payment-unpaid">Pix (Não Pago)</span>';
    } else {
        paymentTagHTML = `<span class="tag tag-payment-delivery">${paymentMethod}</span>`;
    }
    return `<div class="delivery-card" data-order-id="${order.id}"><div class="card-row"><div class="customer-info"><div class="name">${order.customer?.firstName || ''} ${order.customer?.lastName || ''}</div><div class="address">${order.delivery?.neighborhood || 'Bairro não informado'}</div></div><div class="order-value">${formatPrice(order.totals?.grandTotal)}</div></div><div class="card-row"><div class="payment-info">${paymentTagHTML}</div><div class="status-info"><span class="tag status-${status.toLowerCase().replace(/ /g, '-')}">${status}</span></div></div></div>`;
}

function openDetailsModal(order) {
    selectedOrder = order;
    const address = order.delivery.address || `${order.delivery.street}, ${order.delivery.number}`;
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + order.delivery.neighborhood)}`;
    const customerHTML = `<div class="modal-section"><h4><i class="fas fa-user"></i> Cliente</h4><div class="detail-line"><span class="label">Nome</span><span class="value">${order.customer.firstName} ${order.customer.lastName}</span></div><a href="https://wa.me/55${order.customer.whatsapp}" target="_blank" class="btn" style="background-color:#25D366; width: 95%; margin: 10px auto 0 auto;"><i class="fab fa-whatsapp"></i> Chamar no WhatsApp</a></div>`;
    const addressHTML = `<div class="modal-section"><h4><i class="fas fa-map-marker-alt"></i> Endereço</h4><div class="address-block">${address}<br>Bairro: ${order.delivery.neighborhood}<br>${order.delivery.complement ? `Comp: ${order.delivery.complement}<br>` : ''}${order.delivery.reference ? `Ref: ${order.delivery.reference}` : ''}</div><a href="${mapLink}" target="_blank" class="btn" style="background-color:#4285F4; width:95%; margin:10px auto 0 auto;"><i class="fas fa-map-signs"></i> Ver no Mapa</a></div>`;
    const { subtotal = 0, discount = 0, deliveryFee = 0, grandTotal = 0 } = order.totals;
    const financialHTML = `<div class="modal-section"><h4><i class="fas fa-file-invoice-dollar"></i> Resumo Financeiro</h4><div class="detail-line"><span class="label">Subtotal</span><span class="value">${formatPrice(subtotal)}</span></div>${discount > 0 ? `<div class="detail-line"><span class="label">Desconto</span><span class="value" style="color:var(--primary-red);">- ${formatPrice(discount)}</span></div>` : ''}<div class="detail-line"><span class="label">Taxa de Entrega</span><span class="value">${formatPrice(deliveryFee)}</span></div><hr><div class="detail-line"><span class="label">VALOR A COBRAR</span><span class="value total">${formatPrice(grandTotal)}</span></div><div class="detail-line"><span class="label">Forma de Pagamento</span><span class="value">${order.payment.method}</span></div>${order.payment.method === 'Dinheiro' && order.payment.changeFor > 0 ? `<div class="detail-line"><span class="label">Levar Troco Para</span><span class="value">${formatPrice(order.payment.changeFor)}</span></div>` : ''}</div>`;
    const itemsHTML = `<div class="modal-section"><h4><i class="fas fa-shopping-basket"></i> Itens do Pedido</h4><ul class="order-items-list">${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}</ul></div>`;
    modalBody.innerHTML = customerHTML + addressHTML + financialHTML + itemsHTML;
    btnSendMessage.style.display = 'grid';
    btnCompleteDelivery.style.display = (order.status === "Saiu para Entrega") ? 'grid' : 'none';
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

function renderHistory(orders) {
    historicalOrders = orders;
    if (!historyList || !totalFeesValue || !totalDeliveriesCount) return;
    let totalFees = orders.reduce((sum, order) => sum + (order.delivery?.fee || 0), 0);
    let totalDeliveries = orders.length;
    totalFeesValue.textContent = formatPrice(totalFees);
    totalDeliveriesCount.textContent = totalDeliveries;
    historyList.innerHTML = orders.length === 0 ? `<div class="loading-state"><p>Nenhuma entrega para o período.</p></div>` : orders.map(createDeliveryCard).join('');
    addCardClickListeners(historyList, historicalOrders);
}

async function listenForHistory(driverId, startDate, endDate) {
    if (!historyList) return;
    historyList.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Buscando...</p></div>`;
    let historyQuery = query(collection(db, "pedidos"), where("delivery.assignedTo.id", "==", driverId), where("status", "==", "Entregue"), orderBy("lastStatusUpdate", "desc"));
    if (startDate) historyQuery = query(historyQuery, where("lastStatusUpdate", ">=", Timestamp.fromDate(startDate)));
    if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        historyQuery = query(historyQuery, where("lastStatusUpdate", "<=", Timestamp.fromDate(endOfDay)));
    }
    try {
        const snapshot = await getDocs(historyQuery);
        renderHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
    }
}

async function updateDailySummaryVisuals(driverId) {
    if (!driverId || !todayFeesEl || !todayCountEl) return;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const q = query(collection(db, "pedidos"), where("delivery.assignedTo.id", "==", driverId), where("status", "==", "Entregue"), where("lastStatusUpdate", ">=", Timestamp.fromDate(startOfDay)));
    try {
        const querySnapshot = await getDocs(q);
        const dailyOrders = querySnapshot.docs.map(doc => doc.data());
        todayFeesEl.textContent = formatPrice(dailyOrders.reduce((sum, order) => sum + (order.delivery?.fee || 0), 0));
        todayCountEl.textContent = dailyOrders.length;
    } catch (error) {
        console.error("Erro ao buscar resumo do dia:", error);
    }
}

function listenForDeliveries(driverId) {
    if (!driverId) return;
    const q = query(collection(db, "pedidos"), where("delivery.assignedTo.id", "==", driverId), where("status", "in", ["Aprovado", "Em Preparo", "Saiu para Entrega"]));
    onSnapshot(q, (snapshot) => {
        if (snapshot.docChanges().some(c => c.type === "added" && !isFirstLoad)) {
            new Audio('../audio/notification-entrega.mp3').play().catch(e => {});
        }
        isFirstLoad = false;
        currentOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!deliveryQueueList) return;
        deliveryQueueList.innerHTML = currentOrders.length === 0 ? `<div class="loading-state"><i class="fas fa-motorcycle" style="font-size: 3em; color: #ccc;"></i><p>Aguardando novas entregas...</p></div>` : currentOrders.sort((a, b) => (b.createdAt?.toDate() ?? 0) - (a.createdAt?.toDate() ?? 0)).map(createDeliveryCard).join('');
        addCardClickListeners(deliveryQueueList, currentOrders);
    });
}

if (formFinanceiro) {
    formFinanceiro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user || !currentDriverProfile) return;
        const valor = parseFloat(valorMovimentacao.value);
        const descricao = descricaoMovimentacao.value;
        const tipo = tipoMovimentacao.value;
        if (isNaN(valor) || valor <= 0 || !descricao) return;
        const button = formFinanceiro.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
            await addDoc(collection(db, 'delivery_people', currentDriverProfile.id, 'movimentacoesFinanceiras'), {
                tipo, valor, descricao, data: serverTimestamp()
            });
            formFinanceiro.reset();
        } catch (error) {
            console.error("Erro ao adicionar lançamento:", error);
        } finally {
            button.disabled = false;
        }
    });
}

function carregarRelatorioFinanceiro(driverId) {
    if (!driverId) return;
    const q = query(collection(db, 'delivery_people', driverId, 'movimentacoesFinanceiras'), orderBy('data', 'desc'));
    onSnapshot(q, (querySnapshot) => {
        if (!listaHistoricoEl || !saldoAtualViewEl || !driverBalanceSpan) return;
        const movimentacoes = querySnapshot.docs.map(doc => doc.data());
        const saldo = movimentacoes.reduce((acc, mov) => mov.tipo === 'receita' ? acc + mov.valor : acc - mov.valor, 0);
        listaHistoricoEl.innerHTML = movimentacoes.length === 0 ? '<li>Nenhum lançamento.</li>' : movimentacoes.map(mov => `<li class="${mov.tipo}"><span>${mov.descricao}</span><span class="valor">${mov.tipo === 'receita' ? '+' : '-'} ${formatPrice(mov.valor)}</span></li>`).join('');
        saldoAtualViewEl.textContent = formatPrice(saldo);
        driverBalanceSpan.textContent = formatPrice(saldo);
        const color = saldo < 0 ? 'var(--primary-red)' : 'var(--success-green)';
        saldoAtualViewEl.style.color = color;
        driverBalanceSpan.style.color = color;
    });
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeDetailsModal);
if (btnCompleteDelivery) {
    btnCompleteDelivery.addEventListener('click', async () => {
        if (!selectedOrder || !auth.currentUser || !currentDriverProfile) return;
        btnCompleteDelivery.disabled = true;
        const driverDocId = currentDriverProfile.id;
        const orderRef = doc(db, "pedidos", selectedOrder.id);
        const driverRef = doc(db, "delivery_people", driverDocId);
        const feeAmount = selectedOrder.delivery?.fee || 0;
        const movimentacaoRef = doc(collection(db, "delivery_people", driverDocId, "movimentacoesFinanceiras"));
        try {
            await runTransaction(db, async (transaction) => {
                transaction.update(orderRef, { status: "Entregue", lastStatusUpdate: serverTimestamp() });
                if (feeAmount > 0) {
                    transaction.set(movimentacaoRef, {
                        tipo: "receita",
                        valor: feeAmount,
                        descricao: `Taxa Pedido #${selectedOrder.id.substring(0, 6)}`,
                        data: serverTimestamp()
                    });
                }
            });
            await checkAndAwardAchievements(driverRef);
            await updateDailySummaryVisuals(driverDocId);
            window.showToast("Entrega finalizada com sucesso!", "success");
            closeDetailsModal();
        } catch (error) {
            console.error("Erro ao finalizar entrega:", error);
        } finally {
            btnCompleteDelivery.disabled = false;
        }
    });
}

if (logoutBtn) logoutBtn.addEventListener('click', () => { stopLocationTracking(); signOut(auth); });
if (filterHistoryBtn) {
    filterHistoryBtn.addEventListener('click', async () => {
        if (!startDateInput.value) return;
        const startDate = new Date(startDateInput.value + 'T00:00:00');
        const endDate = endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : new Date();
        if (auth.currentUser) listenForHistory(currentDriverProfile.id, startDate, endDate);
    });
}
if (requestWithdrawalBtn) {
    requestWithdrawalBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user || !currentDriverProfile) return;
        const totalBalance = parseFloat(driverBalanceSpan.textContent.replace('R$', '').replace('.', '').replace(',', '.'));
        if (totalBalance <= 0) {
            alert("Você não possui saldo positivo para solicitar um saque.");
            return;
        }
        requestWithdrawalBtn.disabled = true;
        try {
            await addDoc(collection(db, "withdrawal_requests"), {
                driverId: currentDriverProfile.id,
                driverName: user.displayName || "Entregador",
                amount: totalBalance,
                status: "pending",
                requestedAt: serverTimestamp(),
            });
            alert("Sua solicitação de saque foi registrada!");
        } catch (error) {
            console.error("Erro ao registrar solicitação de saque:", error);
        } finally {
            requestWithdrawalBtn.disabled = false;
        }
    });
}

// --- LÓGICA DE AUTENTICAÇÃO E INICIALIZAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    // =================================================================
    // AQUI ESTÁ A MUDANÇA PRINCIPAL PARA O NOSSO TESTE
    // Verifica se o Service Worker deixou uma "anotação" para nós
    const swMessageFlag = localStorage.getItem('sw_message_received');
    if (swMessageFlag) {
        alert('SUCESSO! O Service Worker recebeu uma mensagem em segundo plano: ' + swMessageFlag);
        localStorage.removeItem('sw_message_received'); // Limpa a flag para o próximo teste
    }
    // =================================================================

    const appLoader = document.getElementById('app-loader');
    const appContent = document.getElementById('app-content');
    if (user) {
        let driverDoc;
        let q = query(collection(db, "delivery_people"), where("googleUid", "==", user.uid));
        let querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            q = query(collection(db, "delivery_people"), where("email", "==", user.email));
            const emailQuerySnapshot = await getDocs(q);
            if (emailQuerySnapshot.empty) {
                alert("Seu usuário Google não está registrado como um entregador válido.");
                signOut(auth);
                return;
            } else {
                driverDoc = emailQuerySnapshot.docs[0];
                await updateDoc(doc(db, "delivery_people", driverDoc.id), { googleUid: user.uid });
            }
        } else {
            driverDoc = querySnapshot.docs[0];
        }
        const correctDriverId = driverDoc.id;
        currentDriverProfile = { id: driverDoc.id, ...driverDoc.data() };
        appLoader.classList.add('hidden');
        appContent.classList.remove('hidden');
        if (driverNameSpan) driverNameSpan.textContent = user.displayName ? user.displayName.split(' ')[0] : "Entregador";
        
        listenForDeliveries(correctDriverId);
        carregarRelatorioFinanceiro(correctDriverId);
        updateDailySummaryVisuals(correctDriverId);
        startLocationTracking(user.uid);
        
        initializeNotificationPrompt(correctDriverId);

        showView('deliveries');
        homeBtn.addEventListener('click', () => showView('deliveries'));
        historyBtn.addEventListener('click', () => showView('history'));
        financialBtn.addEventListener('click', () => showView('financial'));
    } else {
        stopLocationTracking();
        window.location.href = 'login.html';
    }
});