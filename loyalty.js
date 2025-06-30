// loyalty.js - VERSÃO CORRIGIDA E ROBUSTA

// =========================================================================
// CONSTANTES E FUNÇÕES GLOBAIS DO MÓDULO
// =========================================================================

const DISCOUNT_TIERS = [
    { points: 20, percentage: 0.20, label: "Usar 20 pontos para 20% de desconto em pizzas" },
    { points: 16, percentage: 0.15, label: "Usar 16 pontos para 15% de desconto em pizzas" },
    { points: 12, percentage: 0.10, label: "Usar 12 pontos para 10% de desconto em pizzas" },
    { points: 8,  percentage: 0.05, label: "Usar 8 pontos para 5% de desconto em pizzas" }
];

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

// =========================================================================
// INICIALIZAÇÃO PRINCIPAL DO SCRIPT
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos do DOM ---
    const loyaltyButton = document.getElementById('loyalty-button');
    const loyaltyModal = document.getElementById('loyalty-modal');
    const closeLoyaltyModalButton = document.getElementById('close-loyalty-modal');
    const googleLoginButton = document.getElementById('google-login-button');
    const lastOrdersButton = document.getElementById('last-orders-button');
    const lastOrdersModal = document.getElementById('last-orders-modal');
    const lastOrdersListDiv = document.getElementById('last-orders-list');
    const orderDetailsModal = document.getElementById('order-details-modal');

    // --- Lógica para Fechar os Modais (Forma Segura) ---
    // Adiciona o evento de clique apenas se o botão existir.
    if (closeLoyaltyModalButton) {
        closeLoyaltyModalButton.addEventListener('click', () => closeModal(loyaltyModal));
    }
    if (lastOrdersModal) {
        const closeButton = lastOrdersModal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => closeModal(lastOrdersModal));
        }
    }
    if (orderDetailsModal) {
        const closeButton = orderDetailsModal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => closeModal(orderDetailsModal));
        }
    }

    // =========================================================================
    // LÓGICA DE AUTENTICAÇÃO COM GOOGLE
    // =========================================================================

    async function signInWithGoogle() {
        if (!window.firebaseAuth || !window.firebaseFirestore) {
            console.error("Firebase Auth ou Firestore não inicializado.");
            alert("Erro de configuração. Tente novamente mais tarde.");
            return;
        }

        const auth = window.firebaseAuth.getAuth();
        const provider = new window.firebaseAuth.GoogleAuthProvider();
        const { signInWithPopup } = window.firebaseAuth;
        const { setDoc, doc } = window.firebaseFirestore;

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const customerData = await getCustomerFromFirestore(user.uid);

            if (customerData) {
                updateGlobalCustomerState(customerData, user.email);
            } else {
                const newCustomer = {
                    firstName: user.displayName || 'Novo Cliente',
                    email: user.email,
                    points: 0,
                    lastUpdatedAt: new Date(),
                    whatsapp: user.phoneNumber || ''
                };

                const customerDocRef = doc(window.db, "customer", user.uid);
                await setDoc(customerDocRef, newCustomer);

                updateGlobalCustomerState({ id: user.uid, ...newCustomer }, user.email);
            }

            closeLoyaltyModal();
            alert(`Bem-vindo, ${user.displayName}! Login realizado com sucesso.`);

        } catch (error) {
            console.error("Erro durante o login com Google:", error);
            alert("Não foi possível fazer o login com o Google. Por favor, tente novamente.");
        }
    }

    async function signOutUser() {
        if (!window.firebaseAuth) return;
        const auth = window.firebaseAuth.getAuth();
        try {
            await auth.signOut();
            closeLoyaltyModal();
            alert("Você saiu da sua conta.");
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            alert("Não foi possível sair. Tente novamente.");
        }
    }


    // =========================================================================
    // LÓGICA DE DADOS (FIRESTORE E ESTADO GLOBAL)
    // =========================================================================

    async function getCustomerFromFirestore(userId) {
        if (!window.db || !window.firebaseFirestore) return null;
        const { doc, getDoc } = window.firebaseFirestore;
        const customerDocRef = doc(window.db, "customer", userId);
        const docSnap = await getDoc(customerDocRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    }

    function updateGlobalCustomerState(customerData, identifier) {
        if (customerData) {
            window.currentCustomerDetails = customerData;
            localStorage.setItem('activeCustomerId', customerData.id);
        } else {
            window.currentCustomerDetails = null;
            localStorage.removeItem('activeCustomerId');
        }

        displayCustomerWelcomeInfo(customerData);
        if (customerData) {
            showWelcomePointsPopup(customerData.points);
        }

        renderLoyaltyModalContent();

        if (typeof window.updateCartUI === 'function') {
            window.updateCartUI();
        }

        if (typeof window.checkSpinEligibility === 'function') {
           window.checkSpinEligibility();
        }
    }

    function showWelcomePointsPopup(points) {
        const popup = document.getElementById('welcome-points-popup');
        const pointsValueSpan = document.getElementById('popup-points-value');
        if (!popup || !pointsValueSpan) return;
        pointsValueSpan.textContent = points || 0;
        popup.classList.add('show');
        setTimeout(() => popup.classList.remove('show'), 5000);
    }

    function displayCustomerWelcomeInfo(customer) {
        if (lastOrdersButton) {
            lastOrdersButton.style.display = customer ? 'flex' : 'none';
        }
    }
    window.displayCustomerWelcomeInfo = displayCustomerWelcomeInfo;

    // =========================================================================
    // LÓGICA DE "ÚLTIMOS PEDIDOS"
    // =========================================================================

    function getOrderStatusClass(status) {
        const safeStatus = status ? status.toLowerCase() : '';
        if (safeStatus.includes('recebido') || safeStatus.includes('aguardando')) {
            return 'status-aguardando';
        }
        if (safeStatus.includes('preparo')) {
            return 'status-preparando';
        }
        if (safeStatus.includes('entrega') || safeStatus.includes('caminho')) {
            return 'status-a-caminho';
        }
        if (safeStatus.includes('entregue') || safeStatus.includes('finalizado')) {
            return 'status-entregue';
        }
        if (safeStatus.includes('cancelado')) {
            return 'status-cancelado';
        }
        return 'status-desconhecido';
    }

    async function fetchLastOrders(customerId) {
        if (!window.db || !window.firebaseFirestore) return [];
        const { collection, query, where, orderBy, limit, getDocs } = window.firebaseFirestore;
        const q = query(collection(window.db, "pedidos"), where("customer.id", "==", customerId), orderBy("createdAt", "desc"), limit(3));
        try {
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao buscar últimos pedidos:", error);
            alert("Não foi possível carregar os últimos pedidos.");
            return [];
        }
    }

    function renderLastOrders(orders) {
        if (!lastOrdersListDiv) return;
        if (orders.length === 0) {
            lastOrdersListDiv.innerHTML = '<p class="empty-list-message">Nenhum pedido encontrado no seu histórico.</p>';
            return;
        }
        const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

        lastOrdersListDiv.innerHTML = orders.map(order => {
            let formattedDate = 'Data indisponível';
            if (order.createdAt?.toDate) {
                const d = order.createdAt.toDate();
                formattedDate = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            }
            return `
            <div class="order-history-card">
              <div class="order-history-header">
                  <span class="order-id">Pedido #${(order.orderId || order.id).substring(0, 8)}</span>
                  <span class="order-status ${getOrderStatusClass(order.status)}">${order.status || 'Status N/A'}</span>
              </div>
              <div class="order-history-body">
                <p class="order-date">${formattedDate}</p>
                <ul>${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}</ul>
              </div>
              <div class="order-history-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span class="order-total">Total: ${formatPrice(order.totals.grandTotal)}</span>
                <div class="order-actions" style="display: flex; gap: 8px;">
                    <button class="btn-view-order" data-order-id="${order.id}">Ver Pedido</button>
                    <button class="btn-reorder" data-order-id="${order.id}">Pedir Novamente</button>
                </div>
              </div>
            </div>`;
        }).join('');

        lastOrdersListDiv.querySelectorAll('.btn-view-order').forEach(button => {
            button.addEventListener('click', (event) => {
                const orderToView = orders.find(o => o.id === event.target.dataset.orderId);
                if (orderToView) {
                    renderOrderDetailsModal(orderToView);
                }
            });
        });

        lastOrdersListDiv.querySelectorAll('.btn-reorder').forEach(button => {
            button.addEventListener('click', (event) => {
                const orderToReorder = orders.find(o => o.id === event.target.dataset.orderId);
                if (orderToReorder?.items) {
                    orderToReorder.items.forEach(item => window.addToCart(item));
                    closeModal(lastOrdersModal);
                    window.openCartModal();
                }
            });
        });
    }

    // =========================================================================
    // LÓGICA DE ABERTURA/FECHAMENTO E RENDERIZAÇÃO DOS MODAIS
    // =========================================================================

    function renderLoyaltyModalContent() {
        const showNotificationFeature = true;
        const googleLoginSection = document.getElementById('google-login-section');
        const loyaltyResultsArea = document.getElementById('loyalty-results-area');

        if (!googleLoginSection || !loyaltyResultsArea) return;

        if (window.currentCustomerDetails) {
            googleLoginSection.style.display = 'none';
            loyaltyResultsArea.style.display = 'block';
            let rulesHtml = DISCOUNT_TIERS.map(tier => `<li style="margin-bottom: 8px;"><strong>${tier.points} pontos</strong> = ${tier.percentage * 100}% de desconto em pizzas</li>`).join('');
            loyaltyResultsArea.innerHTML = `
                <p style="margin-bottom: 10px;">Olá, <strong>${window.currentCustomerDetails.firstName}</strong>!</p>
                ${showNotificationFeature ? `<div id="notification-button-area" style="text-align:center; margin-bottom: 25px;">...</div>` : ''}
                <div class="points-display-banner">...</div>
                <div class="loyalty-rules-section">...</div>
                <button id="logout-button" class="button-link-style">Sair da conta</button>`;
            
            // Re-preenche o conteúdo dinâmico que foi abreviado
            loyaltyResultsArea.querySelector('.points-display-banner').innerHTML = `<p class="points-banner-text">Você tem</p><span class="points-banner-value">${window.currentCustomerDetails.points || 0}</span><p class="points-banner-label">pontos</p>`;
            loyaltyResultsArea.querySelector('.loyalty-rules-section').innerHTML = `<h4 style="font-size: 1.1em; margin-bottom: 10px; color: var(--dark-gray);">Como Resgatar:</h4><ul style="list-style: none; padding-left: 0; font-size: 0.9em; color: var(--medium-gray);">${rulesHtml}</ul><p style="font-size: 0.8em; color: #888; margin-top: 15px; text-align: center; font-style: italic;">O maior desconto disponível para seus pontos será oferecido no seu carrinho.</p>`;

            if (showNotificationFeature) {
                const notificationArea = document.getElementById('notification-button-area');
                if (window.currentCustomerDetails.notificationTokens && window.currentCustomerDetails.notificationTokens.length > 0) {
                    notificationArea.innerHTML = '<p style="color:var(--green-status); font-weight:bold;">Notificações ativadas!</p>';
                } else {
                    notificationArea.innerHTML = `<p style="font-size:0.9em; margin-bottom:10px; margin-top:0;">Quer receber promoções exclusivas e saber o status do seu pedido?</p><button id="enable-notifications-button" class="add-to-cart-button-modal" style="width:auto; padding: 10px 20px;">Ativar Notificações</button>`;
                    const enableNotificationsButton = document.getElementById('enable-notifications-button');
                    if (enableNotificationsButton) {
                        enableNotificationsButton.addEventListener('click', () => {
                            if (typeof requestNotificationPermission === 'function') {
                                requestNotificationPermission();
                            } else {
                                console.error("Função requestNotificationPermission não encontrada.");
                            }
                        });
                    }
                }
            }

        } else {
            googleLoginSection.style.display = 'block';
            loyaltyResultsArea.style.display = 'none';
        }
    }

    function renderOrderDetailsModal(order) {
        const contentDiv = document.getElementById('order-details-content');
        if (!orderDetailsModal || !contentDiv) return;

        const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
        let formattedDate = 'Data indisponível';
        if (order.createdAt?.toDate) {
            const d = order.createdAt.toDate();
            formattedDate = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }

        let detailsHtml = `
            <div class="order-summary-section"><h4>Pedido #${(order.orderId || order.id).substring(0, 8)}</h4><p><strong>Data:</strong> ${formattedDate}</p><p><strong>Status:</strong> <span class="order-status ${getOrderStatusClass(order.status)}">${order.status || 'Status N/A'}</span></p></div>
            <div class="order-summary-section"><h4>Itens do Pedido</h4><ul class="order-items-list-summary">${order.items.map(item => `<li><span>${item.quantity}x ${item.name}</span><span>${formatPrice(item.unitPrice * item.quantity)}</span></li>${item.notes ? `<li class="item-notes-summary">Obs: ${item.notes}</li>` : ''}`).join('')}</ul></div>
            <div class="order-summary-section"><h4>Resumo Financeiro</h4><div class="order-totals-summary"><div><span>Subtotal</span> <span>${formatPrice(order.totals.subtotal)}</span></div>${order.totals.discount > 0 ? `<div><span style="color: var(--green-status);">Desconto</span> <span style="color: var(--green-status);">- ${formatPrice(order.totals.discount)}</span></div>` : ''}<div><span>Taxa de Entrega</span> <span>${formatPrice(order.totals.deliveryFee)}</span></div><div class="grand-total-summary"><strong>Total Pago</strong> <strong>${formatPrice(order.totals.grandTotal)}</strong></div></div></div>
            <div class="order-summary-section"><h4>Endereço de Entrega</h4><p>${order.delivery.address}<br>Bairro: ${order.delivery.neighborhood}<br>${order.delivery.complement ? `Complemento: ${order.delivery.complement}<br>` : ''}${order.delivery.reference ? `Referência: ${order.delivery.reference}` : ''}</p></div>
            <div class="order-summary-section"><h4>Pagamento</h4><p>Forma de Pagamento: ${order.payment.method}</p></div>`;

        contentDiv.innerHTML = detailsHtml;
        openModal(orderDetailsModal);
    }

    function openLoyaltyModal() {
        if (!loyaltyModal) return;
        renderLoyaltyModalContent();
        openModal(loyaltyModal);
    }

    async function openLastOrdersModal() {
        if (!lastOrdersModal || !window.currentCustomerDetails) {
            alert("Você precisa fazer o login primeiro para ver seus pedidos.");
            return;
        }
        openModal(lastOrdersModal);

        lastOrdersListDiv.innerHTML = '<p>Buscando seu histórico de pedidos...</p>';
        const orders = await fetchLastOrders(window.currentCustomerDetails.id);
        renderLastOrders(orders);
    }
    
    async function loadCurrentCustomerOnPageLoad() {
        if (!window.firebaseAuth) return;
        const auth = window.firebaseAuth.getAuth();
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const customerData = await getCustomerFromFirestore(user.uid);
                updateGlobalCustomerState(customerData, user.email);
            } else {
                updateGlobalCustomerState(null, null);
            }
        });
    }

    // =========================================================================
    // EVENT LISTENERS PRINCIPAIS
    // =========================================================================

    if (loyaltyButton) loyaltyButton.addEventListener('click', openLoyaltyModal);
    if (googleLoginButton) googleLoginButton.addEventListener('click', signInWithGoogle);
    if (lastOrdersButton) lastOrdersButton.addEventListener('click', openLastOrdersModal);
    
    if (loyaltyModal) {
        loyaltyModal.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'logout-button') {
                signOutUser();
            }
        });
    }

    loadCurrentCustomerOnPageLoad();
});
