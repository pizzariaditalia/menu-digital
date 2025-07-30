// Arquivo: saques.js - VERSÃO COM HISTÓRICO DE SAQUES E CORREÇÃO DE DUPLICIDADE

// A função `formatPrice` foi removida daqui, pois já existe globalmente no admin.js

let saquesSectionInitialized = false;

// Função principal que será chamada para inicializar a seção
async function initializeSaquesSection() {
  if (saquesSectionInitialized) return;
  saquesSectionInitialized = true;
  console.log("Módulo Saques.js: Inicializando com histórico...");

  listenForPendingWithdrawals();
  listenForPaidWithdrawals();
}

// Função para ouvir em tempo real as solicitações PENDENTES
function listenForPendingWithdrawals() {
  const listContainer = document.getElementById('saques-list-container');
  if (!listContainer) return;

  const {
    collection,
    query,
    where,
    onSnapshot,
    orderBy
  } = window.firebaseFirestore;
  const q = query(collection(window.db, "withdrawal_requests"), where("status", "==", "pending"), orderBy("requestedAt", "desc"));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<p class="empty-list-message">Nenhuma solicitação de saque pendente.</p>';
      return;
    }
    const requests = snapshot.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    renderPendingWithdrawals(requests);
  },
    (error) => {
      console.error("Erro ao buscar solicitações pendentes: ", error);
      listContainer.innerHTML = '<p class="empty-list-message" style="color:var(--admin-danger-red);">Erro ao carregar solicitações.</p>';
    });
}

// Função para ouvir os saques pagos (HISTÓRICO)
function listenForPaidWithdrawals() {
  const historyContainer = document.getElementById('saques-history-container');
  if (!historyContainer) return;

  const {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    limit
  } = window.firebaseFirestore;
  // Buscamos os pagos, ordenados pelos mais recentes, com um limite para não carregar tudo de uma vez
  const q = query(collection(window.db, "withdrawal_requests"), where("status", "==", "paid"), orderBy("paidAt", "desc"), limit(20));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      historyContainer.innerHTML = '<p class="empty-list-message">Nenhum saque no histórico.</p>';
      return;
    }
    const requests = snapshot.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    renderPaidWithdrawalHistory(requests);
  },
    (error) => {
      console.error("Erro ao buscar histórico de saques: ", error);
      historyContainer.innerHTML = '<p class="empty-list-message" style="color:var(--admin-danger-red);">Erro ao carregar histórico.</p>';
    });
}


// Função para renderizar os cards de solicitação PENDENTES
function renderPendingWithdrawals(requests) {
  const listContainer = document.getElementById('saques-list-container');
  listContainer.innerHTML = requests.map(req => {
    const requestedDate = req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleString('pt-BR'): 'Data indisponível';
    return `
    <div class="saque-card" data-request-id="${req.id}">
    <div class="saque-header">
    <span class="driver-name"><i class="fas fa-user-circle"></i> ${req.driverName}</span>
    <span class="request-date">${requestedDate}</span>
    </div>
    <div class="saque-body">
    <div class="amount-total">${formatPrice(req.amount)}</div>
    <div class="amount-details">(Valor total em caixa)</div>
    </div>
    <div class="saque-footer">
    <button class="btn btn-success btn-pagar-saque" data-driver-id="${req.driverId}" data-amount="${req.amount}">
    <i class="fas fa-check-circle"></i> Marcar como Pago e Zerar Saldo
    </button>
    </div>
    </div>
    `;
  }).join('');
  addSaqueActionListeners();
}

// Função para renderizar o HISTÓRICO DE SAQUES PAGOS
function renderPaidWithdrawalHistory(requests) {
  const historyContainer = document.getElementById('saques-history-container');
  historyContainer.innerHTML = requests.map(req => {
    const paidDate = req.paidAt?.toDate ? req.paidAt.toDate().toLocaleString('pt-BR'): 'Data indisponível';
    return `
    <div class="saque-card paid">
    <div class="saque-header">
    <span class="driver-name"><i class="fas fa-user-circle"></i> ${req.driverName}</span>
    <div class="saque-status">
    <i class="fas fa-check-double"></i> Pago em ${paidDate}
    </div>
    </div>
    <div class="saque-body">
    <div class="amount-total">${formatPrice(req.amount)}</div>
    </div>
    </div>
    `;
  }).join('');
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

      if (confirm(`Confirma o pagamento de ${formatPrice(amount)} para este entregador?`)) {
        await processWithdrawal(requestId, driverId, amount);
      }
    });
  });
}

// Função que processa o pagamento e zera o saldo
async function processWithdrawal(requestId, driverId, amount) {
  const {
    doc, writeBatch, serverTimestamp, collection
  } = window.firebaseFirestore;
  const db = window.db;
  const batch = writeBatch(db);

  try {
    const requestRef = doc(db, "withdrawal_requests", requestId);
    batch.update(requestRef, {
      status: "paid",
      paidAt: serverTimestamp()
    });

    const movimentacaoRef = doc(collection(db,
      "delivery_people",
      driverId,
      "movimentacoesFinanceiras"));
    batch.set(movimentacaoRef, {
      tipo: "retirada",
      valor: amount,
      descricao: `Saque Aprovado (Ref: ${requestId.substring(0,
        6)})`,
      data: serverTimestamp()
    });

    await batch.commit();
    window.showToast("Saque processado com sucesso!", "success");

  } catch (error) {
    console.error("Erro ao processar saque: ", error);
    window.showToast("Ocorreu um erro ao processar o saque.", "error");
  }
}

// Disponibiliza a função de inicialização globalmente
window.initializeSaquesSection = initializeSaquesSection;