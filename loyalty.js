// loyalty.js - VERSÃO FINAL COM LOGIN POR GOOGLE

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
    const loyaltyResultsArea = document.getElementById('loyalty-results-area');
    const googleLoginButton = document.getElementById('google-login-button'); // Nosso novo botão

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
            // 1. Abre o Pop-up de Login do Google
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            console.log("Usuário logado com Google:", user.uid, user.displayName);

            // 2. Verifica se o cliente já existe no nosso banco de dados
            const customerData = await getCustomerFromFirestore(user.uid);

            if (customerData) {
                // Se o cliente já existe, apenas atualiza o estado global
                console.log("Cliente existente encontrado:", customerData);
                updateGlobalCustomerState(customerData, user.email);
            } else {
                // 3. Se é o PRIMEIRO LOGIN, cria um novo registro para ele no Firestore
                console.log("Primeiro login. Criando novo cliente no Firestore...");
                const newCustomer = {
                    firstName: user.displayName || 'Novo Cliente',
                    email: user.email,
                    points: 0,
                    lastUpdatedAt: new Date(),
                    whatsapp: user.phoneNumber || '' // Tenta pegar o telefone, se houver
                };

                // Salva o novo cliente no Firestore usando o UID como ID do documento
                const customerDocRef = doc(window.db, "customer", user.uid);
                await setDoc(customerDocRef, newCustomer);

                updateGlobalCustomerState({ id: user.uid, ...newCustomer }, user.email);
            }

            // 4. Fecha a janela de login e avisa o usuário
            closeLoyaltyModal();
            alert(`Bem-vindo, ${user.displayName}! Login realizado com sucesso.`);

        } catch (error) {
            console.error("Erro durante o login com Google:", error);
            alert("Não foi possível fazer o login com o Google. Por favor, tente novamente.");
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
            if (loyaltyResultsArea) {
                 loyaltyResultsArea.innerHTML = `<p>Olá, ${customerData.firstName}! Você tem <strong>${customerData.points || 0}</strong> pontos.</p>`;
            }
            displayCustomerWelcomeInfo(customerData);
            showWelcomePointsPopup(customerData.points);
        } else {
            window.currentCustomerDetails = null;
            localStorage.removeItem('activeCustomerId');
            if (loyaltyResultsArea) {
                loyaltyResultsArea.innerHTML = `<p>Bem-vindo! Faça login com sua conta Google para começar a juntar pontos!</p>`;
            }
            displayCustomerWelcomeInfo(null);
        }
        
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
        // A consulta por 'whatsapp' pode precisar ser ajustada para 'email' ou 'customerId'
        // dependendo de como os pedidos são salvos. Vamos manter assim por enquanto.
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
        // Esta função permanece a mesma de antes
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
    // LÓGICA DE ABERTURA/FECHAMENTO DOS MODAIS
    // =========================================================================

    function openLoyaltyModal() {
        if (!loyaltyModal) return;
        loyaltyResultsArea.innerHTML = '';
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
        const orders = await fetchLastOrders(window.currentCustomerDetails.id); // Busca por ID
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
                // Usuário está logado
                const customerData = await getCustomerFromFirestore(user.uid);
                if (customerData) {
                    updateGlobalCustomerState(customerData, user.email);
                }
            } else {
                // Usuário está deslogado
                updateGlobalCustomerState(null, null);
            }
        });
    }


    // =========================================================================
    // EVENT LISTENERS (OUVINTES DE EVENTOS)
    // =========================================================================

    if (loyaltyButton) loyaltyButton.addEventListener('click', openLoyaltyModal);
    if (closeLoyaltyModalButton) closeLoyaltyModalButton.addEventListener('click', closeLoyaltyModal);
    if (googleLoginButton) googleLoginButton.addEventListener('click', signInWithGoogle); // NOVO
    if (lastOrdersButton) lastOrdersButton.addEventListener('click', openLastOrdersModal);
    if (closeLastOrdersModalButton) closeLastOrdersModalButton.addEventListener('click', closeLastOrdersModal);

    // Carrega o cliente se ele já estiver logado na sessão ao carregar a página
    loadCurrentCustomerOnPageLoad();
});
