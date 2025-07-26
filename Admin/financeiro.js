// Arquivo: financeiro.js - VERSÃO SEM A FUNÇÃO 'formatPrice' DUPLICADA

let financeiroSectionInitialized = false;
const LANCAMENTOS_COLLECTION = "lancamentos_financeiros";

// --- NOVA LÓGICA DE PROJEÇÕES ---
function calculateItemCost(item, allIngredients) {
    if (!item.recipe || !Array.isArray(item.recipe) || !allIngredients) return 0;
    function getCostPerBaseUnit(ingredient) {
        if (!ingredient || typeof ingredient.price !== 'number' || typeof ingredient.quantity !== 'number' || ingredient.quantity === 0) return 0;
        if (ingredient.unit === 'kg' || ingredient.unit === 'l') return ingredient.price / (ingredient.quantity * 1000);
        if (ingredient.unit === 'g' || ingredient.unit === 'ml') return ingredient.price / ingredient.quantity;
        return ingredient.price / ingredient.quantity;
    }
    return item.recipe.reduce((total, recipeItem) => {
        const ingredient = allIngredients.find(i => i.id === recipeItem.id);
        return total + (getCostPerBaseUnit(ingredient) * recipeItem.quantity);
    }, 0);
}

async function calculateAndUpdateVariableCost() {
    const calcButton = document.getElementById('calculate-variable-cost-btn');
    calcButton.disabled = true;
    calcButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    window.showToast("Analisando vendas e fichas técnicas do último mês...", "info");
    const { collection, query, where, getDocs, Timestamp } = window.firebaseFirestore;
    const db = window.db;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    try {
        const ordersQuery = query(collection(db, "pedidos"), where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<=', Timestamp.fromDate(endDate)));
        const ingredientsQuery = query(collection(db, "ingredientes"));
        const [ordersSnapshot, ingredientsSnapshot] = await Promise.all([getDocs(ordersQuery), getDocs(ingredientsQuery)]);
        const allIngredients = ingredientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        let totalRevenue = 0;
        let totalIngredientsCost = 0;
        ordersSnapshot.docs.forEach(doc => {
            const order = doc.data();
            if (order.status === 'Cancelado') return;
            totalRevenue += order.totals?.grandTotal || 0;
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    totalIngredientsCost += calculateItemCost(item, allIngredients) * item.quantity;
                });
            }
        });
        if (totalRevenue === 0) {
            window.showToast("Nenhuma venda encontrada no último mês para calcular a média.", "warning");
            return;
        }
        const variableCostPercentage = (totalIngredientsCost / totalRevenue) * 100;
        const custoIngredientesInput = document.getElementById('proj-custo-ingredientes');
        custoIngredientesInput.value = variableCostPercentage.toFixed(2);
        custoIngredientesInput.dispatchEvent(new Event('input'));
        window.showToast(`Custo de Ingredientes calculado: ${variableCostPercentage.toFixed(2)}%`, "success");
    } catch (error) {
        console.error("Erro ao calcular custo variável:", error);
        window.showToast("Erro ao calcular custo. Verifique o console.", "error");
    } finally {
        calcButton.disabled = false;
        calcButton.textContent = 'Calcular';
    }
}

