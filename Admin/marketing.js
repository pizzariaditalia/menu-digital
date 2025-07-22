// Arquivo: marketing.js

let marketingSectionInitialized = false;
const MARKETING_COLLECTION = "scheduled_posts";

// --- BANCO DE IDEIAS CRIATIVAS ---
const CAPTION_IDEAS = [
    // Semanais e Dias Específicos
    { title: "Segunda-feira (Começo da Semana)", caption: "Segunda-feira pede uma motivação extra! Que tal começar a semana com o pé direito e uma pizza deliciosa? Peça a sua e transforme o início da semana. #SegundaFeira #PizzaNight #ComecoDeSemana" },
    { title: "Terça-feira (Promoção)", caption: "TERÇA EM DOBRO! 🍕🍕 Compre uma pizza de [Sabor] e a segunda sai com 50% de desconto! Marque quem vai dividir essa com você. Promoção válida somente hoje! #TercaEmDobro #PromocaoDePizza #Delivery" },
    { title: "Quarta-feira (Futebol)", caption: "Quarta é dia de futebol e pizza! ⚽🍕 Já garantiu a sua para o jogo de hoje? Faça seu pedido e receba no conforto do seu sofá. #FutebolComPizza #DiaDeJogo #Pizzaria" },
    { title: "Quinta-feira (TBT da Fome)", caption: "#TBT daquela fome de quinta que só uma D'Italia resolve. Qual sabor te dá mais saudade? Conta pra gente! #TBT #QuintaFeira #Fome" },
    { title: "Sextou!", caption: "SEXTOU! 🙌 O fim de semana chegou e a sua única preocupação deveria ser qual sabor de pizza pedir. Deixa a janta com a gente! #Sextou #FimDeSemana #Pizza" },
    { title: "Sábado à Noite", caption: "A noite de sábado foi feita para momentos especiais. E nada mais especial que uma pizza quentinha com quem você ama. ❤️🍕 #SabadoANoite #PizzaComAmor #Momentos" },
    { title: "Domingo (Preguiça Boa)", caption: "Domingo é o dia oficial da preguiça. Cozinhar pra quê? Peça sua pizza favorita e curta o fim do dia sem preocupações. #Domingo #Preguica #PizzaEmCasa" },
    // Engajamento e Interação
    { title: "Enquete de Sabores", caption: "BATALHA DE SABORES! ⚔️ Qual vence essa disputa: Calabresa ou Quatro Queijos? Vote nos comentários e vamos ver qual é a favorita da galera! #BatalhaDeSabores #Enquete #TeamCalabresa #TeamQuatroQueijos" },
    { title: "Complete a Frase", caption: "Complete a frase: 'Uma pizza perfeita precisa ter ____'. Queremos saber o que não pode faltar na sua! As respostas mais criativas ganham um cupom! 😉 #CompleteAFrase #PizzaPerfeita #Interacao" },
    { title: "Bastidores (Ingredientes)", caption: "O segredo do nosso sabor está na qualidade. 🍅 Usamos apenas ingredientes frescos e selecionados para garantir que cada fatia seja inesquecível. #IngredientesFrescos #Qualidade #FeitoComAmor" },
    { title: "Foto do Cliente (Repost)", caption: "A gente AMA ver vocês felizes com nossas pizzas! ❤️ Essa foto incrível é do(a) @[marcar cliente]. Faça como ele(a), poste sua foto com a #NossaHashtag e apareça aqui! #ClienteFeliz #PizzaLovers" },
    { title: "Dica de Harmonização", caption: "Dica do chef: nossa pizza de [Sabor] harmoniza perfeitamente com um [Tipo de Vinho/Cerveja]. Que tal experimentar essa combinação hoje? 🍷🍺 #DicaDoChef #Harmonizacao #PizzaEVinho" },
    // Vendas e Produtos
    { title: "Foco na Borda Recheada", caption: "Você já provou nossa borda recheada de [Sabor da Borda]? É um espetáculo à parte! Peça a sua com esse upgrade de sabor. 🤤 #BordaRecheada #Queijo #ExtraSabor" },
    { title: "Lançamento de Sabor", caption: "NOVO SABOR NA ÁREA! ✨ Apresentamos a incrível pizza de [Nome do Novo Sabor]. Uma combinação de [Ingredientes] que vai te surpreender. Peça a sua e conte pra gente o que achou! #Lancamento #NovoSabor" },
    { title: "A Mais Pedida", caption: "Essa é a campeã de pedidos! 🏆 A nossa pizza de [Sabor Mais Pedido] é a prova de que o clássico nunca sai de moda. Já pediu a sua hoje? #AMaisPedida #CampeãDeVendas #Sucesso" },
    { title: "Foco em Bebidas", caption: "Pizza boa pede uma bebida gelada! 🥤 Já conferiu nossa seleção de refrigerantes e sucos? Adicione sua bebida favorita ao pedido e deixe tudo perfeito. #BebidaGelada #PizzaEGuarana" },
    // Criativas e Divertidas
    { title: "Meme de Pizza", caption: "Eu depois de comer a primeira fatia da pizza da D'Italia. (Use uma imagem de meme popular). Quem mais se identifica? 😂 #Meme #PizzaMeme #Humor" },
    { title: "Pizza para Cada Signo", caption: "A pizza de cada signo! ♈ Áries: apimentada. ♉ Touro: 4 queijos. ♊ Gêmeos: metade de cada. Qual é a sua? Comenta aí! #Astrologia #Signos #PizzaDosSignos" },
    { title: "Benefícios de Pedir em Casa", caption: "Vantagens de pedir D'Italia em casa: 1. Não precisa lavar louça. 2. Come de pijama. 3. Felicidade instantânea. Precisa de mais motivos? 😉 #Delivery #Conforto #FicaEmCasa" },
    { title: "História da Pizzaria", caption: "Você sabia? A D'Italia nasceu do sonho de [contar um pequeno trecho da sua história]. Cada pizza que sai do nosso forno carrega um pedaço desse carinho. Obrigado por fazer parte disso! ❤️ #NossaHistoria #Pizzaria" },
    // Adicionais para completar 30
    { title: "Chuva e Pizza", caption: "Dia de chuva combina com o quê? 🌧️ Filme, cobertor e uma pizza quentinha da D'Italia! O combo perfeito para hoje. #DiaDeChuva #FilmeEPizza #Aconchego" },
    { title: "Desafio: Montar a Pizza", caption: "Se você pudesse montar uma pizza com 3 ingredientes, quais seriam? Deixe sua combinação nos comentários! Quem sabe ela não vira um sabor especial por um dia? 🤔 #Desafio #MonteSuaPizza" },
    { title: "Foco no Queijo Puxando", caption: "Aquele momento que a gente vive pra ver. 🧀🤤 Marque alguém que precisa ver essa cena hoje! #QueijoPuxando #CheesePull #Satisfatorio" },
    { title: "Para os Indecisos", caption: "Na dúvida entre dois sabores? Peça uma pizza meio a meio e seja feliz em dobro! 😄 #MeioAMeio #Indecisos #Solucao" },
    { title: "Cupom Relâmpago (Stories)", caption: "CUPOM RELÂMPAGO! ⚡ Os 10 primeiros que usarem o código 'PIZZAFLASH' no nosso site ganham 15% de desconto. Válido só por 1 hora! CORRE! #CupomRelampago #Desconto" },
    { title: "Agradecimento aos Clientes", caption: "Nossa maior alegria é fazer parte dos seus momentos. Obrigado por escolher a D'Italia Pizzaria para fazer sua noite mais feliz! 🙏❤️ #Gratidao #Clientes" },
    { title: "Vegetariana do Dia", caption: "Quem disse que pizza vegetariana não é incrível? 🌱 Nossa [Nome da Pizza Veg] é cheia de sabor e ingredientes frescos. Já provou? #Vegetariana #PizzaVeg #SaborSemCarne" },
    { title: "Para os Amantes de Doce", caption: "Guarde um espacinho para a sobremesa! 😋 Nossa pizza doce de [Sabor] é o final perfeito para a sua refeição. #PizzaDoce #Sobremesa #Chocolate" },
    { title: "Funcionamento e Contato", caption: "Já estamos a todo vapor! 🔥 Peça sua pizza das 18h às 23h. 📞 WhatsApp: [Seu Número] | 💻 Site: [Link na Bio]. #HorarioDeFuncionamento #Delivery" },
    { title: "Convidando para Seguir", caption: "Gostou do que viu? Siga nosso perfil para não perder nenhuma novidade, promoção ou delícia que postamos por aqui! 😉 #SigaNos #Novidades" }
];


