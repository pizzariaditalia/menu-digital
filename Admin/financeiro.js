// Arquivo: financeiro.js - VERSÃO FINAL E COMPLETA COM LÓGICA MENSAL E PROJEÇÕES

let financeiroSectionInitialized = false;
const LANCAMENTOS_COLLECTION = "lancamentos_financeiros";

// --- FUNÇÕES DE PROJEÇÕES ---
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
    if (!calcButton) return;
    calcButton.disabled = true;
    calcButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    window.showToast("Analisando dados do último mês...", "info");

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
            window.showToast("Nenhuma venda encontrada para calcular.", "warning");
            return;
        }

        const variableCostPercentage = (totalIngredientsCost / totalRevenue) * 100;
        const custoVariavelInput = document.getElementById('proj-custo-variavel');
        if (custoVariavelInput) {
            custoVariavelInput.value = variableCostPercentage.toFixed(2);
            custoVariavelInput.dispatchEvent(new Event('input'));
        }
        window.showToast(`Custo de Ingredientes calculado: ${variableCostPercentage.toFixed(2)}%`, "success");
    } catch (error) {
        console.error("Erro ao calcular custo variável:", error);
        window.showToast("Erro ao calcular custo. Verifique o console.", "error");
    } finally {
        if(calcButton) {
            calcButton.disabled = false;
            calcButton.textContent = 'Calcular';
        }
    }
}

async function setupProjections() {
    if (!document.getElementById('projection-results-container')) return;
    const { collection, getDocs, query } = window.firebaseFirestore;

    try {
        const [costsSnapshot, salariesSnapshot] = await Promise.all([
            getDocs(query(collection(window.db, "fixed_costs"))),
            getDocs(query(collection(window.db, "salaries")))
        ]);
        const totalFixedCosts = costsSnapshot.docs.reduce((sum, doc) => sum + doc.data().value, 0);
        const totalSalaries = salariesSnapshot.docs.reduce((sum, doc) => sum + doc.data().value, 0);

        const custoVariavelInput = document.getElementById('proj-custo-variavel');
        const calcButton = document.getElementById('calculate-variable-cost-btn');
        custoVariavelInput.value = localStorage.getItem('projCustoVariavel') || '';
        
        const calculateAndRenderProjections = () => {
            const custoVariavelTotalPerc = parseFloat(custoVariavelInput.value) || 0;
            const margemContribuicao = 1 - (custoVariavelTotalPerc / 100);

            if (margemContribuicao <= 0) {
                document.getElementById('proj-ponto-equilibrio').textContent = 'Inválido';
                document.getElementById('proj-meta-faturamento').textContent = 'Inválido';
                document.getElementById('proj-meta-diaria-valor').textContent = 'Inválido';
                document.getElementById('proj-meta-diaria-pizzas').textContent = 'Inválido';
                return;
            }
            const pontoEquilibrio = totalFixedCosts / margemContribuicao;
            const metaFaturamento = (totalFixedCosts + totalSalaries) / margemContribuicao;
            const diasUteis = 26;
            const metaDiariaValor = metaFaturamento / diasUteis;
            const precoMedioPizza = 50;
            const metaDiariaPizzas = Math.ceil(metaDiariaValor / precoMedioPizza);

            document.getElementById('proj-ponto-equilibrio').textContent = formatPrice(pontoEquilibrio);
            document.getElementById('proj-meta-faturamento').textContent = formatPrice(metaFaturamento);
            document.getElementById('proj-meta-label').textContent = `Meta: ${formatPrice(metaFaturamento)}`;
            document.getElementById('proj-meta-diaria-valor').textContent = formatPrice(metaDiariaValor);
            document.getElementById('proj-meta-diaria-pizzas').textContent = `${metaDiariaPizzas} pizzas`;
            
            localStorage.setItem('projCustoVariavel', custoVariavelInput.value);
            updateProgressBar(metaFaturamento);
        };
        
        custoVariavelInput.addEventListener('input', calculateAndRenderProjections);
        if (calcButton) calcButton.addEventListener('click', calculateAndUpdateVariableCost);
        calculateAndRenderProjections();
    } catch (error) {
        console.error("Erro ao buscar custos e salários para projeções:", error);
        window.showToast("Erro ao carregar dados para projeção.", "error");
    }
}

async function updateProgressBar(metaFaturamento) {
    if (!document.getElementById('proj-progress-bar')) return;
    try {
        const { collection, query, where, getDocs, Timestamp } = window.firebaseFirestore;
        const db = window.db;
        const year = parseInt(document.getElementById('year-select').value);
        const month = parseInt(document.getElementById('month-select').value);
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

        const ordersQuery = query(collection(db, "pedidos"), where('createdAt', '>=', Timestamp.fromDate(startOfMonth)), where('createdAt', '<=', Timestamp.fromDate(endOfMonth)));
        const ordersSnapshot = await getDocs(ordersQuery);
        const faturamentoAtual = ordersSnapshot.docs.map(doc => doc.data()).filter(p => p.status !== 'Cancelado').reduce((sum, order) => sum + (order.totals?.grandTotal || 0), 0);
        const progressoPerc = (metaFaturamento > 0) ? (faturamentoAtual / metaFaturamento) * 100 : 0;

        document.getElementById('proj-faturamento-atual').textContent = `Faturamento Atual: ${formatPrice(faturamentoAtual)}`;
        document.getElementById('proj-progress-bar').style.width = `${Math.min(progressoPerc, 100)}%`;
        document.getElementById('proj-progress-label').textContent = `${progressoPerc.toFixed(1)}%`;
    } catch (error) {
        console.error("Erro ao atualizar barra de progresso:", error);
    }
}