function setupProjections() {
    const custosFixosInput = document.getElementById('proj-custos-fixos');
    const proLaboreInput = document.getElementById('proj-pro-labore');
    const custoIngredientesInput = document.getElementById('proj-custo-ingredientes');
    const outrosCustosInput = document.getElementById('proj-outros-custos');
    const calcButton = document.getElementById('calculate-variable-cost-btn');

    custosFixosInput.value = localStorage.getItem('projCustosFixos') || '';
    proLaboreInput.value = localStorage.getItem('projProLabore') || '';
    custoIngredientesInput.value = localStorage.getItem('projCustoIngredientes') || '';
    outrosCustosInput.value = localStorage.getItem('projOutrosCustos') || '';

    const inputs = [custosFixosInput, proLaboreInput, custoIngredientesInput, outrosCustosInput];
    
    const calculateAndRenderProjections = () => {
        const custosFixos = parseFloat(custosFixosInput.value) || 0;
        const proLabore = parseFloat(proLaboreInput.value) || 0;
        const custoIngredientesPerc = parseFloat(custoIngredientesInput.value) || 0;
        const outrosCustosPerc = parseFloat(outrosCustosInput.value) || 0;
        const custoVariavelTotalPerc = custoIngredientesPerc + outrosCustosPerc;
        const margemContribuicao = 1 - (custoVariavelTotalPerc / 100);
        if (margemContribuicao <= 0) {
            document.getElementById('proj-ponto-equilibrio').textContent = 'Inválido';
            document.getElementById('proj-meta-faturamento').textContent = 'Inválido';
            document.getElementById('proj-meta-diaria-valor').textContent = 'Inválido';
            document.getElementById('proj-meta-diaria-pizzas').textContent = 'Inválido';
            return;
        }
        const pontoEquilibrio = custosFixos / margemContribuicao;
        const metaFaturamento = (custosFixos + proLabore) / margemContribuicao;
        const diasUteis = 26;
        const metaDiariaValor = metaFaturamento / diasUteis;
        const precoMedioPizza = 50;
        const metaDiariaPizzas = Math.ceil(metaDiariaValor / precoMedioPizza);
        document.getElementById('proj-ponto-equilibrio').textContent = formatPrice(pontoEquilibrio);
        document.getElementById('proj-meta-faturamento').textContent = formatPrice(metaFaturamento);
        document.getElementById('proj-meta-label').textContent = `Meta: ${formatPrice(metaFaturamento)}`;
        document.getElementById('proj-meta-diaria-valor').textContent = formatPrice(metaDiariaValor);
        document.getElementById('proj-meta-diaria-pizzas').textContent = `${metaDiariaPizzas} pizzas`;
        localStorage.setItem('projCustosFixos', custosFixos);
        localStorage.setItem('projProLabore', proLabore);
        localStorage.setItem('projCustoIngredientes', custoIngredientesPerc);
        localStorage.setItem('projOutrosCustos', outrosCustosPerc);
        updateProgressBar(metaFaturamento);
    };

    inputs.forEach(input => {
        input.addEventListener('input', calculateAndRenderProjections);
    });
    
    if(calcButton) {
        calcButton.addEventListener('click', calculateAndUpdateVariableCost);
    }
    calculateAndRenderProjections();
}

async function updateProgressBar(metaFaturamento) {
    const { collection, query, where, getDocs, Timestamp } = window.firebaseFirestore;
    const db = window.db;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const ordersQuery = query(collection(db, "pedidos"), where('createdAt', '>=', Timestamp.fromDate(startOfMonth)));
    const ordersSnapshot = await getDocs(ordersQuery);
    const faturamentoAtual = ordersSnapshot.docs.map(doc => doc.data()).filter(p => p.status !== 'Cancelado').reduce((sum, order) => sum + (order.totals?.grandTotal || 0), 0);
    const progressoPerc = (metaFaturamento > 0) ? (faturamentoAtual / metaFaturamento) * 100 : 0;
    document.getElementById('proj-faturamento-atual').textContent = `Faturamento Atual: ${formatPrice(faturamentoAtual)}`;
    const progressBar = document.getElementById('proj-progress-bar');
    const progressLabel = document.getElementById('proj-progress-label');
    progressBar.style.width = `${Math.min(progressoPerc, 100)}%`;
    progressLabel.textContent = `${progressoPerc.toFixed(1)}%`;
}

