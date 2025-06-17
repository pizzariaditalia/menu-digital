// Arquivo: clientes.js
// VERSÃO DE DIAGNÓSTICO PARA VERIFICAR A ESTRUTURA DOS DADOS

let customersSectionInitialized = false;

async function initializeCustomersSection() {
    if (customersSectionInitialized) return;
    customersSectionInitialized = true;
    console.log("Módulo Clientes.js (DIAGNÓSTICO): Inicializando...");

    const customersListContainer = document.getElementById('customers-list-container');
    
    async function fetchAllCustomers() {
        if (!window.db || !window.firebaseFirestore) return [];
        const { collection, getDocs } = window.firebaseFirestore;
        const querySnapshot = await getDocs(collection(window.db, "customer"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function fetchAllOrders() {
        if (!window.db || !window.firebaseFirestore) return [];
        const { collection, getDocs, query } = window.firebaseFirestore;
        const querySnapshot = await getDocs(query(collection(window.db, "pedidos")));
        return querySnapshot.docs.map(doc => doc.data());
    }

    async function main() {
        if (customersListContainer) {
            customersListContainer.innerHTML = '<p class="empty-list-message">Executando diagnóstico...</p>';
        }

        try {
            const [customers, orders] = await Promise.all([
                fetchAllCustomers(),
                fetchAllOrders()
            ]);

            // =================================================================
            // INÍCIO DO CÓDIGO DE DIAGNÓSTICO
            // =================================================================
            console.clear(); // Limpa o console para facilitar a leitura
            console.log("--- DIAGNÓSTICO INICIADO ---");
            console.log(`Total de Clientes Encontrados: ${customers.length}`);
            console.log(`Total de Pedidos Encontrados: ${orders.length}`);

            if (customers.length > 0) {
                console.log("ESTRUTURA DE EXEMPLO DE 1 CLIENTE:");
                // Usamos JSON.stringify para ver todos os campos de forma clara
                console.log(JSON.stringify(customers[0], null, 2));
            } else {
                console.log("Nenhum cliente encontrado no banco de dados.");
            }

            if (orders.length > 0) {
                console.log("ESTRUTURA DE EXEMPLO DE 1 PEDIDO:");
                // Imprime o objeto de pedido diretamente, pois o Timestamp não é bem formatado pelo JSON.stringify
                console.log(orders[0]); 
                console.log("CAMPO 'customer' DENTRO DO PEDIDO ACIMA:");
                console.log(JSON.stringify(orders[0].customer, null, 2));
            } else {
                console.log("Nenhum pedido encontrado no banco de dados.");
            }
            
            console.log("--- FIM DO DIAGNÓSTICO ---");
            // =================================================================
            // FIM DO CÓDIGO DE DIAGNÓSTICO
            // =================================================================

            // Apenas para não deixar a tela em branco, exibimos uma mensagem.
            if (customersListContainer) {
                 customersListContainer.innerHTML = '<p class="empty-list-message">Diagnóstico concluído. Verifique o console do navegador.</p>';
            }

        } catch (error) {
            console.error("ERRO DURANTE O DIAGNÓSTICO:", error);
            if (customersListContainer) {
                 customersListContainer.innerHTML = '<p class="empty-list-message">Ocorreu um erro durante o diagnóstico. Verifique o console.</p>';
            }
        }
    }

    // A lógica de edição e busca foi removida temporariamente para focar apenas no diagnóstico.
    // Inicia o diagnóstico.
    main();
}

window.initializeCustomersSection = initializeCustomersSection;
