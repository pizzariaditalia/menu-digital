// Arquivo: clientes.js
// VERSÃO FINAL COM CÁLCULO DE QUANTIDADE E DATA DO ÚLTIMO PEDIDO E CORREÇÃO DO BOTÃO EDITAR

async function initializeCustomersSection() {

  // Seletores de Elementos do DOM
  const customersListContainer = document.getElementById('customers-list-container');
  const searchCustomerInput = document.getElementById('search-customer-input');
  const editCustomerModal = document.getElementById('edit-customer-modal');
  const editCustomerForm = document.getElementById('edit-customer-form');
  const closeEditCustomerModalBtn = editCustomerModal ? editCustomerModal.querySelector('.close-modal-btn'): null;

  let allCustomers = [];

  // --- Funções de Interação com o Firestore ---

  // Função para buscar TODOS os clientes
  async function fetchAllCustomers() {
    if (!window.db || !window.firebaseFirestore) return [];
    const {
      collection,
      getDocs
    } = window.firebaseFirestore;
    try {
      const querySnapshot = await getDocs(collection(window.db, "customer"));
      return querySnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      return [];
    }
  }

  // NOVA FUNÇÃO: Busca todos os pedidos para calcular as estatísticas
  async function fetchAllOrders() {
    if (!window.db || !window.firebaseFirestore) return [];
    const {
      collection,
      getDocs,
      query,
      where
    } = window.firebaseFirestore;
    try {
      // Buscamos apenas pedidos que NÃO foram cancelados
      const q = query(collection(window.db, "pedidos"), where("status", "!=", "Cancelado"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      return [];
    }
  }

  // Função para salvar dados do cliente (sem alterações)
  async function saveCustomerToFirestore(customerData, customerId) {
    const {
      doc,
      setDoc
    } = window.firebaseFirestore;
    try {
      await setDoc(doc(window.db, "customer", customerId), customerData, {
        merge: true
      });
      window.showToast("Cliente salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar cliente no Firestore:", error);
      window.showToast("Erro ao salvar cliente.", "error");
    }
  }

  // --- Funções de UI (Interface) ---

  // FUNÇÃO ATUALIZADA: Agora exibe os novos dados de pedidos
  function createCustomerCardHTML(customer) {
    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const address = customer.address || {};
    const fullAddress = [address.street,
      address.number,
      address.neighborhood,
      address.complement,
      address.reference].filter(Boolean).join(', ');

    // Formata a data do último pedido
    const lastOrderDate = customer.lastOrderDate
    ? new Date(customer.lastOrderDate).toLocaleDateString('pt-BR'): 'Nenhum pedido';

    return `
    <div class="customer-card" data-customer-id="${customer.id}">
    <div class="customer-summary">
    <div class="customer-info">
    <span class="customer-name">${fullName || 'Nome não cadastrado'}</span>
    <span class="customer-whatsapp">${customer.whatsapp || 'WhatsApp não cadastrado'}</span>
    </div>
    <i class="fas fa-chevron-down expand-icon"></i>
    </div>
    <div class="customer-details">
    <div class="detail-item">
    <strong><i class="fas fa-map-marker-alt"></i> Endereço:</strong>
    <span>${fullAddress || 'Nenhum endereço cadastrado.'}</span>
    </div>
    <div class="detail-item">
    <strong><i class="fas fa-star"></i> Pontos de Fidelidade:</strong>
    <span>${customer.points || 0}</span>
    </div>
    <div class="detail-item">
    <strong><i class="fas fa-receipt"></i> Quantidade de Pedidos:</strong>
    <span>${customer.orderCount || 0}</span>
    </div>
    <div class="detail-item">
    <strong><i class="fas fa-calendar-alt"></i> Último Pedido:</strong>
    <span>${lastOrderDate}</span>
    </div>
    <div class="detail-actions">
    <button class="btn btn-secondary btn-sm edit-customer-btn">Editar Cliente</button>
    </div>
    </div>
    </div>`;
  }

  // Função de renderização principal da lista (sem alterações)
  function renderCustomersList(customers, searchTerm = "") {
    if (!customersListContainer) return;

    const lowerCaseTerm = searchTerm.toLowerCase();
    const filteredCustomers = searchTerm
    ? customers.filter(c =>
      (`${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(lowerCaseTerm)) ||
      (c.whatsapp && c.whatsapp.includes(lowerCaseTerm))
    ): customers;

    if (filteredCustomers.length === 0) {
      customersListContainer.innerHTML = `<p class="empty-list-message">Nenhum cliente encontrado.</p>`;
      return;
    }

    customersListContainer.innerHTML = filteredCustomers.map(createCustomerCardHTML).join('');
    addCardEventListeners();
  }

  // Funções de modal e eventos (com a correção)
  function openEditCustomerModal(customerId) {
    if (!editCustomerModal || !editCustomerForm) return;
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) {
      window.showToast("Cliente não encontrado!", "error"); return;
    }
    // O formulário de edição está no paineladmin.html, então vamos preenchê-lo
    const formContent = `
    <div class="modal-body">
    <input type="hidden" id="edit-customer-original-whatsapp" value="${customer.id}">
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
    <label for="edit-customer-whatsapp-display">WhatsApp (ID - não pode ser alterado)</label>
    <input type="tel" id="edit-customer-whatsapp-display" class="form-control" value="${customer.whatsapp || customer.id}" readonly style="background-color:#e9ecef;">
    </div>
    <hr>
    <h4>Endereço</h4>
    <div class="form-group">
    <label for="edit-customer-street">Rua/Avenida</label>
    <input type="text" id="edit-customer-street" class="form-control" value="${customer.address?.street || ''}">
    </div>
    <div class="form-row">
    <div class="form-group">
    <label for="edit-customer-number">Número</label>
    <input type="text" id="edit-customer-number" class="form-control" value="${customer.address?.number || ''}">
    </div>
    <div class="form-group">
    <label for="edit-customer-neighborhood">Bairro</label>
    <input type="text" id="edit-customer-neighborhood" class="form-control" value="${customer.address?.neighborhood || ''}">
    </div>
    </div>
    <div class="form-group">
    <label for="edit-customer-complement">Complemento</label>
    <input type="text" id="edit-customer-complement" class="form-control" value="${customer.address?.complement || ''}">
    </div>
    <div class="form-group">
    <label for="edit-customer-reference">Ponto de Referência</label>
    <input type="text" id="edit-customer-reference" class="form-control" value="${customer.address?.reference || ''}">
    </div>
    <hr>
    <h4>Pontos de Fidelidade</h4>
    <div class="form-row">
    <div class="form-group">
    <label for="edit-customer-points-display">Pontos Atuais</label>
    <input type="number" id="edit-customer-points-display" class="form-control" value="${customer.points || 0}" readonly style="background-color:#e9ecef;">
    </div>
    <div class="form-group">
    <label for="edit-customer-points-adjust">Ajustar Pontos (+/-)</label>
    <input type="number" id="edit-customer-points-adjust" class="form-control" value="0" step="1">
    </div>
    </div>
    </div>
    <div class="modal-footer">
    <button type="button" class="btn btn-secondary close-modal-btn">Cancelar</button>
    <button type="submit" class="btn btn-success">Salvar Alterações</button>
    </div>
    `;
    editCustomerForm.innerHTML = formContent;
    // Precisamos re-adicionar o listener para o novo botão 'close'
    editCustomerForm.querySelector('.close-modal-btn').addEventListener('click', closeEditCustomerModal);

    editCustomerModal.classList.add('show');
  }

  function closeEditCustomerModal() {
    if (editCustomerModal) editCustomerModal.classList.remove('show');
  }

  function addCardEventListeners() {
    customersListContainer.querySelectorAll('.customer-card').forEach(card => {
      card.addEventListener('click', (event) => {
        const customerId = card.dataset.customerId;
        // CORREÇÃO APLICADA AQUI
        if (event.target.closest('.edit-customer-btn')) {
          event.stopPropagation();
          openEditCustomerModal(customerId);
          return;
        }
        card.classList.toggle('expanded');
      });
    });
  }

  // Eventos dos formulários e inputs
  if (searchCustomerInput) {
    searchCustomerInput.addEventListener('input', (e) => {
      renderCustomersList(allCustomers, e.target.value);
    });
  }
  if (closeEditCustomerModalBtn) {
    closeEditCustomerModalBtn.addEventListener('click', closeEditCustomerModal);
  }
  if (editCustomerModal) {
    editCustomerModal.addEventListener('click', (e) => {
      if (e.target === editCustomerModal) closeEditCustomerModal();
    });
  }
  if (editCustomerForm) {
    editCustomerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalWhatsapp = editCustomerForm.querySelector('#edit-customer-original-whatsapp').value;
      const pointsAdjust = parseInt(editCustomerForm.querySelector('#edit-customer-points-adjust').value) || 0;
      const customerToUpdate = allCustomers.find(c => c.id === originalWhatsapp);
      if (!customerToUpdate) return;
      const currentPoints = customerToUpdate.points || 0;

      const updatedCustomerData = {
        ...customerToUpdate,
        // Mantém todos os dados existentes
        firstName: editCustomerForm.querySelector('#edit-customer-firstname').value.trim(),
        lastName: editCustomerForm.querySelector('#edit-customer-lastname').value.trim(),
        address: {
          street: editCustomerForm.querySelector('#edit-customer-street').value.trim(),
          number: editCustomerForm.querySelector('#edit-customer-number').value.trim(),
          neighborhood: editCustomerForm.querySelector('#edit-customer-neighborhood').value.trim(),
          complement: editCustomerForm.querySelector('#edit-customer-complement').value.trim(),
          reference: editCustomerForm.querySelector('#edit-customer-reference').value.trim()
        },
        points: Math.max(0, currentPoints + pointsAdjust),
      };
      await saveCustomerToFirestore(updatedCustomerData, originalWhatsapp);
      closeEditCustomerModal();
      main(); // Recarrega a lista
    });
  }

  // --- FUNÇÃO PRINCIPAL DE EXECUÇÃO (ATUALIZADA) ---
  async function main() {
    if (customersListContainer) {
      customersListContainer.innerHTML = '<p class="empty-list-message">Carregando clientes e processando pedidos...</p>';
    }

    // 1. Busca os clientes e os pedidos em paralelo para mais velocidade
    const [customers,
      orders] = await Promise.all([
        fetchAllCustomers(),
        fetchAllOrders()
      ]);

    // 2. Cria um objeto para armazenar as estatísticas dos pedidos
    const orderStats = {};
    for (const order of orders) {
      const customerId = order.customer?.whatsapp;
      if (!customerId) continue;

      if (!orderStats[customerId]) {
        orderStats[customerId] = {
          count: 0,
          lastOrderDate: null
        };
      }

      orderStats[customerId].count++;
      const orderDate = order.createdAt.toDate();
      if (!orderStats[customerId].lastOrderDate || orderDate > orderStats[customerId].lastOrderDate) {
        orderStats[customerId].lastOrderDate = orderDate;
      }
    }

    // 3. Combina os dados dos clientes com as estatísticas dos pedidos
    allCustomers = customers.map(customer => {
      const stats = orderStats[customer.id];
      return {
        ...customer,
        orderCount: stats ? stats.count: 0,
        lastOrderDate: stats ? stats.lastOrderDate?.toISOString(): null
      };
    });

    // 4. Renderiza a lista final
    renderCustomersList(allCustomers, searchCustomerInput ? searchCustomerInput.value: "");
  }

  // Inicia a execução do módulo de clientes
  main();
}

window.initializeCustomersSection = initializeCustomersSection;