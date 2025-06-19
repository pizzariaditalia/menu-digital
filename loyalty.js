// loyalty.js - VERSÃO FINAL DE PRODUÇÃO COM CHAMADA PARA ROLETA

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

document.addEventListener('DOMContentLoaded', () => {
    const loyaltyButton = document.getElementById('loyalty-button');
    const loyaltyModal = document.getElementById('loyalty-modal');
    const closeLoyaltyModalButton = document.getElementById('close-loyalty-modal');
    const googleLoginButton = document.getElementById('google-login-button');
    const loyaltyResultsArea = document.getElementById('loyalty-results-area');
    const lastOrdersButton = document.getElementById('last-orders-button');
    
    async function signInWithGoogle() {
        if (!window.firebaseAuth) { alert("Erro de configuração."); return; }
        const auth = window.firebaseAuth.getAuth();
        const provider = new window.firebaseAuth.GoogleAuthProvider();
        const { signInWithPopup } = window.firebaseAuth;
        const { setDoc, doc } = window.firebaseFirestore;
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const customerData = await getCustomerFromFirestore(user.uid);
            if (customerData) {
                updateGlobalCustomerState(customerData);
            } else {
                const newCustomer = { firstName: user.displayName || 'Novo Cliente', email: user.email, points: 0, lastUpdatedAt: new Date(), whatsapp: user.phoneNumber || '' };
                const customerDocRef = doc(window.db, "customer", user.uid);
                await setDoc(customerDocRef, newCustomer);
                updateGlobalCustomerState({ id: user.uid, ...newCustomer });
            }
            closeLoyaltyModal();
            alert(`Bem-vindo, ${user.displayName}! Login realizado com sucesso.`);
        } catch (error) { console.error("Erro com Google:", error); }
    }

    async function signOutUser() {
        if (!window.firebaseAuth) return;
        const auth = window.firebaseAuth.getAuth();
        try {
            await auth.signOut();
            closeLoyaltyModal();
            alert("Você saiu da sua conta.");
        } catch (error) { console.error("Erro ao fazer logout:", error); }
    }

    async function getCustomerFromFirestore(userId) {
        if (!window.db || !window.firebaseFirestore) return null;
        const { doc, getDoc } = window.firebaseFirestore;
        const customerDocRef = doc(window.db, "customer", userId);
        const docSnap = await getDoc(customerDocRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    }
    
    function updateGlobalCustomerState(customerData) {
        window.currentCustomerDetails = customerData || null;
        renderLoyaltyModalContent(); // Atualiza o modal de pontos
        displayCustomerWelcomeInfo(customerData);
        if (customerData) {
            showWelcomePointsPopup(customerData.points);
        }
        if (typeof window.updateCartUI === 'function') {
            window.updateCartUI();
        }
        // AVISA O SCRIPT DA ROLETA QUE O USUÁRIO FOI CARREGADO
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

    function renderLoyaltyModalContent() {
        if (!loyaltyModal) return;
        const googleLoginSection = document.getElementById('google-login-section');
        const loyaltyResultsArea = document.getElementById('loyalty-results-area');
        if (!googleLoginSection || !loyaltyResultsArea) return;

        if (window.currentCustomerDetails) {
            googleLoginSection.style.display = 'none';
            loyaltyResultsArea.style.display = 'block';
            let rulesHtml = DISCOUNT_TIERS.map(tier => `<li style="margin-bottom: 8px;"><strong>${tier.points} pontos</strong> = ${tier.percentage * 100}% de desconto em pizzas</li>`).join('');
            loyaltyResultsArea.innerHTML = `
                <p style="margin-bottom: 20px;">Olá, <strong>${window.currentCustomerDetails.firstName}</strong>!</p>
                <div class="points-display-banner">...</div>
                <div class="loyalty-rules-section">...</div>
                <button id="logout-button" class="button-link-style">Sair da conta</button>
            `;
        } else {
            googleLoginSection.style.display = 'block';
            loyaltyResultsArea.style.display = 'none';
        }
    }
    
    function openLoyaltyModal() {
        if (!loyaltyModal) return;
        renderLoyaltyModalContent();
        loyaltyModal.classList.add('show');
    }
    
    function closeLoyaltyModal() { 
        if (loyaltyModal) loyaltyModal.classList.remove('show'); 
    }
    
    function loadCurrentCustomerOnPageLoad() {
        const auth = window.firebaseAuth.getAuth();
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const customerData = await getCustomerFromFirestore(user.uid);
                updateGlobalCustomerState(customerData);
            } else {
                updateGlobalCustomerState(null);
            }
        });
    }

    if (loyaltyButton) loyaltyButton.addEventListener('click', openLoyaltyModal);
    if (closeLoyaltyModalButton) closeLoyaltyModalButton.addEventListener('click', closeLoyaltyModal);
    if (googleLoginButton) googleLoginButton.addEventListener('click', signInWithGoogle);
    if (loyaltyModal) {
        loyaltyModal.addEventListener('click', (event) => {
            if (event.target.id === 'logout-button') { signOutUser(); }
        });
    }

    loadCurrentCustomerOnPageLoad();
});
