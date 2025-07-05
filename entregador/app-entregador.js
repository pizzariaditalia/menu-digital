// app-entregador.js - VERSÃO FINAL COM TODAS AS FUNÇÕES E SOM ÚNICO

// Importa funções do Firebase
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, updateDoc, Timestamp, orderBy, getDocs, runTransaction, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Define a estrutura das conquistas ---
const ACHIEVEMENTS = {
    '10_deliveries': { name: 'Entregador Iniciante', description: 'Complete 10 entregas', requiredCount: 10, icon: 'fa-baby-carriage' },
    '50_deliveries': { name: 'Entregador Experiente', description: 'Complete 50 entregas', requiredCount: 50, icon: 'fa-motorcycle' },
    '100_deliveries': { name: 'Profissional da Entrega', description: 'Complete 100 entregas', requiredCount: 100, icon: 'fa-rocket' },
    '250_deliveries': { name: 'Lenda das Ruas', description: 'Complete 250 entregas', requiredCount: 250, icon: 'fa-crown' }
};

// --- USA AS INSTÂNCIAS GLOBAIS CRIADAS PELO HTML ---
const db = window.db;
const auth = window.auth;

// --- SELETORES DE ELEMENTOS DO DOM ---
const driverNameSpan = document.getElementById('driver-name');
const logoutBtn = document.getElementById('logout-btn');
const historyBtn = document.getElementById('history-btn');
const achievementsBtn = document.getElementById('achievements-btn');
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
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const filterHistoryBtn = document.getElementById('filter-history-btn');
const statsDeliveriesToday = document.getElementById('stats-deliveries-today');
const statsEarningsToday = document.getElementById('stats-earnings-today');
const achievementsModal = document.getElementById('achievements-modal');
const achievementsListDiv = document.getElementById('achievements-list');
const closeAchievementsModalBtn = achievementsModal.querySelector('.close-modal-btn');
const btnSendMessage = document.getElementById('btn-send-message');
const quickMessageModal = document.getElementById('quick-message-modal');
const closeMessageModalBtn = quickMessageModal.querySelector('.close-modal-btn');

// --- VARIÁVEIS DE ESTADO ---
let currentDriverProfile = null;
let currentOrders = [];
let historicalOrders = [];
let selectedOrder = null;
let isFirstLoad = true;

// --- FUNÇÕES UTILITÁRIAS ---
const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';

// --- LÓGICA DO CHAT DE MENSAGENS RÁPIDAS ---
if (btnSendMessage) {
    btnSendMessage.addEventListener('click', () => {
        if (selectedOrder) {
            quickMessageModal.classList.add('show');
        } else {
            alert("Erro: Pedido não selecionado para enviar mensagem.");
        }
    });
}
if (closeMessageModalBtn) {
    closeMessageModalBtn.addEventListener('click', () => quickMessageModal.classList.remove('show'));
}
if (quickMessageModal) {
    quickMessageModal.querySelectorAll('.quick-message-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const message = e.target.dataset.message;
            if (!auth.currentUser || !selectedOrder) {
                alert("Erro: não foi possível identificar o usuário ou o pedido.");
                return;
            }
            e.target.disabled = true;
            e.target.textContent = 'Enviando...';
            try {
                await addDoc(collection(db, "chat_messages"), {
                    driverId: auth.currentUser.uid,
                    driverName: auth.currentUser.displayName || 'Nome não definido',
                    orderId: selectedOrder.id,
                    message: message,
                    timestamp: serverTimestamp(),
                    isRead: false
                });
                alert("Mensagem enviada com sucesso!");
                quickMessageModal.classList.remove('show');
            } catch (error) {
                console.error("Erro ao enviar mensagem:", error);
                alert("Falha ao enviar a mensagem. Tente novamente.");
            } finally {
                e.target.disabled = false;
                e.target.textContent = message;
            }
        });
    });
}

