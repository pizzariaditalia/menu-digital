// loyalty.js - VERSÃO DE DIAGNÓSTICO COM CONSOLE.LOG

// ... (O início do arquivo com DISCOUNT_TIERS e getApplicableDiscount permanece o mesmo) ...
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
            return { pointsToUse: tier.points, percentage: tier.percentage, label: tier.label };
        }
    }
    return null;
};
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[DIAGNÓSTICO] loyalty.js: Script carregado e DOM pronto.');

    const loyaltyButton = document.getElementById('loyalty-button');
    const loyaltyModal = document.getElementById('loyalty-modal');
    const closeLoyaltyModalButton = document.getElementById('close-loyalty-modal');
    const googleLoginButton = document.getElementById('google-login-button');
    const lastOrdersButton = document.getElementById('last-orders-button');
    const lastOrdersModal = document.getElementById('last-orders-modal');
    const lastOrdersListDiv = document.getElementById('last-orders-list');
    const closeLastOrdersModalButton = lastOrdersModal?.querySelector('.close-button');

    async function signInWithGoogle() {
        console.log('[DIAGNÓSTICO] signInWithGoogle: Função chamada.');
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
            console.log("[DIAGNÓSTICO] signInWithGoogle: Login com Google BEM-SUCEDIDO. User UID:", user.uid);
            
            const customerData = await getCustomerFromFirestore(user.uid);
            if (customerData) {
                console.log("[DIAGNÓSTICO] signInWithGoogle: Cliente existente encontrado no DB.");
                updateGlobalCustomerState(customerData, user.email);
            } else {
                console.log("[DIAGNÓSTICO] signInWithGoogle: Primeiro login. Criando novo cliente...");
                const newCustomer = {
                    firstName: user.displayName || 'Novo Cliente', email: user.email, points: 0,
                    lastUpdatedAt: new Date(), whatsapp: user.phoneNumber || ''
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

    async function getCustomerFromFirestore(userId) {
        console.log(`[DIAGNÓSTICO] getCustomerFromFirestore: Buscando cliente com UID: ${userId}`);
        if (!window.db || !window.firebaseFirestore) return null;
        const { doc, getDoc } = window.firebaseFirestore;
        const customerDocRef = doc(window.db, "customer", userId);
        const docSnap = await getDoc(customerDocRef);
        if (docSnap.exists()) {
            console.log("[DIAGNÓSTICO] getCustomerFromFirestore: Documento ENCONTRADO.");
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("[DIAGNÓSTICO] getCustomerFromFirestore: Documento NÃO encontrado.");
            return null;
        }
    }
    
    function updateGlobalCustomerState(customerData, identifier) {
        console.log("[DIAGNÓSTICO] updateGlobalCustomerState: Função chamada. Dados recebidos:", customerData);
        if (customerData) {
            window.currentCustomerDetails = customerData;
        } else {
            window.currentCustomerDetails = null;
        }
        console.log("[DIAGNÓSTICO] updateGlobalCustomerState: 'window.currentCustomerDetails' agora é:", window.currentCustomerDetails);

        displayCustomerWelcomeInfo(customerData);
        if (customerData) {
            showWelcomePointsPopup(customerData.points);
        }
        renderLoyaltyModalContent();
        if (typeof window.updateCartUI === 'function') { window.updateCartUI(); }
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

    async function fetchLastOrders(customerId) {
        // ... (código sem alterações)
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
        // ... (código sem alterações)
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
            return `<div class="order-history-card">...</div>`; // Abrevie o HTML aqui
        }).join('');
    }
    
    function renderLoyaltyModalContent() {
        console.log("[DIAGNÓSTICO] renderLoyaltyModalContent: Renderizando conteúdo do modal. 'window.currentCustomerDetails' é:", window.currentCustomerDetails);
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
    
    function openLoyaltyModal() {
        console.log("[DIAGNÓSTICO] openLoyaltyModal: Função chamada.");
        if (!loyaltyModal) return;
        renderLoyaltyModalContent();
        loyaltyModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeLoyaltyModal() { if (loyaltyModal) loyaltyModal.classList.remove('show'); document.body.style.overflow = ''; }
    async function openLastOrdersModal() { 
        // ... (código sem alterações)
        if (!lastOrdersModal || !window.currentCustomerDetails) { alert("Você precisa fazer o login primeiro para ver seus pedidos."); return; };
        lastOrdersModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        lastOrdersListDiv.innerHTML = '<p>Buscando seu histórico de pedidos...</p>';
        const orders = await fetchLastOrders(window.currentCustomerDetails.id);
        renderLastOrders(orders);
    }
    function closeLastOrdersModal() { if (lastOrdersModal) lastOrdersModal.classList.remove('show'); document.body.style.overflow = ''; }
    
    async function loadCurrentCustomerOnPageLoad() {
        console.log("[DIAGNÓSTICO] loadCurrentCustomerOnPageLoad: Configurando listener 'onAuthStateChanged'.");
        const auth = window.firebaseAuth?.getAuth();
        auth.onAuthStateChanged(async (user) => {
            console.log("[DIAGNÓSTICO] onAuthStateChanged: Listener disparado.");
            if (user) {
                console.log("[DIAGNÓSTICO] onAuthStateChanged: Status = LOGADO. UID:", user.uid);
                const customerData = await getCustomerFromFirestore(user.uid);
                updateGlobalCustomerState(customerData, user.email);
            } else {
                console.log("[DIAGNÓSTICO] onAuthStateChanged: Status = DESLOGADO.");
                updateGlobalCustomerState(null, null);
            }
        });
    }

    if (loyaltyButton) loyaltyButton.addEventListener('click', openLoyaltyModal);
    if (closeLoyaltyModalButton) closeLoyaltyModalButton.addEventListener('click', closeLoyaltyModal);
    if (googleLoginButton) googleLoginButton.addEventListener('click', signInWithGoogle);
    if (lastOrdersButton) lastOrdersButton.addEventListener('click', openLastOrdersModal);
    if (closeLastOrdersModalButton) closeLastOrdersModalButton.addEventListener('click', closeLastOrdersModal);
    if (loyaltyModal) {
        loyaltyModal.addEventListener('click', (event) => {
            if (event.target.id === 'logout-button') { signOutUser(); }
        });
    }

    loadCurrentCustomerOnPageLoad();
});
