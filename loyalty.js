// loyalty.js - VERSÃO FINAL COM LÓGICA REATIVA PARA O MODAL

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

    // Elementos de "Últimos Pedidos"
    const lastOrdersButton = document.getElementById('last-orders-button');
    const lastOrdersModal = document.getElementById('last-orders-modal');
    const lastOrdersListDiv = document.getElementById('last-orders-list');
    const closeLastOrdersModalButton = lastOrdersModal?.querySelector('.close-button');


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
            
            console.log("Usuário logado com Google:", user.uid, user.displayName);

            const customerData = await getCustomerFromFirestore(user.uid);

            if (customerData) {
                console.log("Cliente existente encontrado:", customerData);
                updateGlobalCustomerState(customerData, user.email);
            } else {
                console.log("Primeiro login. Criando novo cliente no Firestore...");
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
            // A função onAuthStateChanged cuidará de atualizar o estado
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
    
    // *** FUNÇÃO ATUALIZADA ***
    function updateGlobalCustomerState(customerData, identifier) {
        if (customerData) {
            window.currentCustomerDetails = customerData;
            localStorage.setItem('activeCustomerId', customerData.id);
        } else {
            window.currentCustomerDetails = null;
            localStorage.removeItem('activeCustomerId');
        }

        // Chamadas para atualizar a UI
        displayCustomerWelcomeInfo(customerData);
        if (customerData) {
            showWelcomePointsPopup(customerData.points);
        }
        
        // **NOVO**: Atualiza o conteúdo do modal sempre que o estado do usuário mudar
        renderLoyaltyModalContent();

        if (typeof window.updateCartUI === 'function') {
            window.updateCartUI();
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
        const lastOrdersButton = document.getElementById('last-orders-button');
        if (lastOrdersButton) {
            lastOrdersButton.style.display = customer ? 'flex' : 'none';
        }
    }
    window.displayCustomerWelcomeInfo = displayCustomerWelcomeInfo;

    // =========================================================================
    // LÓGICA DE "ÚLTIMOS PEDIDOS"
    // =========================================================================

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
                  <span class="order-status">${order.status || 'Status N/A'}</span>
              </div>
              <div class="order-history-body">
                <p class="order-date">${formattedDate}</p>
                <ul>${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}</ul>
              </div>
              <div class="order-history-footer">
                <span class="order-total">Total: ${formatPrice(order.totals.grandTotal)}</span>
                <button class="btn-reorder" data-order-id="${order.id}">Pedir Novamente</button>
              </div>
            </div>`;
        }).join('');
        lastOrdersListDiv.querySelectorAll('.btn-reorder').forEach(button => {
            button.addEventListener('click', (event) => {
                const orderToReorder = orders.find(o => o.id === event.target.dataset.orderId);
                if (orderToReorder?.items) {
                    orderToReorder.items.forEach(item => window.addToCart(item));
                    closeLastOrdersModal();
                    window.openCartModal();
                }
            });
        });
    }

    // =========================================================================
    // LÓGICA DE ABERTURA/FECHAMENTO E RENDERIZAÇÃO DOS MODAIS
    // =========================================================================
    
    // **NOVA FUNÇÃO** para renderizar o conteúdo do modal
    function renderLoyaltyModalContent() {
        const googleLoginSection = document.getElementById('google-login-section');
        const loyaltyResultsArea = document.getElementById('loyalty-results-area');

        if (!googleLoginSection || !loyaltyResultsArea) return;

        if (window.currentCustomerDetails) {
            googleLoginSection.style.display = 'none';
            loyaltyResultsArea.style.display = 'block';

            loyaltyResultsArea.innerHTML = `
                <p style="margin-bottom: 20px;">Olá, <strong>${window.currentCustomerDetails.firstName}</strong>!</p>
                <div class="points-display-banner">
                    <p class="points-banner-text">Você tem</p>
                    <span class="points-banner-value">${window.currentCustomerDetails.points || 0}</span>
                    <p class="points-banner-label">pontos</p>
                </div>
                <button id="logout-button" class="button-link-style" style="margin-top: 20px; color: var(--medium-gray);">Sair da conta</button>
            `;
        } else {
            googleLoginSection.style.display = 'block';
            loyaltyResultsArea.style.display = 'none';
        }
    }
    
    // **FUNÇÃO ATUALIZADA**
    function openLoyaltyModal() {
        if (!loyaltyModal) return;
        renderLoyaltyModalContent(); // Apenas renderiza o conteúdo e abre
        loyaltyModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeLoyaltyModal() {
        if (loyaltyModal) loyaltyModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    async function openLastOrdersModal() {
        if (!lastOrdersModal || !window.currentCustomerDetails) {
            alert("Você precisa fazer o login primeiro para ver seus pedidos.");
            return;
        };
        lastOrdersModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        lastOrdersListDiv.innerHTML = '<p>Buscando seu histórico de pedidos...</p>';
        const orders = await fetchLastOrders(window.currentCustomerDetails.id);
        renderLastOrders(orders);
    }

    function closeLastOrdersModal() {
        if (lastOrdersModal) lastOrdersModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    async function loadCurrentCustomerOnPageLoad() {
        const auth = window.firebaseAuth?.getAuth();
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
    // EVENT LISTENERS (OUVINTES DE EVENTOS)
    // =========================================================================

    if (loyaltyButton) loyaltyButton.addEventListener('click', openLoyaltyModal);
    if (closeLoyaltyModalButton) closeLoyaltyModalButton.addEventListener('click', closeLoyaltyModal);
    if (googleLoginButton) googleLoginButton.addEventListener('click', signInWithGoogle);
    if (lastOrdersButton) lastOrdersButton.addEventListener('click', openLastOrdersModal);
    if (closeLastOrdersModalButton) closeLastOrdersModalButton.addEventListener('click', closeLastOrdersModal);

    if (loyaltyModal) {
        loyaltyModal.addEventListener('click', (event) => {
            if (event.target.id === 'logout-button') {
                signOutUser();
            }
        });
    }

    loadCurrentCustomerOnPageLoad();
});
