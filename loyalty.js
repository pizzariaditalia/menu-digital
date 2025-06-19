// loyalty.js - VERSÃO SEM AS REGRAS DE DESCONTO (USA AS DO CART.JS)

document.addEventListener('DOMContentLoaded', () => {
    
    const loyaltyButton = document.getElementById('loyalty-button');
    const loyaltyModal = document.getElementById('loyalty-modal');
    const closeLoyaltyModalButton = document.getElementById('close-loyalty-modal');
    const googleLoginButton = document.getElementById('google-login-button');
    const loyaltyResultsArea = document.getElementById('loyalty-results-area');
    const lastOrdersButton = document.getElementById('last-orders-button');
    const lastOrdersModal = document.getElementById('last-orders-modal');
    const lastOrdersListDiv = document.getElementById('last-orders-list');
    const closeLastOrdersModalButton = lastOrdersModal?.querySelector('.close-button');

    async function signInWithGoogle() {
        if (!window.firebaseAuth || !window.firebaseFirestore) {
            alert("Erro de configuração.");
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
                updateGlobalCustomerState(customerData);
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
                updateGlobalCustomerState({ id: user.uid, ...newCustomer });
            }
            closeLoyaltyModal();
            alert(`Bem-vindo, ${user.displayName}! Login realizado com sucesso.`);
        } catch (error) {
            console.error("Erro com Google:", error);
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
        }
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
        
        displayCustomerWelcomeInfo(customerData);
        if (customerData) {
            showWelcomePointsPopup(customerData.points);
        }
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
        if (lastOrdersButton) {
            lastOrdersButton.style.display = customer ? 'flex' : 'none';
        }
    }

    function renderLoyaltyModalContent() {
        const googleLoginSection = document.getElementById('google-login-section');
        const loyaltyResultsArea = document.getElementById('loyalty-results-area');
        if (!googleLoginSection || !loyaltyResultsArea) return;

        if (window.currentCustomerDetails) {
            googleLoginSection.style.display = 'none';
            loyaltyResultsArea.style.display = 'block';

            // ESTA LINHA AGORA DEPENDE DA FUNÇÃO DEFINIDA NO CART.JS
            let rulesHtml = typeof window.getApplicableDiscountTiers === 'function' 
                ? window.getApplicableDiscountTiers().map(tier => `<li style="margin-bottom: 8px;"><strong>${tier.points} pontos</strong> = ${tier.percentage * 100}% de desconto em pizzas</li>`).join('')
                : '<li>Regras não disponíveis.</li>';

            loyaltyResultsArea.innerHTML = `
                <p style="margin-bottom: 20px;">Olá, <strong>${window.currentCustomerDetails.firstName}</strong>!</p>
                <div class="points-display-banner">
                    <p class="points-banner-text">Você tem</p>
                    <span class="points-banner-value">${window.currentCustomerDetails.points || 0}</span>
                    <p class="points-banner-label">pontos</p>
                </div>
                <div class="loyalty-rules-section" style="margin-top: 25px; text-align: left;">
                    <h4 style="font-size: 1.1em; margin-bottom: 10px; color: var(--dark-gray);">Como Resgatar:</h4>
                    <ul style="list-style: none; padding-left: 0; font-size: 0.9em; color: var(--medium-gray);">
                        ${rulesHtml}
                    </ul>
                    <p style="font-size: 0.8em; color: #888; margin-top: 15px; text-align: center; font-style: italic;">
                        O maior desconto disponível para seus pontos será oferecido no seu carrinho.
                    </p>
                </div>
                <button id="logout-button" class="button-link-style" style="margin-top: 20px; color: var(--medium-gray);">Sair da conta</button>
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
