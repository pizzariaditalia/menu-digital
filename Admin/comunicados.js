// Arquivo: comunicados.js - VERSÃO COMPLETA COM ENVIO DE PUSH E WHATSAPP

let comunicadosSectionInitialized = false;

const MENSAGENS_PRE_MONTADAS = {
    aviso_novo_aplicativo: {
        titulo: 'Aviso de Casa Nova 📲',
        texto: `Olá, {nome_cliente}! Tudo bem? 😊\n\nEstamos de casa nova! 🚀 Agora você pode fazer seus pedidos da D'Italia Pizzaria pelo nosso novo site oficial, mais rápido e com promoções exclusivas!\n\nClique no link para conferir: https://www.pizzaditalia.com.br\n\nEsperamos seu pedido! 🍕`
    },
    nova_promocao: {
        titulo: 'Anunciar Nova Promoção 🍕',
        texto: `Olá, {nome_cliente}! 🍕 Passando para avisar que temos uma promoção imperdível te esperando! Peça hoje e aproveite.\n\nAcesse nosso cardápio: https://www.pizzaditalia.com.br`
    },
    novo_cupom: {
        titulo: 'Divulgar Cupom de Desconto 🎟️',
        texto: `E aí, {nome_cliente}! Liberamos um cupom de desconto especial para você. Use o código *NOVO10* no seu próximo pedido e ganhe 10% OFF!\n\nPeça agora: https://www.pizzaditalia.com.br`
    },
    cliente_ausente: {
        titulo: 'Reativar Cliente Ausente 👋',
        texto: `Olá, {nome_cliente}, sentimos sua falta! 😊 Que tal uma pizza deliciosa hoje? Preparamos nosso cardápio com muito carinho para você.\n\nDê uma olhada nas novidades: https://www.pizzaditalia.com.br`
    },
    aviso_funcionamento: {
        titulo: 'Aviso de Funcionamento (Sexta-feira) 🔥',
        texto: `Olá, {nome_cliente} boa noite! 🍕🔥 Já estamos com o forno a todo vapor esperando seu pedido 🛵💨! O melhor da pizza na sua casa.\n\nPeça pelo nosso site: https://www.pizzaditalia.com.br`
    }
};

