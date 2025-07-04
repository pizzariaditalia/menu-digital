// app-entregador.js - VERSÃO FINAL COM SISTEMA DE CONQUISTAS (GAMIFICAÇÃO)

// Importa funções do Firebase, incluindo 'doc', 'getDoc' e 'runTransaction' que serão essenciais
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, updateDoc, Timestamp, orderBy, getDocs, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- NOVO: Define a estrutura das conquistas ---
const ACHIEVEMENTS = {
    '10_deliveries': { name: 'Entregador Iniciante', description: 'Complete 10 entregas', requiredCount: 10, icon: 'fa-baby-carriage' },
    '50_deliveries': { name: 'Entregador Experiente', description: 'Complete 50 entregas', requiredCount: 50, icon: 'fa-motorcycle' },
    '100_deliveries': { name: 'Profissional da Entrega', description: 'Complete 100 entregas', requiredCount: 100, icon: 'fa-rocket' },
    '250_deliveries': { name: 'Lenda das Ruas', description: 'Complete 250 entregas', requiredCount: 250, icon: 'fa-crown' }
};

// Configuração do Firebase
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
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const filterHistoryBtn = document.getElementById('filter-history-btn');
const statsDeliveriesToday = document.getElementById('stats-deliveries-today');
const statsEarningsToday = document.getElementById('stats-earnings-today');

// NOVO: Seletores para o modal de conquistas
const achievementsBtn = document.getElementById('achievements-btn');
const achievementsModal = document.getElementById('achievements-modal');
const achievementsListDiv = document.getElementById('achievements-list');
const closeAchievementsModalBtn = achievementsModal.querySelector('.close-modal-btn');

// --- VARIÁVEIS DE ESTADO ---
let currentDriverProfile = null; // NOVO: Armazena o perfil completo do entregador
let currentOrders = [];
let historicalOrders = [];
let selectedOrder = null;
let isFirstLoad = true;

