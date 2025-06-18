// roulette.js - Lógica para a Roleta de Prêmios

// Função principal que será executada quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO DA ROLETA ---
    // Você pode alterar os prêmios e cores aqui!
    const prizes = [
       {'fillStyle' : '#fceceb', 'text' : '5% OFF'},
       {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo'},
       {'fillStyle' : '#f9e0de', 'text' : 'Borda Grátis'},
       {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo'},
       {'fillStyle' : '#fceceb', 'text' : '10% OFF'},
       {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo'},
       {'fillStyle' : '#f9e0de', 'text' : 'Refri Grátis'},
       {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo'}
    ];

    // --- VARIÁVEIS GLOBAIS DO MÓDULO ---
    let theWheel = null; // Objeto da roleta
    let isSpinning = false; // Flag para controlar se a roleta está girando
    
    const spinButton = document.getElementById('spin-button');
    const rouletteModal = document.getElementById('roulette-modal');
    const closeRouletteModalBtn = document.getElementById('close-roulette-modal');

    // Função para inicializar e desenhar a roleta
    function initializeWheel() {
        if (document.getElementById('prize-wheel')) {
            theWheel = new Winwheel({
                'numSegments'  : prizes.length,
                'outerRadius'  : 145,
                'textFontSize' : 16,
                'segments'     : prizes,
                'animation' : {
                    'type'     : 'spinToStop',
                    'duration' : 7,  // Duração do giro em segundos
                    'spins'    : 10, // Quantidade de voltas
                    'callbackFinished' : handlePrizeAwarded,
                    'callbackAfter' : () => { isSpinning = false; } // Permite girar de novo após a animação
                }
            });
        }
    }
    
    // Função chamada quando a roleta para de girar
    function handlePrizeAwarded(indicatedSegment) {
        const prizeText = indicatedSegment.text;
        
        if (prizeText !== 'Tente de Novo') {
            alert(`Parabéns! Você ganhou: ${prizeText}! O prêmio será aplicado no seu próximo pedido.`);
            // AQUI, no futuro, podemos adicionar lógica para salvar o prêmio como um cupom.
            // Por enquanto, apenas registramos que o usuário girou.
        } else {
            alert('Não foi dessa vez! Tente novamente na próxima semana.');
        }

        updateLastSpinTime(); // Salva a data do giro no Firestore
        closeRouletteModal();
    }
    
    // Função que efetivamente gira a roleta
    function startSpin() {
        if (!isSpinning) {
            isSpinning = true;
            if (!theWheel) { // Inicializa a roleta na primeira vez que for girar
                initializeWheel();
            }
            theWheel.startAnimation();
        }
    }
    
    // Função para salvar a data do giro no Firestore
    async function updateLastSpinTime() {
        const customerId = window.currentCustomerDetails?.id;
        if (!customerId || !window.db || !window.firebaseFirestore) return;

        const { doc, updateDoc, serverTimestamp } = window.firebaseFirestore;
        const customerRef = doc(window.db, "customer", customerId);

        try {
            await updateDoc(customerRef, {
                lastSpinTimestamp: serverTimestamp()
            });
            console.log("Data do giro da roleta salva para o cliente:", customerId);
            // Atualiza os dados locais para refletir a mudança
            window.currentCustomerDetails.lastSpinTimestamp = new Date(); 
        } catch (error) {
            console.error("Erro ao salvar a data do giro:", error);
        }
    }

    // --- FUNÇÕES DE CONTROLE DO MODAL ---
    function openRouletteModal() {
        if (rouletteModal) {
            // Inicializa a roleta SÓ QUANDO o modal for aberto pela primeira vez
            if (!theWheel) { 
                initializeWheel();
            }
            rouletteModal.style.display = 'flex';
        }
    }

    function closeRouletteModal() {
        if (rouletteModal) {
            rouletteModal.style.display = 'none';
        }
    }
    
    // --- LÓGICA PRINCIPAL DE VERIFICAÇÃO ---
    // Esta função será exposta globalmente para ser chamada pelo loyalty.js
    window.checkSpinEligibility = () => {
        const customer = window.currentCustomerDetails;

        // Se o cliente não estiver logado, não faz nada
        if (!customer) return;
        
        const lastSpin = customer.lastSpinTimestamp?.toDate(); // Converte o timestamp do Firestore para uma data JS

        if (!lastSpin) {
            // Nunca girou, então mostra a roleta
            console.log("Cliente nunca girou. Mostrando roleta.");
            openRouletteModal();
        } else {
            const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
            const timeSinceLastSpin = new Date().getTime() - lastSpin.getTime();

            if (timeSinceLastSpin > sevenDaysInMillis) {
                // Já se passaram 7 dias, mostra a roleta
                console.log("Mais de 7 dias desde o último giro. Mostrando roleta.");
                openRouletteModal();
            } else {
                // Ainda não pode girar
                console.log("Ainda não se passaram 7 dias desde o último giro.");
            }
        }
    };

    // --- EVENT LISTENERS ---
    if (spinButton) spinButton.addEventListener('click', startSpin);
    if (closeRouletteModalBtn) closeRouletteModalBtn.addEventListener('click', closeRouletteModal);

});