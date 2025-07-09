// Arquivo: saques.js - VERSÃO FINAL E CORRIGIDA

// --- FUNÇÃO AUXILIAR DISPONÍVEL PARA TODO O ARQUIVO ---
const formatPrice = (price) => (price != null) ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00";

let saquesSectionInitialized = false;

// Função principal que será chamada para inicializar a seção
async function initializeSaquesSection() {
    if (saquesSectionInitialized) return;
    saquesSectionInitialized = true;
    console.log("Módulo Saques.js: Inicializando...");

    listenForPendingWithdrawals();
}

// Função para ouvir em tempo real as solicitações pendentes
function listenForPendingWithdrawals() {
    const listContainer = document.getElementById('saques-list-container');
    if (!listContainer) return;

    const { collection, query, where, onSnapshot, orderBy } = window.firebaseFirestore;
    const q = query(collection(window.db, "withdrawal_requests"), where("status", "==", "pending"), orderBy("requestedAt", "desc"));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="empty-list-message">Nenhuma solicitação de saque pendente.</p>';
            return;
        }
        
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderWithdrawalRequests(requests);

    }, (error) => {
        console.error("Erro ao buscar solicitações de saque: ", error);
        listContainer.innerHTML = '<p class="empty-list-message" style="color:var(--admin-danger-red);">Erro ao carregar solicitações.</p>';
    });
}

// Função para renderizar os cards de solicitação
function renderWithdrawalRequests(requests) {
    const listContainer = document.getElementById('saques-list-container');

    listContainer.innerHTML = requests.map(req => {
        const requestedDate = req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleString('pt-BR') : 'Data indisponível';
        
        // Como o saldo agora é unificado, não precisamos mais do detalhamento aqui.
        // Apenas mostramos o valor total solicitado.
        return `
            <div class="saque-card" data-request-id="${req.id}">
                <div class="saque-header">
                    <span class="driver-name"><i class="fas fa-user-circle"></i> ${req.driverName}</span>
                    <span class="request-date">${requestedDate}</span>
                </div>
                <div class="saque-body">
                    <div class="amount-total">${formatPrice(req.amount)}</div>
                    <div class="amount-details">
                        <span>(Valor total em caixa)</span>
                    </div>
                </div>
                <div class="saque-footer">
                    <button class="btn btn-success btn-pagar-saque" data-driver-id="${req.driverId}" data-amount="${req.amount}">
                        <i class="fas fa-check-circle"></i> Marcar como Pago e Zerar Saldo
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Adiciona os eventos aos novos botões
    addSaqueActionListeners();
}

// Função para adicionar eventos aos botões de "Pagar"
function addSaqueActionListeners() {
    const listContainer = document.getElementById('saques-list-container');
    listContainer.querySelectorAll('.btn-pagar-saque').forEach(button => {
        button.addEventListener('click', async (e) => {
            const card = e.target.closest('.saque-card');
            const requestId = card.dataset.requestId;
            const driverId = e.target.dataset.driverId;
            const amount = parseFloat(e.target.dataset.amount);

            if (confirm(`Confirma o pagamento de ${formatPrice(amount)} para este entregador? Esta ação irá zerar o saldo dele no sistema.`)) {
                await processWithdrawal(requestId, driverId, amount);
            }
        });
    });
}

// Função que processa o pagamento e zera o saldo
async function processWithdrawal(requestId, driverId, amount) {
    const { doc, writeBatch, serverTimestamp, collection } = window.firebaseFirestore;
    const db = window.db;
    const batch = writeBatch(db);

    try {
        // 1. Atualiza a solicitação de saque para "pago"
        const requestRef = doc(db, "withdrawal_requests", requestId);
        batch.update(requestRef, {
            status: "paid",
            paidAt: serverTimestamp()
        });

        // 2. Adiciona uma transação de "retirada" no caixa do entregador
        const movimentacaoRef = doc(collection(db, "delivery_people", driverId, "movimentacoesFinanceiras"));
        batch.set(movimentacaoRef, {
            tipo: "retirada",
            valor: amount,
            descricao: `Saque Aprovado (Ref: ${requestId.substring(0, 6)})`,
            data: serverTimestamp()
        });

        await batch.commit();
        window.showToast("Saque processado e saldo zerado com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao processar saque: ", error);
        window.showToast("Ocorreu um erro ao processar o saque.", "error");
    }
}

// Disponibiliza a função de inicialização globalmente
window.initializeSaquesSection = initializeSaquesSection;