// --- LÓGICA EXISTENTE DA GESTÃO FINANCEIRA ---
async function initializeFinanceiroSection() {
    if (financeiroSectionInitialized) {
        document.getElementById('filter-financial-btn')?.click();
        return;
    }
    financeiroSectionInitialized = true;
    console.log("Módulo Financeiro.js: Inicializando...");

    const startDateInput = document.getElementById('financial-start-date');
    const endDateInput = document.getElementById('financial-end-date');
    const filterBtn = document.getElementById('filter-financial-btn');
    const lancamentoForm = document.getElementById('lancamento-form');
    const lancamentosHistoryContainer = document.getElementById('lancamentos-history-container');

    async function fetchFinancialData(startDate, endDate) {
        const { collection, query, where, getDocs, orderBy, Timestamp } = window.firebaseFirestore;
        const db = window.db;
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
        const ordersQuery = query(collection(db, "pedidos"), where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<', Timestamp.fromDate(adjustedEndDate)));
        const lancamentosQuery = query(collection(db, LANCAMENTOS_COLLECTION), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<', Timestamp.fromDate(adjustedEndDate)), orderBy('date', 'desc'));
        const [ordersSnapshot, lancamentosSnapshot] = await Promise.all([getDocs(ordersQuery), getDocs(lancamentosQuery)]);
        return { 
            pedidos: ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), 
            lancamentos: lancamentosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) 
        };
    }

    function processAndRenderData({ pedidos, lancamentos }) {
        const faturamentoPedidos = pedidos.filter(p => p.status !== 'Cancelado');
        const faturamentoBruto = faturamentoPedidos.reduce((sum, order) => sum + (order.totals?.grandTotal || 0), 0);
        const despesasTotais = lancamentos.filter(l => l.type === 'saida').reduce((sum, l) => sum + l.value, 0);
        const outrasEntradas = lancamentos.filter(l => l.type === 'entrada').reduce((sum, l) => sum + l.value, 0);
        const lucroLiquido = (faturamentoBruto + outrasEntradas) - despesasTotais;
        const ticketMedio = faturamentoPedidos.length > 0 ? faturamentoBruto / faturamentoPedidos.length : 0;
        renderSummaryDashboard({ faturamentoBruto, despesasTotais, lucroLiquido, ticketMedio });
        renderTransactionsHistory(lancamentos);
    }

    function renderSummaryDashboard(summary) {
        document.getElementById('faturamento-bruto-value').textContent = formatPrice(summary.faturamentoBruto);
        document.getElementById('despesas-totais-value').textContent = formatPrice(summary.despesasTotais);
        const lucroEl = document.getElementById('lucro-liquido-value');
        lucroEl.textContent = formatPrice(summary.lucroLiquido);
        lucroEl.style.color = summary.lucroLiquido >= 0 ? 'var(--admin-success-green)' : 'var(--admin-danger-red)';
        document.getElementById('ticket-medio-value').textContent = formatPrice(summary.ticketMedio);
    }
    
    function renderTransactionsHistory(transactions) {
        if (!lancamentosHistoryContainer) return;
        let tableHTML = `<table class="admin-table"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Ações</th></tr></thead><tbody>`;
        if (transactions.length === 0) {
            tableHTML += '<tr><td colspan="5" class="empty-list-message">Nenhum lançamento neste período.</td></tr>';
        } else {
            transactions.forEach(t => {
                const isSaida = t.type === 'saida';
                tableHTML += `<tr><td>${t.date.toDate().toLocaleDateString('pt-BR')}</td><td>${t.description}</td><td><span class="tag ${isSaida ? 'tag-payment-unpaid' : 'tag-payment-paid'}">${t.type}</span></td><td style="color: ${isSaida ? 'var(--admin-danger-red)' : 'var(--admin-success-green)'}; font-weight: 500;">${formatPrice(t.value)}</td><td class="table-actions"><button class="btn-icon delete-lancamento-btn" data-id="${t.id}" title="Excluir Lançamento"><i class="fas fa-trash-alt"></i></button></td></tr>`;
            });
        }
        tableHTML += '</tbody></table>';
        lancamentosHistoryContainer.innerHTML = tableHTML;
        addHistoryActionListeners();
    }

    function addHistoryActionListeners() {
        lancamentosHistoryContainer.querySelectorAll('.delete-lancamento-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const docId = button.dataset.id;
                if (confirm('Tem certeza que deseja excluir este lançamento?')) {
                    const { doc, deleteDoc } = window.firebaseFirestore;
                    await deleteDoc(doc(window.db, LANCAMENTOS_COLLECTION, docId));
                    window.showToast("Lançamento excluído com sucesso!", "success");
                    filterBtn.click();
                }
            });
        });
    }

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

    lancamentoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { collection, addDoc, Timestamp } = window.firebaseFirestore;
        const formData = { 
            description: document.getElementById('lancamento-descricao').value, 
            value: parseFloat(document.getElementById('lancamento-valor').value), 
            type: document.getElementById('lancamento-tipo').value, 
            date: Timestamp.fromDate(new Date(document.getElementById('lancamento-data').value + 'T12:00:00')) 
        };
        if (!formData.description || isNaN(formData.value) || !formData.date) {
            window.showToast("Preencha todos os campos do lançamento.", "error"); return;
        }
        try {
            await addDoc(collection(window.db, LANCAMENTOS_COLLECTION), formData);
            window.showToast("Lançamento salvo com sucesso!", "success");
            lancamentoForm.reset();
            document.getElementById('lancamento-data').valueAsDate = new Date();
            filterBtn.click();
        } catch (error) {
            console.error("Erro ao salvar lançamento: ", error);
            window.showToast("Erro ao salvar lançamento.", "error");
        }
    });

    const today = new Date();
    endDateInput.valueAsDate = today;
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startDateInput.valueAsDate = startOfMonth;
    document.getElementById('lancamento-data').valueAsDate = today;
    filterBtn.click();
    
    setupProjections();
}

window.initializeFinanceiroSection = initializeFinanceiroSection;