// --- FUNÇÕES UTILITÁRIAS ---
const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';

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
            </div>
        `;
    }
    achievementsListDiv.innerHTML = achievementsHTML;
}

if (achievementsBtn) {
    achievementsBtn.addEventListener('click', () => {
        renderAchievements();
        achievementsModal.classList.add('show');
    });
}
if (closeAchievementsModalBtn) {
    closeAchievementsModalBtn.addEventListener('click', () => achievementsModal.classList.remove('show'));
}

async function checkAndAwardAchievements(driverRef) {
    try {
        await runTransaction(db, async (transaction) => {
            const driverDoc = await transaction.get(driverRef);
            if (!driverDoc.exists()) {
                throw "Documento do entregador não existe!";
            }

            const driverData = driverDoc.data();
            const currentTotal = (driverData.totalDeliveries || 0) + 1;
            const currentAchievements = driverData.achievements || {};
            let newAchievementsAwarded = [];

            for (const id in ACHIEVEMENTS) {
                if (!currentAchievements[id] && currentTotal >= ACHIEVEMENTS[id].requiredCount) {
                    currentAchievements[id] = true; // Marca a conquista como obtida
                    newAchievementsAwarded.push(ACHIEVEMENTS[id]);
                }
            }

            transaction.update(driverRef, {
                totalDeliveries: currentTotal,
                achievements: currentAchievements
            });
            
            // Retorna as novas conquistas para mostrar um alerta
            return newAchievementsAwarded;
        });

        // Se a transação foi bem-sucedida e houve novas conquistas, mostramos um alerta
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
            currentDriverProfile = driverDoc.data(); // Atualiza o perfil local
            const newAchievements = currentDriverProfile.achievements;
            Object.keys(newAchievements).forEach(key => {
                if (newAchievements[key] === true && !driverDoc.data().achievements[key]) {
                     alert(`Parabéns! Você desbloqueou a conquista: "${ACHIEVEMENTS[key].name}"`);
                }
            });
        }

    } catch (e) {
        console.error("Erro na transação de conquista: ", e);
    }
}


// --- LÓGICA PRINCIPAL (FUNÇÕES DE RENDERIZAÇÃO E LISTENERS) ---
// ... (As funções createDeliveryCard, openDetailsModal, closeDetailsModal, addCardClickListeners, playNotificationSoundTwice não mudam) ...
function createDeliveryCard(order){const paymentMethod=order.payment?.method||"N/A",paymentClass=paymentMethod.toLowerCase().replace(/ /g,"-").replace(/[^a-z0-9-]/g,""),status=order.status||"Indefinido";let cardClass="delivery-card";return"Entregue"===status&&(cardClass+=" history-card"),`<div class="${cardClass}" data-order-id="${order.id}"><div class="card-row"><div class="customer-info"><div class="name">${order.customer?.firstName||"Cliente"} ${order.customer?.lastName||""}</div><div class="address">${order.delivery?.neighborhood||"Bairro não informado"}</div></div><div class="order-value">${formatPrice(order.totals?.grandTotal)}</div></div><div class="card-row"><div class="payment-info"><span class="tag ${paymentClass}">${paymentMethod}</span></div><div class="status-info"><span class="tag status-${status.toLowerCase().replace(/ /g,"-")}">${status}</span></div></div></div>`}
function openDetailsModal(order){selectedOrder=order;const address=order.delivery.address||`${order.delivery.street}, ${order.delivery.number}`,mapLink=`https://maps.google.com/?q=${encodeURIComponent(address+", "+order.delivery.neighborhood)}`,customerHTML=`<div class="modal-section"><h4><i class="fas fa-user"></i> Cliente</h4><div class="detail-line"><span class="label">Nome</span><span class="value">${order.customer.firstName} ${order.customer.lastName}</span></div><a href="https://wa.me/55${order.customer.whatsapp}" target="_blank" class="btn" style="background-color:#25D366; width: 100%; margin-top: 10px;"><i class="fab fa-whatsapp"></i> Chamar no WhatsApp</a></div><div class="modal-section"><h4><i class="fas fa-map-marker-alt"></i> Endereço</h4><div class="address-block">${address}<br>Bairro: ${order.delivery.neighborhood}<br>${order.delivery.complement?`Comp: ${order.delivery.complement}<br>`:""}${order.delivery.reference?`Ref: ${order.delivery.reference}`:""}</div><a href="${mapLink}" target="_blank" class="btn" style="background-color:#4285F4; width:100%; margin-top:10px;"><i class="fas fa-map-signs"></i> Ver no Mapa</a></div>`;const {subtotal:subtotal=0,discount:discount=0,deliveryFee:deliveryFee=0,grandTotal:grandTotal=0}=order.totals,financialHTML=`<div class="modal-section"><h4><i class="fas fa-file-invoice-dollar"></i> Resumo Financeiro</h4><div class="detail-line"><span class="label">Subtotal dos Produtos</span><span class="value">${formatPrice(subtotal)}</span></div>${discount>0?`<div class="detail-line"><span class="label">Desconto Aplicado</span><span class="value" style="color:var(--primary-red);">- ${formatPrice(discount)}</span></div>`:""}<div class="detail-line"><span class="label">Taxa de Entrega</span><span class="value">${formatPrice(deliveryFee)}</span></div><hr><div class="detail-line"><span class="label">VALOR A COBRAR</span><span class="value total">${formatPrice(grandTotal)}</span></div><div class="detail-line"><span class="label">Forma de Pagamento</span><span class="value">${order.payment.method}</span></div>${"Dinheiro"===order.payment.method&&order.payment.changeFor>0?`<div class="detail-line"><span class="label">Levar Troco Para</span><span class="value">${formatPrice(order.payment.changeFor)}</span></div>`:""}</div>`,itemsHTML=`<div class="modal-section"><h4><i class="fas fa-shopping-basket"></i> Itens do Pedido</h4><ul class="order-items-list">${order.items.map(item=>`<li>${item.quantity}x ${item.name}</li>`).join("")}</ul></div>`;modalBody.innerHTML=customerHTML+financialHTML+itemsHTML,"Entregue"===order.status?modalFooter.style.display="none":(modalFooter.style.display="grid","Em Preparo"===order.status?(btnDeliveryAction.style.display="grid",btnCompleteDelivery.style.display="none"):"Saiu para Entrega"===(order.status)&&(btnDeliveryAction.style.display="none",btnCompleteDelivery.style.display="grid")),deliveryDetailsModal.classList.add("show")}
function closeDetailsModal(){deliveryDetailsModal&&deliveryDetailsModal.classList.remove("show")}
function addCardClickListeners(container,orderArray){container&&container.querySelectorAll(".delivery-card").forEach(card=>{card.addEventListener("click",()=>{const orderId=card.dataset.orderId,order=orderArray.find(o=>o.id===orderId);order&&openDetailsModal(order)})})}
function playNotificationSoundTwice(){const audio=new Audio("../audio/notification.mp3");audio.play().catch(e=>console.warn("Aviso: O navegador bloqueou o autoplay do som.",e)),audio.onended=()=>{setTimeout(()=>{audio.play().catch(e=>console.warn("Aviso: O navegador bloqueou o autoplay do segundo som.",e))},500)}}

