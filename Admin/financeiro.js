// Arquivo: financeiro.js - VERSÃO COM CÁLCULO DE CUSTO VARIÁVEL CORRIGIDO

let financeiroSectionInitialized = false;
const LANCAMENTOS_COLLECTION = "lancamentos_financeiros";

// --- NOVA LÓGICA DE PROJEÇÕES ---

// FUNÇÃO DE CÁLCULO DE CUSTO ADICIONADA AQUI PARA CORRIGIR O PROBLEMA
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
            return;
        }
        const pontoEquilibrio = custosFixos / margemContribuicao;
        const metaFaturamento = (custosFixos + proLabore) / margemContribuicao;
        document.getElementById('proj-ponto-equilibrio').textContent = formatPrice(pontoEquilibrio);
        document.getElementById('proj-meta-faturamento').textContent = formatPrice(metaFaturamento);
        document.getElementById('proj-meta-label').textContent = `Meta: ${formatPrice(metaFaturamento)}`;
        localStorage.setItem('projCustosFixos', custosFixos);
        localStorage.setItem('projProLabore', proLabore);
        localStorage.setItem('projCustoIngredientes', custoIngredientesPerc);
        localStorage.setItem('projOutrosCustos', outrosCustosPerc);
        updateProgressBar(metaFaturamento);
    };

    inputs.forEach(input => {
        input.addEventListener('input', calculateAndRenderProjections);
    });
    
    calcButton.addEventListener('click', calculateAndUpdateVariableCost);
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
    async function fetchFinancialData(startDate, endDate) { /* ... */ }
    function processAndRenderData({ pedidos, lancamentos }) { /* ... */ }
    function renderSummaryDashboard(summary) { /* ... */ }
    function renderTransactionsHistory(transactions) { /* ... */ }
    function addHistoryActionListeners() { /* ... */ }
    filterBtn.addEventListener('click', async () => { /* ... */ });
    lancamentoForm.addEventListener('submit', async (e) => { /* ... */ });
    const today = new Date();
    endDateInput.valueAsDate = today;
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startDateInput.valueAsDate = startOfMonth;
    document.getElementById('lancamento-data').valueAsDate = today;
    filterBtn.click();
    setupProjections();
}

const formatPrice = (price) => typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00";
window.initializeFinanceiroSection = initializeFinanceiroSection;