// --- LÓGICA DAS CONQUISTAS ---
function renderAchievements() {
    if (!achievementsListDiv || !currentDriverProfile) return;
    let achievementsHTML = '';
    for (const id in ACHIEVEMENTS) {
        const achievement = ACHIEVEMENTS[id];
        const isUnlocked = currentDriverProfile.achievements && currentDriverProfile.achievements[id];
        achievementsHTML += `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                <div class="icon"><i class="fas ${achievement.icon}"></i></div>
                <div class="name">${achievement.name}</div>
                <div class="description">${achievement.description}</div>
            </div>`;
    }
    achievementsListDiv.innerHTML = achievementsHTML;
}
if (achievementsBtn) {
    achievementsBtn.addEventListener('click', () => {
        if(currentDriverProfile) {
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
            if(driverDoc.exists()) currentDriverProfile = driverDoc.data();
            setTimeout(() => {
                newAchievementsAwarded.forEach(ach => {
                    alert(`Parabéns! Você desbloqueou a conquista: "${ach.name}"`);
                });
            }, 500);
        }
    } catch (e) {
        console.error("Erro na transação de conquista: ", e);
    }
}

// --- LÓGICA DO CRONÔMETRO ---
function updateAllTimers() {
    const timerElements = document.querySelectorAll('.order-timer');
    timerElements.forEach(timerEl => {
        const createdAt = timerEl.dataset.createdAt;
        if (!createdAt) return;
        const startTime = new Date(createdAt);
        const now = new Date();
        const diffInSeconds = Math.floor((now - startTime) / 1000);
        if (diffInSeconds < 0) return;
        const minutes = Math.floor(diffInSeconds / 60);
        const seconds = diffInSeconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timerEl.classList.remove('timer-green', 'timer-yellow', 'timer-red');
        if (minutes >= 60) {
            timerEl.classList.add('timer-red');
        } else if (minutes >= 45) {
            timerEl.classList.add('timer-yellow');
        } else {
            timerEl.classList.add('timer-green');
        }
    });
}

// --- CORRIGIDO: Função de som para tocar apenas uma vez ---
function playNotificationSound() {
    const audio = new Audio('../audio/notification-entrega.mp3');
    audio.play().catch(e => console.warn("Aviso: O navegador bloqueou o autoplay do som.", e));
}

// --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
function createDeliveryCard(order) {
    const status = order.status || 'Indefinido';
    let cardClass = 'delivery-card';
    if (status === 'Entregue') cardClass += ' history-card';
    const createdAtISO = order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : new Date().toISOString();
    let timerHTML = '';
    if (status !== 'Entregue' && status !== 'Cancelado') {
        timerHTML = `<div class="order-timer" data-created-at="${createdAtISO}">00:00</div>`;
    }
    let paymentTagHTML = '';
    const paymentMethod = order.payment?.method || 'N/A';
    if (paymentMethod === 'Pix') {
        const isPaid = order.payment?.pixPaid === true;
        paymentTagHTML = isPaid ? '<span class="tag tag-payment-paid">Pix (Pago)</span>' : '<span class="tag tag-payment-unpaid">Pix (Não Pago)</span>';
    } else {
        const paymentClass = paymentMethod.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
        paymentTagHTML = `<span class="tag tag-payment-delivery ${paymentClass}">${paymentMethod}</span>`;
    }
    return `
    <div class="${cardClass}" data-order-id="${order.id}">
        <div class="card-header">${timerHTML}</div>
        <div class="card-row">
            <div class="customer-info">
                <div class="name">${order.customer?.firstName || 'Cliente'} ${order.customer?.lastName || ''}</div>
                <div class="address">${order.delivery?.neighborhood || 'Bairro não informado'}</div>
            </div>
            <div class="order-value">${formatPrice(order.totals?.grandTotal)}</div>
        </div>
        <div class="card-row">
            <div class="payment-info">${paymentTagHTML}</div>
            <div class="status-info"><span class="tag status-${status.toLowerCase().replace(/ /g, '-')}">${status}</span></div>
        </div>
    </div>`;
}

function openDetailsModal(order) {
    selectedOrder = order;
    const address = order.delivery.address || `${order.delivery.street}, ${order.delivery.number}`;
    const mapLink = `https://maps.google.com/?q=${encodeURIComponent(address + ', ' + order.delivery.neighborhood)}`;
    const customerHTML = `<div class="modal-section"><h4><i class="fas fa-user"></i> Cliente</h4><div class="detail-line"><span class="label">Nome</span><span class="value">${order.customer.firstName} ${order.customer.lastName}</span></div><a href="https://wa.me/55${order.customer.whatsapp}" target="_blank" class="btn" style="background-color:#25D366; width: 95%; margin: 10px auto 0 auto;"><i class="fab fa-whatsapp"></i> Chamar no WhatsApp</a></div><div class="modal-section"><h4><i class="fas fa-map-marker-alt"></i> Endereço</h4><div class="address-block">${address}<br>Bairro: ${order.delivery.neighborhood}<br>${order.delivery.complement ? `Comp: ${order.delivery.complement}<br>` : ''}${order.delivery.reference ? `Ref: ${order.delivery.reference}` : ''}</div><a href="${mapLink}" target="_blank" class="btn" style="background-color:#4285F4; width:95%; margin:10px auto 0 auto;"><i class="fas fa-map-signs"></i> Ver no Mapa</a></div>`;
    const { subtotal = 0, discount = 0, deliveryFee = 0, grandTotal = 0 } = order.totals;
    const financialHTML = `<div class="modal-section"><h4><i class="fas fa-file-invoice-dollar"></i> Resumo Financeiro</h4><div class="detail-line"><span class="label">Subtotal dos Produtos</span><span class="value">${formatPrice(subtotal)}</span></div>${discount > 0 ? `<div class="detail-line"><span class="label">Desconto Aplicado</span><span class="value" style="color:var(--primary-red);">- ${formatPrice(discount)}</span></div>` : ''}<div class="detail-line"><span class="label">Taxa de Entrega</span><span class="value">${formatPrice(deliveryFee)}</span></div><hr><div class="detail-line"><span class="label">VALOR A COBRAR</span><span class="value total">${formatPrice(grandTotal)}</span></div><div class="detail-line"><span class="label">Forma de Pagamento</span><span class="value">${order.payment.method}</span></div>${order.payment.method === 'Dinheiro' && order.payment.changeFor > 0 ? `<div class="detail-line"><span class="label">Levar Troco Para</span><span class="value">${formatPrice(order.payment.changeFor)}</span></div>` : ''}</div>`;
    const itemsHTML = `<div class="modal-section"><h4><i class="fas fa-shopping-basket"></i> Itens do Pedido</h4><ul class="order-items-list">${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}</ul></div>`;
    modalBody.innerHTML = customerHTML + financialHTML + itemsHTML;
    if(btnSendMessage) btnSendMessage.style.display = (order.status === "Em Preparo" || order.status === "Saiu para Entrega") ? 'grid' : 'none';
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
function closeDetailsModal() { if (deliveryDetailsModal) deliveryDetailsModal.classList.remove('show'); }
function addCardClickListeners(container, orderArray) { if (!container) return; container.querySelectorAll('.delivery-card').forEach(card => { card.addEventListener('click', () => { const orderId = card.dataset.orderId; const order = orderArray.find(o => o.id === orderId); if (order) openDetailsModal(order); }); }); }

function renderHistory(orders) {
    historicalOrders = orders; if (!historyList || !totalFeesValue || !totalDeliveriesCount) return; let totalFees = orders.reduce((sum, order) => sum + (order.delivery?.fee || 0), 0); let totalDeliveries = orders.length; if (statsDeliveriesToday && statsEarningsToday) { statsDeliveriesToday.textContent = totalDeliveries; statsEarningsToday.textContent = formatPrice(totalFees); } totalFeesValue.textContent = formatPrice(totalFees); totalDeliveriesCount.textContent = totalDeliveries; if (orders.length === 0) { historyList.innerHTML = `<div class="loading-state"><p>Nenhuma entrega encontrada para o período selecionado.</p></div>`; } else { historyList.innerHTML = orders.map(createDeliveryCard).join(''); addCardClickListeners(historyList, historicalOrders); }
}
async function listenForHistory(driverId, startDate = null, endDate = null) {
    if (!historyList) return; historyList.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Buscando histórico...</p></div>`; let historyQuery = query(collection(db, "pedidos"), where("delivery.assignedTo.id", "==", driverId), where("status", "==", "Entregue")); if (startDate) { historyQuery = query(historyQuery, where("lastStatusUpdate", ">=", Timestamp.fromDate(startDate))); } if (endDate) { const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999); historyQuery = query(historyQuery, where("lastStatusUpdate", "<=", Timestamp.fromDate(endOfDay))); } historyQuery = query(historyQuery, orderBy("lastStatusUpdate", "desc")); try { const snapshot = await getDocs(historyQuery); const historyOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderHistory(historyOrders); } catch (error) { console.error("Erro ao buscar histórico:", error); if (error.code === 'failed-precondition') { historyList.innerHTML = `<div class="loading-state error"><p><strong>Erro:</strong> O banco de dados precisa de um índice para esta busca.</p><p>Abra o console do navegador (F12), clique no link do erro para criar o índice e tente novamente em alguns minutos.</p></div>`; } else { historyList.innerHTML = `<div class="loading-state error"><p>Ocorreu um erro ao buscar o histórico.</p></div>`; } }
}
function listenForDeliveries(driverId) {
    if (!driverId) return; const q = query(collection(db, "pedidos"), where("delivery.assignedTo.id", "==", driverId), where("status", "in", ["Em Preparo", "Saiu para Entrega"])); onSnapshot(q, (snapshot) => { snapshot.docChanges().forEach((change) => { if (change.type === "added" && !isFirstLoad) { playNotificationSound(); } }); isFirstLoad = false; currentOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); if (!deliveryQueueList) return; if (currentOrders.length === 0) { deliveryQueueList.innerHTML = `<div class="loading-state"><i class="fas fa-motorcycle" style="font-size: 3em; color: #ccc;"></i><p>Nenhuma entrega para você no momento. Aguardando...</p></div>`; } else { currentOrders.sort((a, b) => (b.createdAt?.toDate() ?? 0) - (a.createdAt?.toDate() ?? 0)); deliveryQueueList.innerHTML = currentOrders.map(createDeliveryCard).join(''); addCardClickListeners(deliveryQueueList, currentOrders); } }, (error) => { console.error("Erro ao buscar entregas: ", error); if (deliveryQueueList) deliveryQueueList.innerHTML = "<p>Ocorreu um erro ao carregar as entregas.</p>"; });
}

// --- LÓGICA DE AÇÃO DOS BOTÕES ---
if (closeModalBtn) closeModalBtn.addEventListener('click', closeDetailsModal);
if (btnDeliveryAction) { btnDeliveryAction.addEventListener('click', async () => { if (!selectedOrder) return; btnDeliveryAction.disabled = true; btnDeliveryAction.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...'; const orderRef = doc(db, "pedidos", selectedOrder.id); await updateDoc(orderRef, { status: "Saiu para Entrega", lastStatusUpdate: new Date() }); btnDeliveryAction.disabled = false; btnDeliveryAction.innerHTML = '<i class="fas fa-motorcycle"></i> Peguei o Pedido'; closeDetailsModal(); }); }
if (btnCompleteDelivery) { btnCompleteDelivery.addEventListener('click', async () => { if (!selectedOrder || !auth.currentUser) return; btnCompleteDelivery.disabled = true; btnCompleteDelivery.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...'; const orderRef = doc(db, "pedidos", selectedOrder.id); const driverRef = doc(db, "delivery_people", auth.currentUser.uid); await updateDoc(orderRef, { status: "Entregue", lastStatusUpdate: new Date() }); await checkAndAwardAchievements(driverRef); btnCompleteDelivery.disabled = false; btnCompleteDelivery.innerHTML = '<i class="fas fa-check-circle"></i> Entrega Finalizada'; closeDetailsModal(); }); }
if (historyBtn) { historyBtn.addEventListener('click', () => { const isHistoryVisible = historySection.classList.contains('hidden'); historySection.classList.toggle('hidden', !isHistoryVisible); currentDeliveriesSection.classList.toggle('hidden', isHistoryVisible); historyBtn.classList.toggle('active', isHistoryVisible); }); }
if (logoutBtn) { logoutBtn.addEventListener('click', () => { signOut(auth).catch(error => console.error("Erro no logout:", error)); }); }
if (filterHistoryBtn) { filterHistoryBtn.addEventListener('click', () => { const startDateValue = startDateInput.value; const endDateValue = endDateInput.value; if (!startDateValue) { alert("Por favor, selecione pelo menos a data de início."); return; } const startDate = new Date(startDateValue + 'T00:00:00'); const endDate = endDateValue ? new Date(endDateValue + 'T00:00:00') : null; const user = auth.currentUser; if (user) { listenForHistory(user.uid, startDate, endDate); } }); }

// --- LÓGICA DE AUTENTICAÇÃO OTIMIZADA ---
onAuthStateChanged(auth, async (user) => {
    const appLoader = document.getElementById('app-loader');
    const appContent = document.getElementById('app-content');

    if (user) {
        appLoader.classList.add('hidden');
        appContent.classList.remove('hidden');

        if (driverNameSpan) {
            driverNameSpan.textContent = user.displayName ? user.displayName.split(' ')[0] : "Entregador";
        }
        
        setInterval(updateAllTimers, 1000);

        const driverRef = doc(db, 'delivery_people', user.uid);
        const driverSnap = await getDoc(driverRef);
        if (driverSnap.exists()) {
            currentDriverProfile = driverSnap.data();
        } else {
            currentDriverProfile = { totalDeliveries: 0, achievements: {} };
        }

        listenForDeliveries(user.uid); 
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        listenForHistory(user.uid, today, today); 

    } else {
        window.location.href = 'login.html';
    }
});