// Função principal de inicialização da seção
async function initializeMarketingSection() {
    if (marketingSectionInitialized) return;
    marketingSectionInitialized = true;
    console.log("Módulo Marketing.js: Inicializando...");

    const marketingForm = document.getElementById('marketing-form');
    const formTitle = document.getElementById('marketing-form-title');
    const postIdInput = document.getElementById('marketing-post-id');
    const postTitleInput = document.getElementById('post-title');
    const postCaptionInput = document.getElementById('post-caption');
    const postScheduledAtInput = document.getElementById('post-scheduled-at');
    const cancelEditBtn = document.getElementById('cancel-edit-post-btn');
    const scheduledPostsContainer = document.getElementById('scheduled-posts-container');
    const openIdeasBtn = document.getElementById('open-caption-ideas-btn');
    const ideasModal = document.getElementById('caption-ideas-modal');
    const ideasListContainer = document.getElementById('caption-ideas-list');
    
    // Carrega e renderiza as ideias de legenda no modal
    if (ideasListContainer) {
        ideasListContainer.innerHTML = CAPTION_IDEAS.map(idea => `
            <div class="idea-item">
                <h4>${idea.title}</h4>
                <p>${idea.caption.replace(/\n/g, "<br>")}</p>
                <button class="btn btn-sm btn-primary use-caption-btn">Usar esta legenda</button>
            </div>
        `).join('<hr>');
    }

    // Abre e fecha o modal de ideias
    openIdeasBtn.addEventListener('click', () => ideasModal.classList.add('show'));
    ideasModal.querySelector('.close-modal-btn').addEventListener('click', () => ideasModal.classList.remove('show'));

    // Ação para o botão "Usar esta legenda"
    ideasListContainer.querySelectorAll('.use-caption-btn').forEach((button, index) => {
        button.addEventListener('click', () => {
            postCaptionInput.value = CAPTION_IDEAS[index].caption;
            ideasModal.classList.remove('show');
        });
    });

    // Função para carregar os posts agendados do Firestore
    function loadScheduledPosts() {
        const { collection, query, where, onSnapshot, orderBy } = window.firebaseFirestore;
        const q = query(collection(window.db, MARKETING_COLLECTION), where("status", "==", "agendado"), orderBy("scheduledAt", "asc"));

        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                scheduledPostsContainer.innerHTML = '<p class="empty-list-message">Nenhuma postagem agendada.</p>';
                return;
            }
            const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderScheduledPosts(posts);
        });
    }

    // Função para renderizar os cards de posts agendados
    function renderScheduledPosts(posts) {
        scheduledPostsContainer.innerHTML = posts.map(post => {
            const scheduleDate = post.scheduledAt.toDate();
            const formattedDate = scheduleDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            return `
                <div class="scheduled-post-card">
                    <div class="post-details">
                        <strong class="post-title">${post.title}</strong>
                        <span class="post-time"><i class="fas fa-clock"></i> ${formattedDate}</span>
                        <p class="post-caption-preview">${post.caption.substring(0, 100)}...</p>
                    </div>
                    <div class="post-actions">
                        <button class="btn-icon edit-post-btn" data-id="${post.id}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-danger-outline delete-post-btn" data-id="${post.id}" title="Cancelar Agendamento"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        addPostActionListeners();
    }
    
    // Adiciona listeners para os botões de editar/excluir
    function addPostActionListeners() {
        scheduledPostsContainer.querySelectorAll('.edit-post-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const docId = e.target.closest('button').dataset.id;
                const { doc, getDoc } = window.firebaseFirestore;
                const postSnap = await getDoc(doc(window.db, MARKETING_COLLECTION, docId));
                if (postSnap.exists()) {
                    const post = postSnap.data();
                    formTitle.textContent = "Editar Agendamento";
                    postIdInput.value = docId;
                    postTitleInput.value = post.title;
                    postCaptionInput.value = post.caption;
                    // Formata a data para o input datetime-local
                    const date = post.scheduledAt.toDate();
                    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                    postScheduledAtInput.value = date.toISOString().slice(0,16);
                    cancelEditBtn.classList.remove('hidden');
                    window.scrollTo(0, 0);
                }
            });
        });

        scheduledPostsContainer.querySelectorAll('.delete-post-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const docId = e.target.closest('button').dataset.id;
                if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
                    const { doc, deleteDoc } = window.firebaseFirestore;
                    await deleteDoc(doc(window.db, MARKETING_COLLECTION, docId));
                    window.showToast("Agendamento cancelado.", "success");
                }
            });
        });
    }

    // Listener do formulário principal
    marketingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { doc, collection, addDoc, updateDoc, Timestamp } = window.firebaseFirestore;
        
        const postData = {
            title: postTitleInput.value,
            caption: postCaptionInput.value,
            scheduledAt: Timestamp.fromDate(new Date(postScheduledAtInput.value)),
            status: 'agendado'
        };

        const postId = postIdInput.value;
        if (postId) { // Editando
            await updateDoc(doc(window.db, MARKETING_COLLECTION, postId), postData);
            window.showToast("Agendamento atualizado!", "success");
        } else { // Criando
            await addDoc(collection(window.db, MARKETING_COLLECTION), postData);
            window.showToast("Post agendado com sucesso!", "success");
        }
        
        marketingForm.reset();
        formTitle.textContent = "Agendar Nova Postagem";
        postIdInput.value = '';
        cancelEditBtn.classList.add('hidden');
    });

    // Listener do botão de cancelar edição
    cancelEditBtn.addEventListener('click', () => {
        marketingForm.reset();
        formTitle.textContent = "Agendar Nova Postagem";
        postIdInput.value = '';
        cancelEditBtn.classList.add('hidden');
    });

    // Carrega os dados iniciais
    loadScheduledPosts();
}

// Expõe a função para ser chamada pelo admin.js
window.initializeMarketingSection = initializeMarketingSection;