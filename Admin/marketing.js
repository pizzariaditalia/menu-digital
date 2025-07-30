// Arquivo: marketing.js

let marketingSectionInitialized = false;
const MARKETING_COLLECTION = "scheduled_posts";

// --- BANCO DE IDEIAS CRIATIVAS (100 EXEMPLOS) ---
const CAPTION_IDEAS = [
    // Semanais e Dias Específicos (7)
    { title: "Segunda-feira (Começo da Semana)", caption: "Segunda-feira pede uma motivação extra! Que tal começar a semana com o pé direito e uma pizza deliciosa? Peça a sua e transforme o início da semana. #SegundaFeira #PizzaNight #ComecoDeSemana" },
    { title: "Terça-feira (Promoção)", caption: "TERÇA EM DOBRO! 🍕🍕 Compre uma pizza de [Sabor] e a segunda sai com 50% de desconto! Marque quem vai dividir essa com você. Promoção válida somente hoje! #TercaEmDobro #PromocaoDePizza #Delivery" },
    { title: "Quarta-feira (Futebol)", caption: "Quarta é dia de futebol e pizza! ⚽🍕 Já garantiu a sua para o jogo de hoje? Faça seu pedido e receba no conforto do seu sofá. #FutebolComPizza #DiaDeJogo #Pizzaria" },
    { title: "Quinta-feira (TBT da Fome)", caption: "#TBT daquela fome de quinta que só uma D'Italia resolve. Qual sabor te dá mais saudade? Conta pra gente! #TBT #QuintaFeira #Fome" },
    { title: "Sextou!", caption: "SEXTOU! 🙌 O fim de semana chegou e a sua única preocupação deveria ser qual sabor de pizza pedir. Deixa a janta com a gente! #Sextou #FimDeSemana #Pizza" },
    { title: "Sábado à Noite", caption: "A noite de sábado foi feita para momentos especiais. E nada mais especial que uma pizza quentinha com quem você ama. ❤️🍕 #SabadoANoite #PizzaComAmor #Momentos" },
    { title: "Domingo (Preguiça Boa)", caption: "Domingo é o dia oficial da preguiça. Cozinhar pra quê? Peça sua pizza favorita e curta o fim do dia sem preocupações. #Domingo #Preguica #PizzaEmCasa" },
    
    // Engajamento e Interação (10)
    { title: "Enquete de Sabores", caption: "BATALHA DE SABORES! ⚔️ Qual vence essa disputa: Calabresa ou Quatro Queijos? Vote nos comentários e vamos ver qual é a favorita da galera! #BatalhaDeSabores #Enquete #TeamCalabresa #TeamQuatroQueijos" },
    { title: "Complete a Frase", caption: "Complete a frase: 'Uma pizza perfeita precisa ter ____'. Queremos saber o que não pode faltar na sua! As respostas mais criativas ganham um cupom! 😉 #CompleteAFrase #PizzaPerfeita #Interacao" },
    { title: "Foto do Cliente (Repost)", caption: "A gente AMA ver vocês felizes com nossas pizzas! ❤️ Essa foto incrível é do(a) @[marcar cliente]. Faça como ele(a), poste sua foto com a #NossaHashtag e apareça aqui! #ClienteFeliz #PizzaLovers" },
    { title: "Dica de Harmonização", caption: "Dica do chef: nossa pizza de [Sabor] harmoniza perfeitamente com um [Tipo de Vinho/Cerveja]. Que tal experimentar essa combinação hoje? 🍷🍺 #DicaDoChef #Harmonizacao #PizzaEVinho" },
    { title: "Meme de Pizza", caption: "Eu depois de comer a primeira fatia da pizza da D'Italia. (Use uma imagem de meme popular). Quem mais se identifica? 😂 #Meme #PizzaMeme #Humor" },
    { title: "Pizza para Cada Signo", caption: "A pizza de cada signo! ♈ Áries: apimentada. ♉ Touro: 4 queijos. ♊ Gêmeos: metade de cada. Qual é a sua? Comenta aí! #Astrologia #Signos #PizzaDosSignos" },
    { title: "Desafio: Montar a Pizza", caption: "Se você pudesse montar uma pizza com 3 ingredientes, quais seriam? Deixe sua combinação nos comentários! Quem sabe ela não vira um sabor especial por um dia? 🤔 #Desafio #MonteSuaPizza" },
    { title: "Descreva em 3 Emojis", caption: "Descreva a sua fome de pizza agora mesmo usando apenas 3 emojis! Os nossos são: 🤤🏃‍♂️🍕. Valendo! #EmojiChallenge #FomeDePizza" },
    { title: "Primeira Letra do Nome", caption: "Qual sabor de pizza você pediria usando apenas a primeira letra do seu nome? Deixe sua criatividade fluir nos comentários! #Brincadeira #PizzaChallenge" },
    { title: "Essa ou Aquela?", caption: "Guerra de Clássicos: Borda tradicional ou Borda Recheada? Não vale ficar em cima do muro! Vote! #BatalhaDeBordas #PizzaLovers #Enquete" },

    // Foco no Produto e Vendas (12)
    { title: "Foco na Borda Recheada", caption: "Você já provou nossa borda recheada de [Sabor da Borda]? É um espetáculo à parte! Peça a sua com esse upgrade de sabor. 🤤 #BordaRecheada #Queijo #ExtraSabor" },
    { title: "Lançamento de Sabor", caption: "NOVO SABOR NA ÁREA! ✨ Apresentamos a incrível pizza de [Nome do Novo Sabor]. Uma combinação de [Ingredientes] que vai te surpreender. Peça a sua e conte pra gente o que achou! #Lancamento #NovoSabor" },
    { title: "A Mais Pedida", caption: "Essa é a campeã de pedidos! 🏆 A nossa pizza de [Sabor Mais Pedido] é a prova de que o clássico nunca sai de moda. Já pediu a sua hoje? #AMaisPedida #CampeãDeVendas #Sucesso" },
    { title: "Foco em Bebidas", caption: "Pizza boa pede uma bebida gelada! 🥤 Já conferiu nossa seleção de refrigerantes e sucos? Adicione sua bebida favorita ao pedido e deixe tudo perfeito. #BebidaGelada #PizzaEGuarana" },
    { title: "Benefícios de Pedir em Casa", caption: "Vantagens de pedir D'Italia em casa: 1. Não precisa lavar louça. 2. Come de pijama. 3. Felicidade instantânea. Precisa de mais motivos? 😉 #Delivery #Conforto #FicaEmCasa" },
    { title: "Foco no Queijo Puxando", caption: "Aquele momento que a gente vive pra ver. 🧀🤤 Marque alguém que precisa ver essa cena hoje! #QueijoPuxando #CheesePull #Satisfatorio" },
    { title: "Para os Indecisos", caption: "Na dúvida entre dois sabores? Peça uma pizza meio a meio e seja feliz em dobro! 😄 #MeioAMeio #Indecisos #Solucao" },
    { title: "Cupom Relâmpago (Stories)", caption: "CUPOM RELÂMPAGO! ⚡ Os 10 primeiros que usarem o código 'PIZZAFLASH' no nosso site ganham 15% de desconto. Válido só por 1 hora! CORRE! #CupomRelampago #Desconto" },
    { title: "Vegetariana do Dia", caption: "Quem disse que pizza vegetariana não é incrível? 🌱 Nossa [Nome da Pizza Veg] é cheia de sabor e ingredientes frescos. Já provou? #Vegetariana #PizzaVeg #SaborSemCarne" },
    { title: "Para os Amantes de Doce", caption: "Guarde um espacinho para a sobremesa! 😋 Nossa pizza doce de [Sabor] é o final perfeito para a sua refeição. #PizzaDoce #Sobremesa #Chocolate" },
    { title: "A pedida pra galera", caption: "Vai reunir a galera? Pizza é a resposta! Faça seu pedido em quantidade e garanta a alegria de todo mundo. Consulte nossos combos para grupos! #PizzaPraGalera #Amigos #Festa" },
    { title: "Calzone: O Tesouro Escondido", caption: "Você sabia que nosso cardápio tem calzones incríveis? É a mesma qualidade da nossa pizza, mas com o recheio guardado a sete chaves. Peça o seu! #Calzone #Recheio #Segredo" },
    
    // Institucional e Bastidores (11)
    { title: "Bastidores (Ingredientes)", caption: "O segredo do nosso sabor está na qualidade. 🍅 Usamos apenas ingredientes frescos e selecionados para garantir que cada fatia seja inesquecível. #IngredientesFrescos #Qualidade #FeitoComAmor" },
    { title: "História da Pizzaria", caption: "Você sabia? A D'Italia nasceu do sonho de [contar um pequeno trecho da sua história]. Cada pizza que sai do nosso forno carrega um pedaço desse carinho. Obrigado por fazer parte disso! ❤️ #NossaHistoria #Pizzaria" },
    { title: "Agradecimento aos Clientes", caption: "Nossa maior alegria é fazer parte dos seus momentos. Obrigado por escolher a D'Italia Pizzaria para fazer sua noite mais feliz! 🙏❤️ #Gratidao #Clientes" },
    { title: "Funcionamento e Contato", caption: "Já estamos a todo vapor! 🔥 Peça sua pizza das 18h às 23h. 📞 WhatsApp: [Seu Número] | 💻 Site: [Link na Bio]. #HorarioDeFuncionamento #Delivery" },
    { title: "Convidando para Seguir", caption: "Gostou do que viu? Siga nosso perfil para não perder nenhuma novidade, promoção ou delícia que postamos por aqui! 😉 #SigaNos #Novidades" },
    { title: "Conheça o Pizzaiolo", caption: "Conheça o mestre por trás da magia! ✨ Este é o [Nome do Pizzaiolo], o responsável por transformar ingredientes em pura felicidade. Dê um oi pra ele nos comentários! #Pizzaiolo #NossaEquipe #Bastidores" },
    { title: "Nossa Equipe de Entrega", caption: "Eles voam pelas ruas pra levar sua pizza quentinha até você! 🛵💨 Um salve para nossa incrível equipe de entregadores! #EquipeDeEntrega #DeliveryRapido #HeróisDaNoite" },
    { title: "Higiene e Cuidado", caption: "Sua segurança é nossa prioridade. Seguimos todos os protocolos de higiene para que você possa aproveitar sua pizza com tranquilidade e confiança. #SegurancaAlimentar #Cuidado #Confianca" },
    { title: "Estamos no iFood/App", caption: "Além do nosso site e WhatsApp, você também nos encontra no [iFood/outro app]! Procure por D'Italia Pizzaria e faça seu pedido. #iFood #AppDeDelivery" },
    { title: "Compromisso com a Cidade", caption: "Somos daqui, de Caçapava com orgulho! ❤️ Agradecemos a todos da nossa cidade por nos receberem tão bem e fazerem parte da nossa história. #Caçapava #OrgulhoLocal #ComercioLocal" },
    { title: "Avalie nosso Atendimento", caption: "Sua opinião é muito importante! Já nos avaliou no Google? Sua avaliação nos ajuda a crescer e a melhorar sempre. O link está em nosso perfil! ⭐⭐⭐⭐⭐ #Avaliacao #Feedback #GoogleReviews" },

    // Sazonal e Datas Comemorativas (10)
    { title: "Dia dos Namorados", caption: "Declare seu amor em fatias! ❤️🍕 Surpreenda seu par com uma noite especial e a melhor pizza da cidade. O amor está no ar... e no forno! #DiaDosNamorados #JantarRomantico #PizzaEAmor" },
    { title: "Festa Junina / Julina", caption: "Arraiá em casa? Bão demais, sô! 🤠 E pra ficar mió ainda, só com uma pizza da D'Italia pra acompanhar a festança. Anarriê! #FestaJunina #PizzaNoArraia #ComidaTipica" },
    { title: "Inverno / Frio", caption: "O friozinho chegou e a pedida perfeita é uma pizza quentinha no conforto do seu lar. 🥶🍕 Peça a sua e se aqueça com muito sabor! #Inverno #NoiteFria #ComidaDeInverno" },
    { title: "Verão / Calor", caption: "Verão combina com praticidade! Deixe o fogão de lado e peça uma pizza leve e saborosa para aproveitar a noite. ☀️ #Verão #NoiteDeVerao #PizzaLeve" },
    { title: "Dia das Mães", caption: "Hoje, a rainha da casa não vai para a cozinha! 👑 Surpreenda sua mãe com um jantar especial da D'Italia. Ela merece todo o sabor e carinho do mundo. #DiaDasMaes #AlmocoDeMae #AmorDeMae" },
    { title: "Dia dos Pais", caption: "O paizão merece o melhor! Que tal comemorar o dia dele com a pizza que ele mais ama? Faça seu pedido e celebre em família. #DiaDosPais #PresenteParaPai #PaiHeroi" },
    { title: "Natal / Fim de Ano", caption: "Na correria das festas de fim de ano, deixe a janta com a gente! 🎄🍕 Uma pausa saborosa para recarregar as energias. Boas festas! #Natal #FimDeAno #Ceia" },
    { title: "Halloween", caption: "Gostosuras ou travessuras? Na D'Italia, a gente garante as gostosuras! 🎃👻 Peça sua pizza e tenha uma noite de Halloween deliciosamente assustadora. #Halloween #GostosurasOuTravessuras" },
    { title: "Dia da Pizza (10 de Julho)", caption: "HOJE É O DIA DELA! 🥳 Dia 10 de Julho, Dia da Pizza! E para comemorar, todas as pizzas com 10% de desconto. Venha celebrar com a gente! #DiaDaPizza #PizzaDay #Comemoracao" },
    { title: "Black Friday", caption: "BLACK FRIDAY D'ITALIA! 🖤🍕 Fique de olho nas nossas ofertas imperdíveis que vão rolar durante a semana. Ative as notificações para não perder nada! #BlackFriday #Descontos #PizzaBarata" },

    // Conteúdo Adicional (50 novas ideias)
    { title: "O poder do orégano", caption: "Você sabia que o orégano não é só para dar sabor? Ele tem propriedades antioxidantes! Mais um motivo para amar sua pizza. #Orégano #Curiosidades #Ingredientes" },
    { title: "Massa: Fina ou Grossa?", caption: "A eterna dúvida: você prefere massa fina e crocante ou grossa e macia? Conta pra gente qual é a sua favorita! #MassaDePizza #Enquete #Crocante" },
    { title: "Para os amantes de pimenta", caption: "Gosta de um sabor picante? 🌶️ Peça nosso azeite apimentado e dê aquele toque especial na sua pizza. #Pimenta #Picante #SaborIntenso" },
    { title: "A história da Calabresa", caption: "Um clássico é um clássico! A pizza de calabresa é uma das mais amadas no Brasil. Sabia que ela é uma invenção brasileira? #Calabresa #PizzaBrasileira #História" },
    { title: "Planeje sua festa", caption: "Planejando um aniversário ou uma reunião? Deixe a comida por nossa conta! Entre em contato para pedidos grandes e condições especiais. #FestaComPizza #Aniversario #Eventos" },
    { title: "Meia a Meia Perfeita", caption: "A arte de combinar dois sabores em uma só pizza. Qual é a sua dupla de 'meia a meia' perfeita? Compartilhe suas ideias! #MeioAMeio #CombinaçãoPerfeita" },
    { title: "O cheiro inconfundível", caption: "Aquele cheirinho de pizza saindo do forno que melhora qualquer dia. Já sentiu hoje? #CheiroDePizza #Felicidade #Aroma" },
    { title: "Combate à fome da madrugada", caption: "Aquela fome que bate fora de hora? Estamos aqui pra resolver! Confira nosso horário e peça sua pizza. #FomeNaMadrugada #DeliveryNoturno" },
    { title: "Pizza e Trabalho", caption: "Trabalhando até mais tarde? Dê um gás na sua produtividade com uma pausa para a melhor pizza. Você merece! #PizzaNoTrabalho #Pausa #Energia" },
    { title: "Presenteie com Pizza", caption: "Quer alegrar o dia de alguém? Mande uma pizza de presente! É a prova de amizade e carinho mais saborosa que existe. #PresenteCriativo #Surpresa" },
    { title: "O dilema da última fatia", caption: "A última fatia: se divide ou quem viu primeiro leva? Marque aqui quem sempre pega o último pedaço! 😂 #UltimaFatia #Brincadeira #Amigos" },
    { title: "Nossa gratidão", caption: "Cada pedido é uma nova história. Somos muito gratos por fazer parte das suas noites. Obrigado pela confiança! #Gratidão #Comunidade" },
    { title: "Foco no molho de tomate", caption: "A base de tudo: nosso molho de tomate é feito com tomates selecionados e um tempero especial da casa. Sinta a diferença! #MolhoDeTomate #ReceitaSecreta" },
    { title: "Pizza fria no dia seguinte?", caption: "O café da manhã dos campeões! Quem aí também ama uma fatia de pizza fria no dia seguinte? Confesse! 😋 #PizzaFria #CaféDaManhã" },
    { title: "Como reaquecer sua pizza", caption: "Dica de ouro: para sua pizza parecer que acabou de sair do forno, reaqueça na frigideira! Fica crocante e deliciosa. #Dica #ReaquecerPizza" },
    { title: "A importância do forno", caption: "Nosso forno trabalha em alta temperatura para garantir uma massa perfeitamente assada e um queijo derretido no ponto certo. 🔥 #FornoDePizza #Segredo" },
    { title: "Pedido para a família toda", caption: "Tem pizza para todos os gostos! Da criançada aos avós, nosso cardápio tem o sabor que agrada a família inteira. #PizzaEmFamilia #JantarDeFamilia" },
    { title: "Dia do Amigo", caption: "Feliz Dia do Amigo! E para comemorar, que tal uma pizza? Marque seus amigos e combine a celebração! #DiaDoAmigo #Amizade" },
    { title: "Nosso compromisso com a entrega", caption: "Trabalhamos para que sua pizza chegue quentinha e perfeita. Nossa equipe de entrega é treinada para ter o máximo cuidado com seu pedido. #EntregaDeQualidade" },
    { title: "A pizza que abraça", caption: "Tem dias que a gente só precisa de um abraço... em forma de pizza. Peça a sua e sinta esse conforto. #ComfortFood #ComidaQueAbraca" },
    { title: "Sabor que te transporta", caption: "Feche os olhos e sinta o sabor da Itália. Nossas receitas são inspiradas na tradição para te levar em uma viagem de sabores. 🇮🇹 #SaborDaItalia #TradicaoItaliana" },
    { title: "Fim de mês", caption: "Fim de mês apertado mas a vontade de pizza é grande? Fique de olho nas nossas promoções e cupons! #FimDeMes #Economia" },
    { title: "Use nosso App/Site", caption: "Já experimentou pedir pelo nosso site/app? É mais rápido, fácil e você ainda participa do nosso programa de fidelidade! #Tecnologia #AppDeDelivery" },
    { title: "Programa de Fidelidade", caption: "Aqui, sua fidelidade vira pizza! 🍕 A cada pedido, você acumula pontos para trocar por descontos. Já conferiu quantos pontos você tem? #Fidelidade #Pontos #Desconto" },
    { title: "Pizza e Netflix", caption: "O 'match' perfeito para sua noite. Qual série você está maratonando com a sua D'Italia hoje? #PizzaeNetflix #MaratonaDeSeries" },
    { title: "O clássico: Margherita", caption: "Simples, clássica e perfeita. A pizza Margherita é a rainha das pizzas e uma homenagem à Itália. Peça esse clássico! #Margherita #PizzaClassica" },
    { title: "Ouse no sabor!", caption: "Que tal sair da rotina hoje? Experimente um sabor que você nunca pediu! Navegue pelo nosso cardápio e descubra novas paixões. #Experimente #NovosSabores" },
    { title: "Para os fortes: Pizza de Alho", caption: "Para quem não tem medo de um sabor marcante! Nossa pizza de alho é para os fortes. E aí, encara? 😉 #PizzaDeAlho #SaborForte" },
    { title: "O Doce e o Salgado", caption: "Quem disse que não pode ter os dois? Comece com sua pizza salgada favorita e finalize com uma de nossas delícias doces. #DoceESalgado #Sobremesa" },
    { title: "O que dizem sobre nós", caption: "'A entrega foi super rápida e a pizza estava divina!' - [Nome do Cliente]. Adoramos o seu feedback! Deixe sua avaliação também. #Depoimento #ClienteSatisfeito" },
    { title: "Seu pedido está a caminho!", caption: "Só para te deixar com mais vontade: seu pedido já está sendo preparado e logo logo chega aí! 😉 Acompanhe o status em tempo real no nosso site. #StatusDoPedido #AoVivo" },
    { title: "A pizza da sua selfie", caption: "Nossas pizzas não são só gostosas, são fotogênicas! Poste uma selfie com a sua e marque a gente! 📸 #PizzaGram #Instafood" },
    { title: "Borda infinita", caption: "Para os amantes de borda, aqui ela é sempre generosa e crocante. Qual a sua parte favorita da pizza? #Borda #Crocante" },
    { title: "Aniversário na D'Italia", caption: "Fazendo aniversário? Comemore com a gente! Pedidos acima de [valor] ganham um [brinde/desconto] especial. #Aniversario #Comemoracao" },
    { title: "Dia chuvoso", caption: "A chuva lá fora, e o cheirinho de pizza aqui dentro. O cenário perfeito! Peça seu delivery. #Chuva #Delivery" },
    { title: "Pré-balada", caption: "O esquenta perfeito para a sua noite começa aqui! Reúna os amigos para uma pizza antes da festa. #Esquenta #PreBalada" },
    { title: "Feriado", caption: "Feriado é sinônimo de descanso. E descanso combina com pizza! Estamos funcionando normalmente hoje. #Feriado #PizzaNoFeriado" },
    { title: "O debate do abacaxi", caption: "Vamos resolver isso de uma vez por todas: abacaxi na pizza, sim ou não? Comente sua opinião! 🍍 #AbacaxiNaPizza #Debate" },
    { title: "Para os veganos", caption: "Temos opções deliciosas para todos! Conheça nossa pizza vegana, feita com queijo à base de plantas e muito sabor. #Vegano #PizzaVegana" },
    { title: "Seu conforto em uma caixa", caption: "Mais que uma refeição, uma caixa cheia de conforto e sabor esperando por você. Peça seu momento D'Italia. #Conforto #Carinho" },
    { title: "Atenção aos detalhes", caption: "Do corte preciso dos ingredientes à embalagem cuidadosa, pensamos em cada detalhe para sua experiência ser perfeita. #Detalhes #Qualidade" },
    { title: "Contra a fome de segunda", caption: "A gente sabe que a segunda pode ser difícil. Mas ela fica bem melhor quando termina em pizza. #XôSegunda #PizzaTerapia" },
    { title: "O poder da mussarela", caption: "A base de quase tudo, nossa mussarela é de alta qualidade, garantindo aquele derretimento perfeito e sabor inigualável. #Mussarela #Queijo" },
    { title: "Final de expediente", caption: "Fim do expediente, começo do relaxamento. Deixe a gente cuidar do seu jantar hoje. Você merece. #FimDeExpediente #Relax" },
    { title: "Um presente para você", caption: "Às vezes, a gente precisa se presentear. E qual presente é melhor que uma pizza quentinha? #Mimo #AutoCuidado" },
    { title: "A escolha da família", caption: "Quando a família não consegue decidir o que comer, a pizza une todo mundo! Peça vários sabores e agrade a todos. #Familia #Uniao" },
    { title: "Sabor local", caption: "Apoiando o comércio local, você fortalece nossa cidade e ainda come a melhor pizza! Obrigado por escolher a gente. #ComercioLocal #Caçapava" },
    { title: "Acompanhe nosso trabalho", caption: "Quer ver mais dos nossos bastidores e promoções? Ative as notificações do nosso perfil e não perca nada! #Notificações #FiquePorDentro" },
    { title: "Peça e retire", caption: "Passando perto da gente? Faça seu pedido pelo site ou WhatsApp e escolha a opção 'Retirar no Balcão' para não pegar fila! #PeçaERetire #Praticidade" },
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
    
    if (ideasListContainer) {
        ideasListContainer.innerHTML = CAPTION_IDEAS.map(idea => `
            <div class="idea-item">
                <h4>${idea.title}</h4>
                <p>${idea.caption.replace(/\n/g, "<br>")}</p>
                <button class="btn btn-sm btn-primary use-caption-btn">Usar esta legenda</button>
            </div>
        `).join('<hr class="idea-separator">');
    }

    if (openIdeasBtn) {
        openIdeasBtn.addEventListener('click', () => ideasModal.classList.add('show'));
    }
    if (ideasModal) {
        ideasModal.querySelector('.close-modal-btn').addEventListener('click', () => ideasModal.classList.remove('show'));
    }

    ideasListContainer.querySelectorAll('.use-caption-btn').forEach((button, index) => {
        button.addEventListener('click', () => {
            postCaptionInput.value = CAPTION_IDEAS[index].caption;
            ideasModal.classList.remove('show');
            postCaptionInput.focus();
        });
    });

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
        if (postId) {
            await updateDoc(doc(window.db, MARKETING_COLLECTION, postId), postData);
            window.showToast("Agendamento atualizado!", "success");
        } else {
            await addDoc(collection(window.db, MARKETING_COLLECTION), postData);
            window.showToast("Post agendado com sucesso!", "success");
        }
        
        marketingForm.reset();
        formTitle.textContent = "Agendar Nova Postagem";
        postIdInput.value = '';
        cancelEditBtn.classList.add('hidden');
    });

    cancelEditBtn.addEventListener('click', () => {
        marketingForm.reset();
        formTitle.textContent = "Agendar Nova Postagem";
        postIdInput.value = '';
        cancelEditBtn.classList.add('hidden');
    });

    loadScheduledPosts();
}

window.initializeMarketingSection = initializeMarketingSection;