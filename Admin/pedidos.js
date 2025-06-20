// pedidos.js - VERSÃO SIMPLIFICADA SEM BOTÕES DE BUSCA E FILTRO

// --- Variáveis ​​de estado do módulo ---
deixe ordersSectionInitialized = false;
deixe unsubscribeFromOrders = nulo;
deixe allOrders = [];
deixe allDeliveryPeople = [];
deixe activeTypeFilter = 'todos';
// As variáveis ​​currentSearchTerm e currentViewMode foram removidas.

função handleSendWppToDeliveryPerson(orderId) {
  const ordem = allOrders.find(o => o.id === orderId);
  const deliveryPersonSelect = document.getElementById('modal-delivery-person-select');
  se (!pedido || !entregaPessoaSelecionar) {
    console.error("Pedido ou seletor de entrega não encontrado."); retornar;
  }
  const selectedDeliveryPersonId = deliveryPersonSelect.valor;
  se (!selectedDeliveryPersonId) {
    window.showToast("Selecione um entregador para enviar uma mensagem.", "warning"); retornar;
  }
  const deliveryPerson = allDeliveryPeople.find(p => p.id === selectedDeliveryPersonId);
  se (!entregador) {
    window.showToast("Erro: Dados de entrega não encontrados.", "error"); retornar;
  }
  const nomeDoCliente = `${order.customer.firstName} ${order.customer.lastName}`;
  const endereço = pedido.entrega.endereço || `${pedido.entrega.rua}, ${pedido.entrega.número} - ${pedido.entrega.bairro}`;
  const paymentMethod = order.payment.method || "Não definir";
  const grandTotal = (pedido.totais?.grandTotal || 0).toFixed(2).replace('.', ',');
  let message = `*Nova Entrega D'Italia Pizzaria*\n\n` + `*Cliente:* ${customerName}\n` + `*Endereço:* ${endereço}\n`;
  se (pedido.entrega.complemento) mensagem += `*Complemento:* ${order.delivery.complemento}\n`;
  se (order.delivery.reference) mensagem += `*Referência:* ${order.delivery.reference}\n`;
  mensagem += `\n*Valor a Receber:* R$ ${grandTotal}\n` + `*Forma de Pagamento:* ${paymentMethod}\n`;
  se (paymentMethod === 'Dinheiro') {
    const changeValue = parseFloat(pedido.pagamento.changeFor);
    se (changeValue > 0) {
      mensagem += `*Levar troco para:* R$ ${changeValue.toFixed(2).replace('.', ',')}\n`;
    }
  }
  mensagem += `\nLembre-se de levar a maquininha de cartão se necessário. Boa entrega!`;
  const whatsappUrl = `https://wa.me/55${deliveryPerson.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  janela.abrir(whatsappUrl, '_blank');
}

função openOrderDetailsModal(pedido) {
  const orderDetailsModal = document.getElementById('detalhes-do-pedido-modal');
  if (!pedido || !pedidoDetalhesModal) {
    console.error("Erro: Pedido ou modal de detalhes não encontrado."); retornar;
  }
  const formatPrice = (preço) => (preço != null) ? price.toLocaleString('pt-BR', {
    estilo: 'moeda', moeda: 'BRL'
  }): "R$ 0,00";
  const modalBody = orderDetailsModal.querySelector('.modal-body');
  const modalTitle = orderDetailsModal.querySelector('#modal-order-title');
  const cliente = pedido.cliente || {};
  const entrega = pedido.entrega || {};
  const pagamento = pedido.pagamento || {};
  const totais = pedido.totais || {};
  const itens = pedido.itens || [];
  modalTitle.innerHTML = `<i class="fas fa-receipt"></i> Pedido #${order.id.substring(0, 6).toUpperCase()}`;
  deixe modalBodyHTML = '';
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-user"></i> Cliente</h4><div class="detail-grid"><div class="detail-item full-width"><strong>Nome</strong><span>${`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Não informado'}</span></div><div class="detail-item full-width"><strong>WhatsApp</strong><span>${customer.whatsapp || 'Não informado'}</span></div></div>`;
  const itemsHTML = items.length > 0 ? `<ul>${items.map(item => `<li><span class="item-quantity">${item.quantity}x</span><div class="item-info"><span class="item-name">${item.name}</span>${item.notes ? `<span class="item-notes">Obs: ${item.notes}</span>`: ''}</div><span class="item-price">${formatPrice((item.unitPrice || 0) * item.quantity)}</span></li>`).join('')}</ul>`: '<p>Nenhum item encontrado.</p>';
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-shopping-basket"></i> Itens do Pedido</h4>${itemsHTML}`;
  se (ordem.notas) {
    modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-comment-alt"></i> Observações</h4><div class="detail-item full-width notes-section"><span>${order.notes}</span></div>`;
  }
  const streetAndNumber = entrega.endereço || `${delivery.street || '--'}, ${delivery.number || 'S/N'}`;
  const addressParts = [`<strong>Endereço:</strong> ${streetAndNumber}`,
    `<strong>Bairro:</strong> ${delivery.neighborhood || '--'}`,
    entrega.complemento ? `<strong>Complemento:</strong> ${delivery.complement}`: null,
    entrega.referência ? `<strong>Referência:</strong> ${delivery.reference}`: null].filter(Boolean).join('<br>');
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h4><div class="detail-item full-width"><span>${addressParts || 'Não informado'}</span></div>`;
  deixe paymentDetailsHTML = `<div class="detail-item"><strong>Subtotal</strong><span>${formatPrice(totals.subtotal)}</span></div><div class="detail-item"><strong>Taxa de Entrega</strong><span>${formatPrice(totals.deliveryFee)}</span></div>${totals.discount > 0 ? `<div class="detail-item"><strong>Desconto</strong><span class="text-success">- ${formatPrice(totals.discount)}</span></div>`: ''}<div class="detail-item total full-width" style="border-top: 1px solid #eee; padding-top: 10px; margin-top: 5px;"><strong>Total a Pagar</strong><span>${formatPrice(totals.grandTotal)}</span></div><div class="detail-item full-width"><strong>Forma de Pagamento</strong><span>${payment.method || 'Não informado'}</span></div>`;
  se (pagamento.método === 'Dinheiro' && pagamento.changeFor) {
    paymentDetailsHTML += `<div class="detail-item full-width"><strong>Troca para</strong><span>${formatPrice(payment.changeFor)}</span></div>`;
  }
  se (pagamento.método === 'Pix') {
    const pixStatus = payment.pixPaid ? '<span class="text-success">Pagamento</span>': '<span class="text-danger">Não Pago</span>';
    paymentDetailsHTML += `<div class="detail-item full-width"><strong>Status do Pix</strong>${pixStatus}</div>`;
  }
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-file-invoice-dollar"></i> Financeiro</h4><div class="detail-grid">${paymentDetailsHTML}</div>`;
  const deliveryPersonSelectorHTML = `<div class="delivery-assignment-section"><div class="form-group"><label for="modal-delivery-person-select" style="font-weight: 500; margin-bottom: 8px;">Atribuir / Enviar para Entregador:</label><div class="input-with-icon right-icon"><select id="modal-delivery-person-select" class="form-control"><option value="">Selecionar um entregador...</option>${allDeliveryPeople.map(p => `<option value="${p.id}" ${delivery.assignedTo && delivery.assignedTo.id === p.id ? 'selected': ''}>${p.firstName} ${p.lastName}</option>`).join('')}</select><button id="modal-send-wpp-btn" class="pdv-icon-btn whatsapp" title="Enviar dados do pedido para o WhatsApp do entregador"><i class="fab fa-whatsapp"></i></button></div></div></div>`;
  modalBodyHTML += `<h4 class="modal-section-title"><i class="fas fa-motorcycle"></i> Entregador</h4>${deliveryPersonSelectorHTML}`;
  modalBody.innerHTML = modalBodyHTML;
  const sendWppBtn = modalBody.querySelector('#modal-send-wpp-btn');
  se (enviarWppBtn) {
    sendWppBtn.addEventListener('clique', () => handleSendWppToDeliveryPerson(pedido.id));
  }
  orderDetailsModal.classList.add('mostrar');
}

