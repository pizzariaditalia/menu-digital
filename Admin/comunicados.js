// Arquivo: comunicados.js - VERSÃO COM MENSAGENS AUTOMÁTICAS

let comunicadosSectionInitialized = false;

// Objeto com os modelos de mensagem
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
        titulo: 'Aviso de Funcionamento 🕝',
        texto: `Olá {nome_cliente}! 🍕🔥 Já estamos com o forno a todo vapor esperando seu pedido! O melhor da pizza na sua casa.\n\nPeça pelo nosso site: https://www.pizzaditalia.com.br`
    }
};
    
async function initializeComunicadosSection() {
    if (comunicadosSectionInitialized) return;
    comunicadosSectionInitialized = true;
    console.log("Módulo Comunicados.js: Inicializando PELA PRIMEIRA VEZ...");

    const mensagemTextarea = document.getElementById('comunicado-mensagem');
    const gerarLinksBtn = document.getElementById('gerar-links-envio');
    const listaContainer = document.getElementById('lista-envio-whatsapp');
    const listaContainerWrapper = document.getElementById('lista-envio-whatsapp-container');
    const templateSelect = document.getElementById('template-selecao-mensagem');

    // Popula o menu de seleção com as mensagens pré-montadas
    if (templateSelect) {
        Object.keys(MENSAGENS_PRE_MONTADAS).forEach(key => {
            const option = new Option(MENSAGENS_PRE_MONTADAS[key].titulo, key);
            templateSelect.appendChild(option);
        });

        // Adiciona o evento que preenche a caixa de texto
        templateSelect.addEventListener('change', (e) => {
            const selectedKey = e.target.value;
            if (selectedKey && MENSAGENS_PRE_MONTADAS[selectedKey]) {
                mensagemTextarea.value = MENSAGENS_PRE_MONTADAS[selectedKey].texto;
            } else {
                mensagemTextarea.value = ''; // Limpa se a opção "Selecione" for escolhida
            }
        });
    }


    gerarLinksBtn.addEventListener('click', async () => {
        const mensagemBase = mensagemTextarea.value;
        if (!mensagemBase) {
            window.showToast("Por favor, escreva uma mensagem ou selecione um modelo.", "warning");
            return;
        }

        window.showToast("Buscando clientes...", "info");
        gerarLinksBtn.disabled = true;
        gerarLinksBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

        try {
            const { collection, getDocs, query } = window.firebaseFirestore;
            const customersQuery = query(collection(window.db, "customer"));
            const querySnapshot = await getDocs(customersQuery);
            const allCustomers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const customersWithWhatsapp = allCustomers.filter(c => c.whatsapp);

            if (customersWithWhatsapp.length === 0) {
                listaContainer.innerHTML = '<p class="empty-list-message">Nenhum cliente com WhatsApp cadastrado foi encontrado.</p>';
            } else {
                const tableRows = customersWithWhatsapp.map(customer => {
                    const nomeCliente = customer.firstName || "Cliente";
                    const mensagemPersonalizada = mensagemBase.replace('{nome_cliente}', nomeCliente);
                    const whatsappLink = `https://wa.me/55${customer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagemPersonalizada)}`;
                    
                    return `
                        <tr>
                            <td>${nomeCliente} ${customer.lastName || ''}</td>
                            <td>${customer.whatsapp}</td>
                            <td class="table-actions">
                                <a href="${whatsappLink}" target="_blank" class="btn btn-sm btn-success"><i class="fab fa-whatsapp"></i> Enviar</a>
                            </td>
                        </tr>
                    `;
                }).join('');
                
                listaContainer.innerHTML = `
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>WhatsApp</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                `;
            }
            listaContainerWrapper.classList.remove('hidden');

        } catch (error) {
            console.error("Erro ao gerar links de WhatsApp:", error);
            window.showToast("Ocorreu um erro ao buscar os clientes.", "error");
        } finally {
            gerarLinksBtn.disabled = false;
            gerarLinksBtn.innerHTML = '<i class="fas fa-rocket"></i> Gerar Links de Envio';
        }
    });
}

window.initializeComunicadosSection = initializeComunicadosSection;