// --- FUNÇÕES PRINCIPAIS DA SEÇÃO FINANCEIRA ---
async function initializeFinanceiroSection() {
    if (financeiroSectionInitialized) {
        document.getElementById('filter-financial-btn')?.click();
        return;
    }
    financeiroSectionInitialized = true;
    console.log("Módulo Financeiro.js (Mensal): Inicializando...");

    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const filterBtn = document.getElementById('filter-financial-btn');
    const lancamentoForm = document.getElementById('lancamento-form');
    const lancamentosHistoryContainer = document.getElementById('lancamentos-history-container');

    function populateDateSelectors() {
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        monthSelect.innerHTML = '';
        months.forEach((month, index) => {
            const option = new Option(month, index);
            monthSelect.appendChild(option);
        });
        monthSelect.value = currentMonth;

        yearSelect.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            const option = new Option(year, year);
            yearSelect.appendChild(option);
        }
        yearSelect.value = currentYear;
    }

    async function fetchFinancialData(year, month) {
        const { collection, query, where, getDocs, orderBy, Timestamp } = window.firebaseFirestore;
        const db = window.db;
        const monthYearId = `${(month + 1).toString().padStart(2, '0')}-${year}`;
        const lancamentosQuery = query(collection(db, LANCAMENTOS_COLLECTION), where("monthYear", "==", monthYearId), orderBy('date', 'desc'));
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);
        const ordersQuery = query(collection(db, "pedidos"), where('createdAt', '>=', startDate), where('createdAt', '<=', endDate));

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
        setupProjections();
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
            tableHTML += '<tr><td colspan="5" class="empty-list-message">Nenhum lançamento para este mês.</td></tr>';
        } else {
            transactions.forEach(t => {
                const isSaida = t.type === 'saida';
                tableHTML += `<tr><td>${t.date.toDate().toLocaleDateString('pt-BR')}</td><td>${t.description}</td><td><span class="tag ${isSaida ? 'tag-payment-unpaid': 'tag-payment-paid'}">${t.type}</span></td><td style="color: ${isSaida ? 'var(--admin-danger-red)': 'var(--admin-success-green)'}; font-weight: 500;">${formatPrice(t.value)}</td><td class="table-actions"><button class="btn-icon delete-lancamento-btn" data-id="${t.id}" title="Excluir Lançamento"><i class="fas fa-trash-alt"></i></button></td></tr>`;
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
                    window.showToast("Lançamento excluído!", "success");
                    filterBtn.click();
                }
            });
        });
    }

    async function handleFilterClick() {
        const selectedYear = parseInt(yearSelect.value);
        const selectedMonth = parseInt(monthSelect.value);
        window.showToast(`Buscando dados de ${monthSelect.options[selectedMonth].text}/${selectedYear}...`, "info");
        try {
            const data = await fetchFinancialData(selectedYear, selectedMonth);
            processAndRenderData(data);
        } catch(error) {
            console.error("Erro ao filtrar dados financeiros:", error);
            window.showToast("Erro ao buscar relatório. Verifique os índices do Firestore.", "error");
        }
    }

    if (filterBtn) {
        filterBtn.addEventListener('click', handleFilterClick);
    }

    if (lancamentoForm) {
        lancamentoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { collection, addDoc, Timestamp } = window.firebaseFirestore;
            const dateInput = document.getElementById('lancamento-data').value;
            const dateObject = new Date(dateInput + 'T12:00:00');
            const formData = {
                description: document.getElementById('lancamento-descricao').value,
                value: parseFloat(document.getElementById('lancamento-valor').value),
                type: document.getElementById('lancamento-tipo').value,
                date: Timestamp.fromDate(dateObject),
                monthYear: `${(dateObject.getMonth() + 1).toString().padStart(2, '0')}-${dateObject.getFullYear()}`
            };
            if (!formData.description || isNaN(formData.value) || !dateInput) {
                window.showToast("Preencha todos os campos do lançamento.", "error"); return;
            }
            await addDoc(collection(window.db, LANCAMENTOS_COLLECTION), formData);
            window.showToast("Lançamento salvo com sucesso!", "success");
            lancamentoForm.reset();
            document.getElementById('lancamento-data').valueAsDate = new Date();
            filterBtn.click();
        });
    }

    populateDateSelectors();
    document.getElementById('lancamento-data').valueAsDate = new Date();
    handleFilterClick();
}

window.initializeFinanceiroSection = initializeFinanceiroSection;