função closeOrderDetailsModal() {
  const orderDetailsModal = document.getElementById('order-details-modal'); if (orderDetailsModal) orderDetailsModal.classList.remove('show');
}

função getOrderType(pedido) {
  if (order.orderType) retornar order.orderType;
  se (order.source === 'WebApp') retornar 'Entrega';
  retornar 'Balcao';
}

função renderOrders() {
  const ordersListContainer = document.getElementById('orders-list-container');
  se (!ordersListContainer) retornar;
  const activeStatusFilter = document.querySelector('.order-status-filters .filter-tab.active')?.dataset.statusFilter || 'todos';
  const visívelOrders = allOrders.filter(o => !['Entregue', 'Cancelado', 'Finalizado'].includes(o.status));
  const typeCounters = {
    balcao: document.querySelector('.summary-item[data-type-filter="balcao"] .count'),
    entrega: document.querySelector('.summary-item[data-type-filter="delivery"] .count'),
    mesas: document.querySelector('.summary-item[data-type-filter="mesas"] .count'),
  };
  se (typeCounters.balcao) typeCounters.balcao.textContent = visibleOrders.filter(o => getOrderType(o) === 'Balcao').length;
  se (typeCounters.delivery) typeCounters.delivery.textContent = visibleOrders.filter(o => getOrderType(o) === 'Entrega').length;
  se (typeCounters.mesas) typeCounters.mesas.textContent = visibleOrders.filter(o => getOrderType(o) === 'Mesa').length;
  constante statusCounters = {
    pendente: document.querySelector('.filter-tab[data-status-filter="pendente"] .count'),
    em_preparo: document.querySelector('.filter-tab[data-status-filter="em-preparo"] .count'),
    a_caminho: document.querySelector('.filter-tab[data-status-filter="a-caminho"] .count')
  };
  if (statusCounters.pendente) statusCounters.pendente.textContent = visívelOrders.filter(o => ['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(o.status)).length;
  se (statusCounters.em_preparo) statusCounters.em_preparo.textContent = visibleOrders.filter(o => o.status === 'Em Preparo').length;
  if (statusCounters.a_caminho) statusCounters.a_caminho.textContent = visívelOrders.filter(o => o.status === 'Saiu para Entrega').length;
  
  deixe filteredOrders = visibleOrders;
  
  se (activeTypeFilter !== 'todos') {
    filteredOrders = filteredOrders.filter(o => getOrderType(o).toLowerCase() === activeTypeFilter);
  }
  se (activeStatusFilter === 'pendente') {
    filteredOrders = filteredOrders.filter(o => ['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(o.status));
  } else if (activeStatusFilter === 'em preparação') {
    filteredOrders = filteredOrders.filter(o => o.status === 'Em preparação');
  } else if (activeStatusFilter === 'a-caminho') {
    Pedidos filtrados = Pedidos filtrados.filter(o => o.status === 'Saiu para Entrega');
  }
  
  ordersListContainer.className = `orders-list-container card-view`; // Sempre use a visualização de cartão
  
  se (filteredOrders.length === 0) {
    ordersListContainer.innerHTML = `<div class="empty-orders-state"><i class="fas fa-receipt empty-state-icon"></i><p class="empty-state-message">Nenhum pedido encontrado com os filtros atuais.</p><button class="btn btn-primary btn-lg empty-state-new-order-btn"><i class="fas fa-plus-circle"></i> Novo pedido</button></div>`;
    const emptyBtn = ordersListContainer.querySelector('.empty-state-new-order-btn');
    se (emptyBtn) emptyBtn.addEventListener('clique', handleNewOrderButtonClick);
    retornar;
  }
  
  ordersListContainer.innerHTML = filteredOrders.map(pedido => getOrderCardHTML(pedido)).join('');
  
  addOrderCardEventListeners();
}

função getOrderCardHTML(pedido) {
  const orderTimestamp = pedido.createdAt?.toDate ? pedido.createdAt.toDate(): nova Data();
  deixe typeIcon,
  tipoTexto;
  const orderType = getOrderType(pedido);
  se (orderType === 'Entrega') {
    typeIcon = '<i class="fas fa-motorcycle"></i>'; typeText = 'Entrega';
  } else if (orderType === 'Mesa') {
    typeIcon = '<i class="fas fa-utensils"></i>'; typeText = 'Mesa';
  } outro {
    typeIcon = '<i class="fas fa-store-alt"></i>'; typeText = 'Balcão';
  }
  if (order.status === 'Saiu para Entrega') {
    typeIcon = '<i class="fas fa-shipping-fast a-caminho-icon"></i>'; typeText = 'O CAMINHO';
  }
  deixe paymentTagHTML = '';
  se (pedido.pagamento) {
    se (pedido.pagamento.método === 'Pix') {
      paymentTagHTML = order.payment.pixPaid ? '<span class="tag tag-payment-paid">Pago</span>': '<span class="tag tag-payment-unpaid">Pix Não Pago</span>';
    } else if (order.payment.method === 'Dinheiro' || order.payment.method.includes('Cartão')) {
      paymentTagHTML = '<span class="tag tag-payment-delivery">Pgto na Entrega</span>';
    }
  }
  deixe actionHtml = getOrderActionHTML(pedido);
  retornar `<div class="pedido-cartão" dados-pedido-id="${order.id}"><div class="cartão-cabeçalho"><div class="pedido-tipo-id">${typeIcon} ${typeText} #${order.id.substring(0, 6)}</div><div class="pedido-timestamp">${orderTimestamp.toLocaleTimeString('pt-BR', {
    hora: '2 dígitos', minuto: '2 dígitos'
  })}</div></div><div class="corpo-do-cartão"><div class="nome-do-cliente">${order.customer.firstName} ${order.customer.lastName}</div><div class="tags-do-pedido"><span class="tag-tag-status">${order.status}</span>${paymentTagHTML}</div></div><div class="rodapé-do-cartão"><div class="valor-do-pedido">R$ ${(order.totals.grandTotal || 0).toFixed(2).replace('.', ',')}</div>${actionHtml}</div></div>`;
}

função getOrderListHTML(pedido) {
  const orderType = getOrderType(pedido);
  deixe actionHtml = getOrderActionHTML(pedido);
  retornar `<div class="item-da-lista-do-pedido" data-pedido-id="${order.id}"><div class="id-item-da-lista">#${order.id.substring(0, 6)}</div><div class="cliente-item-da-lista"><span class="nome">${order.cliente.nome} ${order.cliente.sobrenome}</span><span class="tipo">${orderType}</span></div><div class="status-item-da-lista"><span class="tag-status-tag">${order.status}</span></div><div class="valor-item-da-lista">R$ ${(order.totals.grandTotal || 0).toFixed(2).replace('.', ',')}</div><div class="ações-item-da-lista">${actionHtml}</div></div>`;
}

função getOrderActionHTML(pedido) {
  if (['Recebido', 'Aguardando Pagamento', 'Aguardando Comprovante'].includes(order.status)) {
    retornar `<div class="card-actions"><button class="btn btn-sm btn-danger refuse-order-btn" data-order-id="${order.id}"><i class="fas fa-times"></i> Recusar</button><button class="btn btn-sm btn-success accept-order-btn" data-order-id="${order.id}"><i class="fas fa-check"></i> Aceitar</button></div>`;
  } outro {
    retornar `<select class="status-select-card" data-order-id="${order.id}">${['Em Preparação',
      'Saiu para Entrega',
      'Entregue',
      'Cancelado'].map(s => `<option value="${s}" ${order.status === s?'selected': ''}>${s}</option>`).join('')}</select>`;
  }
}

função listenForRealTimeOrders() {
  se (cancelarassinaturadepedidos) cancelarassinaturadepedidos();
  constante {
    coleção,
    consulta,
    ordemPor,
    no Snapshot
  } = janela.firebaseFirestore;
  const q = query(collection(window.db, "pedidos"), orderBy("createdAt", "desc"));
  deixe isInitialLoad = true;
  unsubscribeFromOrders = onSnapshot(q, snapshot => {
    allOrders = snapshot.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    renderOrdens();
    snapshot.docChanges().forEach(change => {
      se (change.type === "adicionado" && !isInitialLoad) {
        novo Áudio('../audio/notification.mp3').play().catch(e => {});
      }
    });
    isInitialLoad = falso;
  }, erro => {
    console.error("Erro ao ouvir pedidos em tempo real: ",
      erro);
    document.getElementById('orders-list-container').innerHTML = `<p>Erro ao carregar pedidos.</p>`;
  });
}

função assíncrona updateOrderStatus(orderId, newStatus) {
  constante {
    doc, updateDoc
  } = janela.firebaseFirestore;
  const ordem = allOrders.find(o => o.id === orderId);
  se (!ordem) retornar;
  const notifyCustomer = (newStatus === 'Em Preparação' || newStatus === 'Saiu para Entrega' || newStatus === 'Cancelado');
  tentar {
    aguarde updateDoc(doc(window.db, "pedidos", orderId), {
      status: novoStatus, últimaAtualizaçãoDeStatus: nova Data()
    });
    se (notificarCliente && pedido.cliente && pedido.cliente.whatsapp) {
      deixe mensagem = '';
      if (newStatus === 'Em preparação') {
        message = `Olá, ${order.customer.firstName}! Seu pedido #${order.id.substring(0, 6)} na D'Italia Pizzaria foi confirmado e já está em preparo!`;
      } else if (newStatus === 'Cancelado') {
        message = `Olá, ${order.customer.firstName}. Infelizmente, seu pedido #${order.id.substring(0, 6)} na D'Italia Pizzaria foi cancelado. Por favor, entre em contato para mais detalhes.`;
      } else if (newStatus === 'Saiu para Entrega') {
        message = `Olá, ${order.customer.firstName}! Boas notícias! Seu pedido da D'Italia Pizzaria acaba de sair para entrega!`;
      }
      se (mensagem) {
        window.open(`https://wa.me/55${order.customer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
      }
    }
  } pegar (erro) {
    console.error("Erro ao atualizar status do pedido: ", erro);
  }
}

função handleNewOrderButtonClick() {
  const pdvMenuLink = document.querySelector('a[data-section-target="pdv-content"]');
  se (pdvMenuLink) {
    pdvMenuLink.clique();
    se (tipo de janela.openPdvNewOrderView === 'função') {
      janela.openPdvNewOrderView();
    }
  }
}

função addOrderCardEventListeners() {
  const container = document.getElementById('orders-list-container');
  container.querySelectorAll('.accept-order-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation(); updateOrderStatus(btn.dataset.orderId, 'Em preparação');
  }));
  container.querySelectorAll('.refuse-order-btn').forEach(btn => btn.addEventListener('clique', (e) => {
    e.stopPropagation(); updateOrderStatus(btn.dataset.orderId, 'Cancelado');
  }));
  container.querySelectorAll('.status-select-card').forEach(select => {
    select.addEventListener('alterar', e => updateOrderStatus(select.dataset.orderId, e.target.value));
    select.addEventListener('clique', e => e.stopPropagation());
  });
  container.querySelectorAll('.pedido-cartão, .pedido-lista-item').forEach(cartão => cartão.addEventListener('clique', () => {
    const ordem = allOrders.find(o => o.id === card.dataset.orderId);
    se (pedido) openOrderDetailsModal(pedido);
  }));
}

função showDeliverySummary() {
  const deliveryOrders = allOrders.filter(o => o.status === 'Saiu para Entrega');
  const modal = document.getElementById('resumo-de-entrega-modal');
  const modalBody = document.getElementById('corpo-resumo-de-entrega');
  se (deliveryOrders.length === 0) {
    modalBody.innerHTML = '<p class="empty-list-message">Nenhum pedido a caminho no momento.</p>';
  } outro {
    modalBody.innerHTML = deliveryOrders.map(pedido => {
      const entrega = pedido.entrega || {};
      const cliente = pedido.cliente || {};
      const endereço = [entrega.rua, entrega.número, entrega.bairro].filter(Boolean).join(', ');
      retornar `<div class="delivery-route-item"><div class="route-customer">#${order.id.substring(0, 6)} - ${customer.firstName} ${customer.lastName}</div><div class="route-address"><strong>Endereço:</strong> ${address}<br>${delivery.reference ? `<strong>Ref:</strong> ${delivery.reference}`: ''}</div></div>`;
    }).juntar('');
  }
  modal.classList.add('mostrar');
}

função assíncrona fetchDeliveryPeople() {
  se (!window.db || !window.firebaseFirestore) retornar;
  constante {
    coleção,
    obterDocs,
    consulta
  } = janela.firebaseFirestore;
  tentar {
    const q = consulta(coleção(window.db, "entregadores"));
    const querySnapshot = await getDocs(q);
    allDeliveryPeople = querySnapshot.docs.map(doc => ({
      id: doc.id, ...doc.data()
    }));
    window.allDeliveryPeople = allDeliveryPeople;
  } pegar (erro) {
    console.error("Erro ao buscar entregadores:", erro);
    window.showToast("Não foi possível carregar os entregadores.", "error");
  }
}

função assíncrona initializeOrdersSection() {
    se (ordersSectionInitialized) {
        retornar;
    }
    ordersSectionInitialized = verdadeiro;
    
    console.log("Módulo Pedidos.js: Configurando pela primeira vez...");

    aguardar fetchDeliveryPeople();
    ouvirPedidosEmTempoReal();

    const typeFilterTabs = document.querySelectorAll('.order-summary-bar .summary-item');
    const statusFilterTabs = document.querySelectorAll('.order-status-filters .filter-tab');
    const newOrderButtons = document.querySelectorAll('.novo-pedido-botão-principal, .estado-vazio-novo-pedido-botão');
    const orderDetailsModal = document.getElementById('detalhes-do-pedido-modal');
    
    se (typeFilterTabs.length > 0) {
        typeFilterTabs.forEach(tab => {
            tab.addEventListener('clique', () => {
                const filterType = tab.dataset.typeFilter;
                se (!filterType) retornar;
                
                se (tab.classList.contains('ativo')) {
                    tab.classList.remove('ativo');
                    activeTypeFilter = 'todos';
                } outro {
                    typeFilterTabs.forEach(t => t.classList.remove('ativo'));
                    tab.classList.add('ativo');
                    activeTypeFilter = TipoDeFiltro;
                }
                renderOrdens();
            });
        });
    }

    se (statusFilterTabs.length > 0) {
        statusFilterTabs.forEach(guia => {
            tab.addEventListener('clique', () => {
                document.querySelector('.order-status-filters .filter-tab.active')?.classList.remove('ativo');
                tab.classList.add('ativo');
                renderOrdens();
            });
        });
    }
    
    se (newOrderButtons.length > 0) {
        newOrderButtons.forEach(btn => {
            btn.addEventListener('clique', handleNewOrderButtonClick);
        });
    }

    se (orderDetailsModal) {
        orderDetailsModal.querySelector('.close-modal-btn')?.addEventListener('clique', closeOrderDetailsModal);
        orderDetailsModal.addEventListener('clique', (e) => {
            se (e.target === orderDetailsModal) closeOrderDetailsModal();
        });
    }
}

window.initializeOrdersSection = inicializarOrdersSection;
