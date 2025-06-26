// Arquivo: comunicados.js

let comunicadosSectionInitialized = false;

async function initializeComunicadosSection() {
    if (comunicadosSectionInitialized) return;
    comunicadosSectionInitialized = true;
    console.log("Módulo Comunicados.js: Inicializando PELA PRIMEIRA VEZ...");

    const mensagemTextarea = document.getElementById('comunicado-mensagem');
    const gerarLinksBtn = document.getElementById('gerar-links-envio');
    const listaContainer = document.getElementById('lista-envio-whatsapp');
    const listaContainerWrapper = document.getElementById('lista-envio-whatsapp-container');

    // Sugestão de mensagem padrão
    const MENSAGEM_PADRAO = `Olá, {nome_cliente}! Tudo bem? 😊\n\nEstamos de casa nova! 🚀 Agora você pode fazer seus pedidos da D'Italia Pizzaria pelo nosso novo site oficial, mais rápido e com promoções exclusivas!\n\nClique no link para conferir: https://www.pizzaditalia.com.br\n\nEsperamos seu pedido! 🍕`;
    mensagemTextarea.value = MENSAGEM_PADRAO;

    gerarLinksBtn.addEventListener('click', async () => {
        const mensagemBase = mensagemTextarea.value;
        if (!mensagemBase) {
            window.showToast("Por favor, escreva uma mensagem.", "warning");
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