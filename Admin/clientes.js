// clientes.js - VERSÃO COM CORREÇÃO DE RESUMO E TIMING DO MODAL

let customersSectionInitialized = false;

async function initializeCustomersSection() {
    if (customersSectionInitialized) {
        // Se a seção já foi inicializada, apenas recarrega os dados
        await main();
        return;
    }
    customersSectionInitialized = true;
    console.log("Módulo Clientes.js: Inicializando...");
    await main(); // Chama a função principal que agora contém toda a lógica
}

// A função principal agora organiza toda a inicialização
async function main() {
    // --- Seletores de Elementos do DOM (Agora dentro de main) ---
    const customersListContainer = document.getElementById('customers-list-container');
    const searchCustomerInput = document.getElementById('search-customer-input');
    const editCustomerModal = document.getElementById('edit-customer-modal');
    const editCustomerForm = document.getElementById('edit-customer-form');

    let allCustomers = [];
    let allNeighborhoods = [];

    // --- Funções de Interação com o Firestore ---
    async function fetchAllCustomers() {
        if (!window.db || !window.firebaseFirestore) return [];
        const { collection, getDocs, orderBy, query } = window.firebaseFirestore;
        try {
            const q = query(collection(window.db, "customer"), orderBy("firstName"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
            return [];
        }
    }
    
    async function fetchAllOrders() {
        if (!window.db || !window.firebaseFirestore) return [];
        const { collection, getDocs, query } = window.firebaseFirestore;
        try {
            const q = query(collection(window.db, "pedidos"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error("Erro ao buscar pedidos:", error);
            return [];
        }
    }

    async function fetchNeighborhoodsForSelect() {
        if (!window.db || !window.firebaseFirestore) return [];
        const { collection, getDocs } = window.firebaseFirestore;
        try {
            const querySnapshot = await getDocs(collection(window.db, "delivery_fees"));
            allNeighborhoods = querySnapshot.docs.map(doc => doc.data().name).sort();
        } catch (error) {
            console.error("Erro ao buscar bairros para o formulário:", error);
        }
    }

    async function saveCustomerToFirestore(customerId, customerData) {
        const { doc, updateDoc } = window.firebaseFirestore;
        try {
            const customerRef = doc(window.db, "customer", customerId);
            await updateDoc(customerRef, customerData);
            window.showToast("Cliente salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar cliente no Firestore:", error);
            window.showToast("Erro ao salvar cliente.", "error");
        }
    }

    // --- Funções de UI (Interface) ---
    function createCustomerCardHTML(customer) {
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        const address = customer.address || {};
        const fullAddress = [address.street, address.number, address.neighborhood].filter(Boolean).join(', ');

        const lastOrderDate = customer.lastOrderDate
            ? new Date(customer.lastOrderDate).toLocaleDateString('pt-BR')
            : 'Nenhum pedido';

        // CORREÇÃO: Readicionando os campos de contagem e data do último pedido
        return `
        <div class="customer-card" data-customer-id="${customer.id}">
            <div class="customer-summary">
                <div class="customer-info">
                    <span class="customer-name">${fullName || 'Nome não cadastrado'}</span>
                    <span class="customer-whatsapp"><i class="fab fa-whatsapp"></i> ${customer.whatsapp || 'Não informado'}</span>
                </div>
                <i class="fas fa-chevron-down expand-icon"></i>
            </div>
            <div class="customer-details">
                <div class="detail-item">
                    <strong><i class="fas fa-star"></i> Pontos:</strong>
                    <span>${customer.points || 0}</span>
                </div>
                <div class="detail-item">
                    <strong><i class="fas fa-receipt"></i> Pedidos:</strong>
                    <span>${customer.orderCount || 0}</span>
                </div>
                <div class="detail-item">
                    <strong><i class="fas fa-calendar-alt"></i> Último Pedido:</strong>
                    <span>${lastOrderDate}</span>
                </div>
                <div class="detail-item full-width">
                    <strong><i class="fas fa-map-marker-alt"></i> Endereço:</strong>
                    <span>${fullAddress || 'Nenhum endereço cadastrado.'}</span>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-secondary btn-sm edit-customer-btn">Editar Cliente</button>
                </div>
            </div>
        </div>`;
    }

    function renderCustomersList(customers, searchTerm = "") {
        if (!customersListContainer) return;
        const lowerCaseTerm = searchTerm.toLowerCase();
        const filteredCustomers = searchTerm
            ? customers.filter(c =>
                (`${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(lowerCaseTerm)) ||
                (c.whatsapp && c.whatsapp.includes(lowerCaseTerm))
            )
            : customers;
        if (filteredCustomers.length === 0) {
            customersListContainer.innerHTML = `<p class="empty-list-message">Nenhum cliente encontrado.</p>`;
            return;
        }
        customersListContainer.innerHTML = filteredCustomers.map(createCustomerCardHTML).join('');
        addCardEventListeners();
    }

    async function openEditModal(customerId) {
        if (!editCustomerModal || !editCustomerForm) return;
        
        const { doc, getDoc } = window.firebaseFirestore;
        const customerRef = doc(window.db, "customer", customerId);
        const customerSnap = await getDoc(customerRef);
        
        if (!customerSnap.exists()) {
            window.showToast("Cliente não encontrado!", "error");
            return;
        }
        
        const customer = customerSnap.data();
        const address = customer.address || {};
        
        const formContent = `
            <div class="modal-body">
                <input type="hidden" id="edit-customer-id" value="${customerId}">
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-customer-firstname">Nome</label>
                        <input type="text" id="edit-customer-firstname" class="form-control" value="${customer.firstName || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-customer-lastname">Sobrenome</label>
                        <input type="text" id="edit-customer-lastname" class="form-control" value="${customer.lastName || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="edit-customer-whatsapp-display">WhatsApp</label>
                    <input type="tel" id="edit-customer-whatsapp-display" class="form-control" value="${customer.whatsapp || ''}">
                </div>
                <hr>
                <h4><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-customer-street">Rua / Avenida</label>
                        <input type="text" id="edit-customer-street" class="form-control" value="${address.street || ''}">
                    </div>
                     <div class="form-group" style="flex-basis: 120px; flex-grow: 0;">
                        <label for="edit-customer-number">Número</label>
                        <input type="text" id="edit-customer-number" class="form-control" value="${address.number || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="edit-customer-neighborhood">Bairro</label>
                    <select id="edit-customer-neighborhood" class="form-control">
                        <option value="">-- Sem bairro --</option>
                        ${allNeighborhoods.map(name => `<option value="${name}" ${name === address.neighborhood ? 'selected' : ''}>${name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-customer-complement">Complemento</label>
                    <input type="text" id="edit-customer-complement" class="form-control" placeholder="Apto, casa, etc." value="${address.complement || ''}">
                </div>
                 <div class="form-group">
                    <label for="edit-customer-reference">Ponto de Referência</label>
                    <input type="text" id="edit-customer-reference" class="form-control" value="${address.reference || ''}">
                </div>
                <hr>
                <h4><i class="fas fa-star"></i> Pontos de Fidelidade</h4>
                <div class="form-group">
                    <label for="edit-customer-points">Pontos Atuais</label>
                    <input type="number" id="edit-customer-points" class="form-control" value="${customer.points || 0}" step="1">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary close-modal-btn">Cancelar</button>
                <button type="submit" class="btn btn-success">Salvar Alterações</button>
            </div>
        `;
        editCustomerForm.innerHTML = formContent;
        editCustomerForm.querySelector('.close-modal-btn').addEventListener('click', closeEditCustomerModal);
        openModal(editCustomerModal);
    }

    function closeEditCustomerModal() {
        if (editCustomerModal) closeModal(editCustomerModal);
    }

    function addCardEventListeners() {
        if (!customersListContainer) return;
        customersListContainer.querySelectorAll('.customer-card').forEach(card => {
            card.addEventListener('click', (event) => {
                const customerId = card.dataset.customerId;
                if (event.target.closest('.edit-customer-btn')) {
                    event.stopPropagation();
                    openEditModal(customerId);
                    return;
                }
                card.classList.toggle('expanded');
            });
        });
    }
    
    // --- Lógica de Eventos ---
    if (searchCustomerInput) {
        searchCustomerInput.addEventListener('input', (e) => {
            renderCustomersList(allCustomers, e.target.value);
        });
    }
    
    if (editCustomerModal) {
        const closeBtn = editCustomerModal.querySelector('.close-modal-btn');
        if(closeBtn) closeBtn.addEventListener('click', closeEditCustomerModal);
        editCustomerModal.addEventListener('click', (e) => {
            if (e.target === editCustomerModal) closeEditCustomerModal();
        });
    }

    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const customerId = editCustomerForm.querySelector('#edit-customer-id').value;
            if (!customerId) return;
            
            const updatedData = {
                firstName: editCustomerForm.querySelector('#edit-customer-firstname').value.trim(),
                lastName: editCustomerForm.querySelector('#edit-customer-lastname').value.trim(),
                whatsapp: editCustomerForm.querySelector('#edit-customer-whatsapp-display').value.trim(),
                points: parseInt(editCustomerForm.querySelector('#edit-customer-points').value, 10) || 0,
                address: {
                    street: editCustomerForm.querySelector('#edit-customer-street').value.trim(),
                    number: editCustomerForm.querySelector('#edit-customer-number').value.trim(),
                    neighborhood: editCustomerForm.querySelector('#edit-customer-neighborhood').value,
                    complement: editCustomerForm.querySelector('#edit-customer-complement').value.trim(),
                    reference: editCustomerForm.querySelector('#edit-customer-reference').value.trim()
                }
            };
            
            await saveCustomerToFirestore(customerId, updatedData);
            closeEditCustomerModal();
            main(); 
        });
    }

    // --- Execução Principal (agora como função) ---
    if (customersListContainer) {
        customersListContainer.innerHTML = '<p class="empty-list-message">Carregando clientes e processando dados...</p>';
    }

    const [customers, orders] = await Promise.all([
        fetchAllCustomers(),
        fetchAllOrders(),
        fetchNeighborhoodsForSelect()
    ]);

    const orderStats = new Map();
    for (const order of orders) {
        const customerIdentifier = order.customer?.id || order.customer?.whatsapp;
        if (!customerIdentifier) continue;

        if (!orderStats.has(customerIdentifier)) {
            orderStats.set(customerIdentifier, { count: 0, lastOrderDate: null });
        }
        const stats = orderStats.get(customerIdentifier);
        stats.count++;
        const orderDate = order.createdAt?.toDate();
        if (orderDate && (!stats.lastOrderDate || orderDate > stats.lastOrderDate)) {
            stats.lastOrderDate = orderDate;
        }
    }

    allCustomers = customers.map(customer => {
        const stats = orderStats.get(customer.id) || orderStats.get(customer.whatsapp);
        return {
            ...customer,
            orderCount: stats ? stats.count : 0,
            lastOrderDate: stats ? stats.lastOrderDate?.toISOString() : null
        };
    });

    renderCustomersList(allCustomers, searchCustomerInput ? searchCustomerInput.value : "");
}


window.initializeCustomersSection = initializeCustomersSection;