function renderHistory(orders) {
    historicalOrders = orders;
    if (!historyList || !totalFeesValue || !totalDeliveriesCount) return;
    let totalFees = orders.reduce((sum, order) => sum + (order.delivery?.fee || 0), 0);
    let totalDeliveries = orders.length;

    if (statsDeliveriesToday && statsEarningsToday) {
        statsDeliveriesToday.textContent = totalDeliveries;
        statsEarningsToday.textContent = formatPrice(totalFees);
    }
    
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
    let historyQuery = query(collection(db, "pedidos"), where("delivery.assignedTo.id", "==", driverId), where("status", "==", "Entregue"));
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
        const historyOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

function listenForDeliveries(driverId) {
    if (!driverId) return;
    const q = query(collection(db, "pedidos"), where("delivery.assignedTo.id", "==", driverId), where("status", "in", ["Em Preparo", "Saiu para Entrega"]));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" && !isFirstLoad) {
                playNotificationSoundTwice();
            }
        });
        isFirstLoad = false;
        currentOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!deliveryQueueList) return;
        if (currentOrders.length === 0) {
            deliveryQueueList.innerHTML = `<div class="loading-state"><i class="fas fa-motorcycle" style="font-size: 3em; color: #ccc;"></i><p>Nenhuma entrega para você no momento. Aguardando...</p></div>`;
        } else {
            currentOrders.sort((a, b) => (b.createdAt?.toDate() ?? 0) - (a.createdAt?.toDate() ?? 0));
            deliveryQueueList.innerHTML = currentOrders.map(createDeliveryCard).join('');
            addCardClickListeners(deliveryQueueList, currentOrders);
        }
    }, (error) => {
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
        await updateDoc(orderRef, { status: "Saiu para Entrega", lastStatusUpdate: new Date() });
        btnDeliveryAction.disabled = false;
        btnDeliveryAction.innerHTML = '<i class="fas fa-motorcycle"></i> Peguei o Pedido';
        closeDetailsModal();
    });
}

// ALTERADO: Botão de completar entrega agora chama a lógica de conquistas
if (btnCompleteDelivery) {
    btnCompleteDelivery.addEventListener('click', async () => {
        if (!selectedOrder || !auth.currentUser) return;
        
        btnCompleteDelivery.disabled = true;
        btnCompleteDelivery.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';
        
        const orderRef = doc(db, "pedidos", selectedOrder.id);
        const driverRef = doc(db, "delivery_people", auth.currentUser.uid);

        // Atualiza o status do pedido
        await updateDoc(orderRef, { status: "Entregue", lastStatusUpdate: new Date() });

        // Chama a função para incrementar o contador e verificar conquistas
        await checkAndAwardAchievements(driverRef);

        btnCompleteDelivery.disabled = false;
        btnCompleteDelivery.innerHTML = '<i class="fas fa-check-circle"></i> Entrega Finalizada';
        closeDetailsModal();
    });
}

if (historyBtn) {
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
        const endDate = endDateValue ? new Date(endDateValue + 'T00:00:00') : null;
        const user = auth.currentUser;
        if (user) {
            listenForHistory(user.uid, startDate, endDate);
        }
    });
}

// --- LÓGICA PRINCIPAL DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ALTERADO: Busca o perfil completo do entregador ao logar
        const driverRef = doc(db, 'delivery_people', user.uid);
        const driverSnap = await getDoc(driverRef);
        if (driverSnap.exists()) {
            currentDriverProfile = driverSnap.data();
        } else {
            // Se o perfil não existir por algum motivo, cria um básico
            currentDriverProfile = { totalDeliveries: 0, achievements: {} };
        }

        if (driverNameSpan) {
            driverNameSpan.textContent = user.displayName ? user.displayName.split(' ')[0] : "Entregador";
        }
        
        listenForDeliveries(user.uid); 
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        listenForHistory(user.uid, today, today); 

    } else {
        window.location.href = 'login.html';
    }
});