async function initializeComunicadosSection() {
    if (comunicadosSectionInitialized) return;
    comunicadosSectionInitialized = true;
    console.log("Módulo Comunicados.js: Inicializando...");

    const comunicadoTituloInput = document.getElementById('comunicado-titulo');
    const mensagemTextarea = document.getElementById('comunicado-mensagem');
    const gerarLinksBtn = document.getElementById('gerar-links-envio');
    const enviarLoteBtn = document.getElementById('enviar-lote-selecionado-btn');
    const listaContainer = document.getElementById('lista-envio-whatsapp');
    const listaContainerWrapper = document.getElementById('lista-envio-whatsapp-container');
    const templateSelect = document.getElementById('template-selecao-mensagem');
    const enviarPushBtn = document.getElementById('enviar-notificacao-push-btn');

    // Popula o menu de seleção de templates
    if (templateSelect && templateSelect.options.length <= 1) {
        Object.keys(MENSAGENS_PRE_MONTADAS).forEach(key => {
            const option = new Option(MENSAGENS_PRE_MONTADAS[key].titulo, key);
            templateSelect.appendChild(option);
        });
    }
    
    // Listener para preencher os campos com base no template selecionado
    if (templateSelect) {
        templateSelect.addEventListener('change', (e) => {
            const selectedKey = e.target.value;
            if (selectedKey && comunicadoTituloInput && mensagemTextarea) {
                comunicadoTituloInput.value = MENSAGENS_PRE_MONTADAS[selectedKey].titulo;
                mensagemTextarea.value = MENSAGENS_PRE_MONTADAS[selectedKey].texto;
            } else if (comunicadoTituloInput && mensagemTextarea) {
                comunicadoTituloInput.value = '';
                mensagemTextarea.value = '';
            }
        });
    }

    // Listener para o botão de gerar lista de clientes para WhatsApp
    if (gerarLinksBtn) {
        gerarLinksBtn.addEventListener('click', async () => {
            window.showToast("Buscando clientes...", "info");
            gerarLinksBtn.disabled = true;
            gerarLinksBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
            
            try {
                const { collection, getDocs, query } = window.firebaseFirestore;
                const customersQuery = query(collection(window.db, "customer"));
                const querySnapshot = await getDocs(customersQuery);
                const allCustomers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                renderCustomerList(allCustomers.filter(c => c.whatsapp));
                if(listaContainerWrapper) listaContainerWrapper.classList.remove('hidden');
            } catch (error) {
                console.error("Erro ao gerar lista de clientes:", error);
                window.showToast("Ocorreu um erro ao buscar os clientes.", "error");
            } finally {
                gerarLinksBtn.disabled = false;
                gerarLinksBtn.innerHTML = '<i class="fas fa-list"></i> Gerar Lista de Clientes (WhatsApp)';
            }
        });
    }
    
    // Listener para o botão de enviar lote de WhatsApp
    if (enviarLoteBtn) {
        enviarLoteBtn.addEventListener('click', () => {
            const mensagemBase = mensagemTextarea.value;
            if (!mensagemBase) {
                window.showToast("Escreva uma mensagem antes de enviar.", "warning");
                return;
            }

            const checkboxes = listaContainer.querySelectorAll('.customer-select-checkbox:checked');
            
            checkboxes.forEach(checkbox => {
                const customerRow = checkbox.closest('tr');
                const customerName = customerRow.dataset.customerName;
                const customerWhatsapp = customerRow.dataset.customerWhatsapp;
                const mensagemPersonalizada = mensagemBase.replace(/{nome_cliente}/g, customerName);
                const whatsappLink = `https://wa.me/55${customerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagemPersonalizada)}`;
                window.open(whatsappLink, '_blank');
            });
        });
    }
    
    // Listener para o NOVO botão de enviar notificação push
    if (enviarPushBtn) {
        enviarPushBtn.addEventListener('click', async () => {
            const title = comunicadoTituloInput.value.trim();
            const body = mensagemTextarea.value.trim();

            if (!title || !body) {
                window.showToast("Preencha o título e o corpo da mensagem.", "warning");
                return;
            }

            if (!confirm(`Você tem certeza que deseja enviar a notificação push com o título "${title}" para TODOS os clientes?`)) {
                return;
            }
            
            enviarPushBtn.disabled = true;
            enviarPushBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            try {
                const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
                const auth = getAuth(window.firebaseApp);
                
                if (!auth.currentUser) {
                    throw new Error("Admin não autenticado.");
                }
                
                const idToken = await auth.currentUser.getIdToken(true);
                
                const projectId = window.firebaseApp.options.projectId;
                const functionRegion = "us-central1"; 
                const broadcastUrl = `https://${functionRegion}-${projectId}.cloudfunctions.net/sendbroadcastnotification`;

                const response = await fetch(broadcastUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ title, body })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Falha na resposta do servidor.');
                }

                const result = await response.json();
                window.showToast(result.message, "success");

            } catch (error) {
                console.error("Erro ao enviar notificação em massa:", error);
                window.showToast(error.message || "Ocorreu um erro.", "error");
            } finally {
                enviarPushBtn.disabled = false;
                enviarPushBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Notificação Push';
            }
        });
    }


    function renderCustomerList(customers) {
        if (!listaContainer) return;
        if (customers.length === 0) {
            listaContainer.innerHTML = '<p class="empty-list-message">Nenhum cliente com WhatsApp cadastrado.</p>';
            return;
        }

        const tableRows = customers.map(customer => {
            const nomeCliente = customer.firstName || "Cliente";
            return `
                <tr data-customer-name="${nomeCliente}" data-customer-whatsapp="${customer.whatsapp}">
                    <td class="checkbox-cell">
                        <input type="checkbox" class="customer-select-checkbox">
                    </td>
                    <td>${nomeCliente} ${customer.lastName || ''}</td>
                    <td>${customer.whatsapp}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-success individual-send-btn"><i class="fab fa-whatsapp"></i> Enviar</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        listaContainer.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th class="checkbox-cell"><input type="checkbox" id="select-all-customers"></th>
                        <th>Nome</th>
                        <th>WhatsApp</th>
                        <th>Ação Individual</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        addTableEventListeners();
    }

    function addTableEventListeners() {
        if (!listaContainer) return;
        
        const selectAllCheckbox = document.getElementById('select-all-customers');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('click', (e) => {
                listaContainer.querySelectorAll('.customer-select-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                });
                updateBatchButtonState();
            });
        }

        listaContainer.querySelectorAll('.individual-send-btn').forEach(button => {
            button.addEventListener('click', () => {
                const customerRow = button.closest('tr');
                const customerName = customerRow.dataset.customerName;
                const customerWhatsapp = customerRow.dataset.customerWhatsapp;
                
                const mensagemBase = mensagemTextarea.value;
                if (!mensagemBase) {
                    window.showToast("Escreva uma mensagem antes de enviar.", "warning");
                    return;
                }

                const mensagemPersonalizada = mensagemBase.replace(/{nome_cliente}/g, customerName);
                const whatsappLink = `https://wa.me/55${customerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagemPersonalizada)}`;
                window.open(whatsappLink, '_blank');
            });
        });
        
        listaContainer.querySelectorAll('.customer-select-checkbox').forEach(cb => {
            cb.addEventListener('change', updateBatchButtonState);
        });
    }
    
    function updateBatchButtonState() {
        if (!listaContainer || !enviarLoteBtn) return;
        const checkedCount = listaContainer.querySelectorAll('.customer-select-checkbox:checked').length;
        if (checkedCount > 0) {
            enviarLoteBtn.classList.remove('hidden');
            enviarLoteBtn.innerHTML = `<i class="fab fa-whatsapp"></i> Enviar para ${checkedCount} Selecionado(s)`;
        } else {
            enviarLoteBtn.classList.add('hidden');
        }
    }
}

window.initializeComunicadosSection = initializeComunicadosSection;