// loyalty.js - VERSÃO FINAL COM AUTENTICAÇÃO POR TELEFONE E FUNCIONALIDADES COMPLETAS

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
    console.log("Tentando encontrar o botão de fidelidade:", loyaltyButton);
    const loyaltyModal = document.getElementById('loyalty-modal');
    const closeLoyaltyModalButton = document.getElementById('close-loyalty-modal');
    const loyaltyResultsArea = document.getElementById('loyalty-results-area');
    
    // Elementos do Modal de Login
    const phoneInputSection = document.getElementById('phone-input-section');
    const codeInputSection = document.getElementById('code-input-section');
    const loyaltyWhatsAppInput = document.getElementById('loyalty-whatsapp');
    const sendCodeButton = document.getElementById('send-code-button');
    const smsCodeInput = document.getElementById('sms-code');
    const verifyCodeButton = document.getElementById('verify-code-button');

    // Elementos de "Últimos Pedidos"
    const lastOrdersButton = document.getElementById('last-orders-button');
    const lastOrdersModal = document.getElementById('last-orders-modal');
    const lastOrdersListDiv = document.getElementById('last-orders-list');
    const closeLastOrdersModalButton = lastOrdersModal?.querySelector('.close-button');

    // Variável global para o processo de confirmação de SMS
    window.confirmationResult = null;

    // =========================================================================
    // LÓGICA DE AUTENTICAÇÃO POR TELEFONE
    // =========================================================================

    // 1. Configura o reCAPTCHA Verifier do Firebase
    function setupRecaptcha() {
        if (!window.firebaseAuth) {
            console.error("Firebase Auth não foi encontrado. Verifique a importação no index.html.");
            return;
        }
        const auth = window.firebaseAuth.getAuth();
        // Garante que não haja múltiplos verifiers
        if (!window.recaptchaVerifier || window.recaptchaVerifier.auth.app.name !== auth.app.name) {
             window.recaptchaVerifier = new window.firebaseAuth.RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => console.log("reCAPTCHA verificado."),
                'expired-callback': () => console.log("reCAPTCHA expirado.")
            });
        }
    }

    // 2. Envia o código SMS para o número fornecido
    async function sendSmsCode() {
        const phoneNumber = loyaltyWhatsAppInput.value.trim().replace(/\D/g, '');
        if (!/^[0-9]{10,11}$/.test(phoneNumber)) {
            alert("Por favor, insira um número de WhatsApp válido com DDD.");
            return;
        }

        const formattedPhoneNumber = `+55${phoneNumber}`;
        const appVerifier = window.recaptchaVerifier;
        const auth = window.firebaseAuth.getAuth();

        sendCodeButton.disabled = true;
        sendCodeButton.textContent = "Enviando...";

        try {
            window.confirmationResult = await window.firebaseAuth.signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
            phoneInputSection.style.display = 'none';
            codeInputSection.style.display = 'block';
            smsCodeInput.focus();
            alert(`Código de verificação enviado para ${formattedPhoneNumber}`);
        } catch (error) {
            console.error("Erro ao enviar SMS:", error);
            alert("Não foi possível enviar o código. Verifique o número ou tente novamente. (O reCAPTCHA pode ter falhado).");
            window.recaptchaVerifier.render().catch(err => console.error("Falha ao renderizar reCAPTCHA:", err));
        } finally {
            sendCodeButton.disabled = false;
            sendCodeButton.textContent = "Enviar Código SMS";
        }
    }

    // 3. Verifica o código SMS e efetua o login
    async function verifySmsCode() {
        const code = smsCodeInput.value.trim();
        if (code.length !== 6) { alert("Por favor, insira o código de 6 dígitos."); return; }
        if (!window.confirmationResult) { alert("Erro: Tente enviar o código novamente."); return; }

        verifyCodeButton.disabled = true;
        verifyCodeButton.textContent = "Verificando...";

        try {
            const result = await window.confirmationResult.confirm(code);
            const user = result.user;
            console.log("Usuário autenticado com sucesso:", user.uid);
            
            const whatsappNumber = user.phoneNumber.replace('+55', '');
            const customerData = await getCustomerFromFirestore(whatsappNumber);
            
            updateGlobalCustomerState(customerData, whatsappNumber);
            
            closeLoyaltyModal();
            alert("Login realizado com sucesso!");

        } catch (error) {
            console.error("Erro ao verificar código:", error);
            alert("Código inválido. Tente novamente.");
        } finally {
            verifyCodeButton.disabled = false;
            verifyCodeButton.textContent = "Verificar e Entrar";
        }
    }

    // =========================================================================
    // LÓGICA DE DADOS (FIRESTORE E ESTADO GLOBAL)
    // =========================================================================

    async function getCustomerFromFirestore(whatsappNumber) {
        if (!window.db || !window.firebaseFirestore) return null;
        const { doc, getDoc } = window.firebaseFirestore;
        const customerDocRef = doc(window.db, "customer", whatsappNumber);
        const docSnap = await getDoc(customerDocRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    }
    
    // Função central que atualiza o estado do cliente em toda a aplicação
    function updateGlobalCustomerState(customerData, whatsapp) {
        if (customerData) {
            window.currentCustomerDetails = customerData;
            localStorage.setItem('activeCustomerWhatsapp', whatsapp);
            if (loyaltyResultsArea) {
                 loyaltyResultsArea.innerHTML = `<p>Olá, ${customerData.firstName}! Você tem <strong>${customerData.points || 0}</strong> pontos.</p>`;
            }
            displayCustomerWelcomeInfo(customerData); // Mostra "Últimos Pedidos" se aplicável
            showWelcomePointsPopup(customerData.points);
        } else {
            window.currentCustomerDetails = null;
            localStorage.removeItem('activeCustomerWhatsapp');
            if (loyaltyResultsArea) {
                loyaltyResultsArea.innerHTML = `<p>Bem-vindo! Este é seu primeiro acesso. Faça um pedido para começar a juntar pontos!</p>`;
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
    
    // Mostra o botão "Últimos Pedidos" se o cliente estiver "logado"
    function displayCustomerWelcomeInfo(customer) {
        if (lastOrdersButton) {
            // A lógica original volta a funcionar, pois agora temos um cliente autenticado
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
        const q = query(collection(window.db, "pedidos"), where("customer.whatsapp", "==", customerId), orderBy("createdAt", "desc"), limit(3));
        try {
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao buscar últimos pedidos:", error);
            // Este erro agora é esperado se as regras de segurança não permitirem
            alert("Não foi possível carregar os últimos pedidos. As regras de segurança podem não permitir esta ação.");
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
    // LÓGICA DE ABERTURA/FECHAMENTO DOS MODAIS
    // =========================================================================

    function openLoyaltyModal() {
        if (!loyaltyModal) return;
        phoneInputSection.style.display = 'block';
        codeInputSection.style.display = 'none';
        loyaltyResultsArea.innerHTML = '';
        smsCodeInput.value = '';
        loyaltyModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        setupRecaptcha();
        setTimeout(() => {
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().catch(err => console.error("Falha ao renderizar reCAPTCHA:", err));
            }
        }, 500);
    }
    function closeLoyaltyModal() {
        if (loyaltyModal) loyaltyModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    async function openLastOrdersModal() {
        if (!lastOrdersModal || !window.currentCustomerDetails) {
            alert("Você precisa fazer o login por telefone primeiro para ver seus pedidos.");
            return;
        };
        lastOrdersModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        lastOrdersListDiv.innerHTML = '<p>Buscando seu histórico de pedidos...</p>';
        const orders = await fetchLastOrders(window.currentCustomerDetails.whatsapp);
        renderLastOrders(orders);
    }
    function closeLastOrdersModal() {
        if (lastOrdersModal) lastOrdersModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    async function loadCurrentCustomerOnPageLoad() {
        // Esta função pode ser simplificada ou removida se o login for sempre exigido
        // Por agora, vamos manter para consistência, mas o ideal é que o usuário se autentique a cada visita
        // para garantir a segurança.
        const auth = window.firebaseAuth?.getAuth();
        if (auth?.currentUser) {
            const whatsappNumber = auth.currentUser.phoneNumber.replace('+55', '');
            const customerData = await getCustomerFromFirestore(whatsappNumber);
            updateGlobalCustomerState(customerData, whatsappNumber);
        }
    }


    // =========================================================================
    // EVENT LISTENERS (OUVINTES DE EVENTOS)
    // =========================================================================

    if (loyaltyButton) loyaltyButton.addEventListener('click', openLoyaltyModal);
    if (closeLoyaltyModalButton) closeLoyaltyModalButton.addEventListener('click', closeLoyaltyModal);
    if (sendCodeButton) sendCodeButton.addEventListener('click', sendSmsCode);
    if (verifyCodeButton) verifyCodeButton.addEventListener('click', verifySmsCode);
    if (lastOrdersButton) lastOrdersButton.addEventListener('click', openLastOrdersModal);
    if (closeLastOrdersModalButton) closeLastOrdersModalButton.addEventListener('click', closeLastOrdersModal);

    // Carrega o cliente se ele já estiver logado na sessão ao carregar a página
    loadCurrentCustomerOnPageLoad();
});
