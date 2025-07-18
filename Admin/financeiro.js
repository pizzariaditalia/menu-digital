// Arquivo: financeiro.js

let financeiroSectionInitialized = false;
const LANCAMENTOS_COLLECTION = "lancamentos_financeiros";

// Função principal de inicialização da seção
async function initializeFinanceiroSection() {
    if (financeiroSectionInitialized) {
        document.getElementById('filter-financial-btn')?.click(); // Apenas atualiza os dados se já foi inicializado
        return;
    }
    financeiroSectionInitialized = true;
    console.log("Módulo Financeiro.js: Inicializando...");

    // --- Seletores de Elementos do DOM ---
    const startDateInput = document.getElementById('financial-start-date');
    const endDateInput = document.getElementById('financial-end-date');
    const filterBtn = document.getElementById('filter-financial-btn');
    const lancamentoForm = document.getElementById('lancamento-form');
    const lancamentosHistoryContainer = document.getElementById('lancamentos-history-container');

    // --- Funções de Lógica e Dados ---

    // Busca os dados de pedidos (vendas) e os lançamentos manuais
    async function fetchFinancialData(startDate, endDate) {
        const { collection, query, where, getDocs, orderBy, Timestamp } = window.firebaseFirestore;
        const db = window.db;

        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1); // Inclui o dia final na busca

        // Query para os pedidos (faturamento)
        const ordersQuery = query(
            collection(db, "pedidos"),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            where('createdAt', '<', Timestamp.fromDate(adjustedEndDate))
        );

        // Query para os lançamentos manuais (entradas/saídas)
        const lancamentosQuery = query(
            collection(db, LANCAMENTOS_COLLECTION),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<', Timestamp.fromDate(adjustedEndDate)),
            orderBy('date', 'desc')
        );

        const [ordersSnapshot, lancamentosSnapshot] = await Promise.all([
            getDocs(ordersQuery),
            getDocs(lancamentosQuery)
        ]);

        const pedidos = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lancamentos = lancamentosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return { pedidos, lancamentos };
    }

    // Processa os dados e calcula os totais
    function processAndRenderData(data) {
        const { pedidos, lancamentos } = data;

        // Filtra pedidos não cancelados
        const faturamentoPedidos = pedidos.filter(p => p.status !== 'Cancelado');

        // Calcula Faturamento Bruto (total de vendas)
        const faturamentoBruto = faturamentoPedidos.reduce((sum, order) => sum + (order.totals?.grandTotal || 0), 0);

        // Calcula Despesas (lançamentos de 'saida')
        const despesasTotais = lancamentos.filter(l => l.type === 'saida').reduce((sum, l) => sum + l.value, 0);
        
        // Calcula outras Entradas (lançamentos de 'entrada')
        const outrasEntradas = lancamentos.filter(l => l.type === 'entrada').reduce((sum, l) => sum + l.value, 0);

        // Calcula Lucro Líquido
        const lucroLiquido = (faturamentoBruto + outrasEntradas) - despesasTotais;
        
        // Calcula Ticket Médio
        const totalPedidos = faturamentoPedidos.length;
        const ticketMedio = totalPedidos > 0 ? faturamentoBruto / totalPedidos : 0;

        // Renderiza o painel de resumo
        renderSummaryDashboard({ faturamentoBruto, despesasTotais, lucroLiquido, ticketMedio });
        
        // Renderiza o histórico de lançamentos
        renderTransactionsHistory(lancamentos);
    }

    // Renderiza o painel de resumo com os cards
    function renderSummaryDashboard(summary) {
        document.getElementById('faturamento-bruto-value').textContent = formatPrice(summary.faturamentoBruto);
        document.getElementById('despesas-totais-value').textContent = formatPrice(summary.despesasTotais);
        document.getElementById('lucro-liquido-value').textContent = formatPrice(summary.lucroLiquido);
        document.getElementById('lucro-liquido-value').style.color = summary.lucroLiquido >= 0 ? 'var(--admin-success-green)' : 'var(--admin-danger-red)';
        document.getElementById('ticket-medio-value').textContent = formatPrice(summary.ticketMedio);
    }
    
    // Renderiza a tabela com o histórico de lançamentos manuais
    function renderTransactionsHistory(transactions) {
        if (!lancamentosHistoryContainer) return;
        
        let tableHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Valor</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (transactions.length === 0) {
            tableHTML += '<tr><td colspan="5" class="empty-list-message">Nenhum lançamento neste período.</td></tr>';
        } else {
            transactions.forEach(t => {
                const isSaida = t.type === 'saida';
                tableHTML += `
                    <tr>
                        <td>${t.date.toDate().toLocaleDateString('pt-BR')}</td>
                        <td>${t.description}</td>
                        <td><span class="tag ${isSaida ? 'tag-payment-unpaid' : 'tag-payment-paid'}">${t.type}</span></td>
                        <td style="color: ${isSaida ? 'var(--admin-danger-red)' : 'var(--admin-success-green)'}; font-weight: 500;">
                            ${formatPrice(t.value)}
                        </td>
                        <td class="table-actions">
                            <button class="btn-icon delete-lancamento-btn" data-id="${t.id}" title="Excluir Lançamento"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        tableHTML += '</tbody></table>';
        lancamentosHistoryContainer.innerHTML = tableHTML;
        addHistoryActionListeners();
    }

    // Adiciona evento de clique para os botões de excluir
    function addHistoryActionListeners() {
        lancamentosHistoryContainer.querySelectorAll('.delete-lancamento-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const docId = button.dataset.id;
                if (confirm('Tem certeza que deseja excluir este lançamento?')) {
                    const { doc, deleteDoc } = window.firebaseFirestore;
                    await deleteDoc(doc(window.db, LANCAMENTOS_COLLECTION, docId));
                    window.showToast("Lançamento excluído com sucesso!", "success");
                    filterBtn.click(); // Atualiza a visualização
                }
            });
        });
    }

    // Função para formatar preço
    const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00";

    // --- Event Listeners ---
    
    // Filtrar por data
    filterBtn.addEventListener('click', async () => {
        const startDate = new Date(startDateInput.value + 'T00:00:00');
        const endDate = new Date(endDateInput.value + 'T23:59:59');

        if (startDateInput.value && endDateInput.value) {
            const data = await fetchFinancialData(startDate, endDate);
            processAndRenderData(data);
        } else {
            window.showToast("Por favor, selecione data de início e fim.", "warning");
        }
    });

    // Salvar novo lançamento
    lancamentoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { doc, collection, addDoc, serverTimestamp, Timestamp } = window.firebaseFirestore;
        
        const formData = {
            description: document.getElementById('lancamento-descricao').value,
            value: parseFloat(document.getElementById('lancamento-valor').value),
            type: document.getElementById('lancamento-tipo').value,
            date: Timestamp.fromDate(new Date(document.getElementById('lancamento-data').value + 'T12:00:00'))
        };

        if (!formData.description || isNaN(formData.value) || !formData.date) {
            window.showToast("Preencha todos os campos do lançamento.", "error");
            return;
        }

        try {
            await addDoc(collection(window.db, LANCAMENTOS_COLLECTION), formData);
            window.showToast("Lançamento salvo com sucesso!", "success");
            lancamentoForm.reset();
            document.getElementById('lancamento-data').valueAsDate = new Date();
            filterBtn.click(); // Atualiza a visão
        } catch (error) {
            console.error("Erro ao salvar lançamento: ", error);
            window.showToast("Erro ao salvar lançamento.", "error");
        }
    });

    // --- Execução Inicial ---
    const today = new Date();
    endDateInput.valueAsDate = today;
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startDateInput.valueAsDate = startOfMonth;
    document.getElementById('lancamento-data').valueAsDate = today;
    
    filterBtn.click();
}

// Expõe a função de inicialização para ser chamada pelo admin.js
window.initializeFinanceiroSection = initializeFinanceiroSection;