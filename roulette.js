// roulette.js - VERSÃO CORRIGIDA PARA PROBLEMA DE RENDERIZAÇÃO (clearRect)

document.addEventListener('DOMContentLoaded', () => {

// roulette.js - No topo do arquivo

// --- CONFIGURAÇÃO DA ROLETA (VERSÃO COLORIDA) ---
// Você pode alterar os prêmios e cores aqui!
const prizes = [
   // Usando o vermelho principal do seu site e um amarelo-dourado
   {'fillStyle' : '#ea1d2c', 'text' : '5% OFF', 'textFillStyle': '#ffffff'},         // Fatia Vermelha com texto branco
   {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo', 'textFillStyle': '#3f3f3f'}, // Fatia Branca com texto escuro
   {'fillStyle' : '#FFD700', 'text' : 'Borda Grátis', 'textFillStyle': '#3f3f3f'},  // Fatia Amarela com texto escuro
   {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo', 'textFillStyle': '#3f3f3f'}, // Fatia Branca
   {'fillStyle' : '#ea1d2c', 'text' : '10% OFF', 'textFillStyle': '#ffffff'},        // Fatia Vermelha
   {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo', 'textFillStyle': '#3f3f3f'}, // Fatia Branca
   {'fillStyle' : '#FFD700', 'text' : 'Refri Grátis', 'textFillStyle': '#3f3f3f'}, // Fatia Amarela
   {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo', 'textFillStyle': '#3f3f3f'}  // Fatia Branca
];

    // --- VARIÁVEIS GLOBAIS DO MÓDULO ---
    let theWheel = null;
    let isSpinning = false;
    
    const spinButton = document.getElementById('spin-button');
    const rouletteModal = document.getElementById('roulette-modal');
    const closeRouletteModalBtn = document.getElementById('close-roulette-modal');

    // --- FUNÇÕES DA ROLETA ---

    function initializeWheel() {
        // Se já existe uma roleta, para qualquer animação e a destrói para criar uma nova
        if (theWheel) {
            theWheel.stopAnimation(false);
            theWheel = null;
        }

        // Garante que o elemento canvas existe antes de tentar criar a roleta
        const canvas = document.getElementById('prize-wheel');
        if (canvas) {
            theWheel = new Winwheel({
                'canvasId': 'prize-wheel',
                'numSegments'  : prizes.length,
                'outerRadius'  : 145,
                'textFontSize' : 16,
                'textFillStyle': '#3f3f3f',
                'segments'     : prizes,
                'animation' : {
                    'type'     : 'spinToStop',
                    'duration' : 7,
                    'spins'    : 10,
                    'callbackFinished' : handlePrizeAwarded,
                    'callbackAfter' : () => { isSpinning = false; }
                }
            });
        } else {
            console.error("Elemento <canvas id='prize-wheel'> não foi encontrado no DOM.");
        }
    }
    
    function handlePrizeAwarded(indicatedSegment) {
        const prizeText = indicatedSegment.text;
        
        if (prizeText !== 'Tente de Novo') {
            alert(`Parabéns! Você ganhou: ${prizeText}!`);
        } else {
            alert('Não foi dessa vez! Tente novamente na próxima semana.');
        }

        updateLastSpinTime();
        closeRouletteModal();
    }
    
    function startSpin() {
        if (isSpinning) return;

        if (theWheel) {
            isSpinning = true;
            theWheel.startAnimation();
        } else {
            alert("Erro ao iniciar a roleta. Por favor, feche e abra novamente.");
        }
    }
    
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
            if(window.currentCustomerDetails) {
                 window.currentCustomerDetails.lastSpinTimestamp = new Date(); 
            }
        } catch (error) {
            console.error("Erro ao salvar a data do giro:", error);
        }
    }

    // --- FUNÇÕES DE CONTROLE DO MODAL ---
    
    function openRouletteModal() {
        if (rouletteModal) {
            rouletteModal.style.display = 'flex';
            // **A CORREÇÃO ESTÁ AQUI**: A roleta é recriada toda vez que o modal abre,
            // garantindo que o canvas já esteja visível e pronto.
            initializeWheel();
        }
    }

    function closeRouletteModal() {
        if (rouletteModal) {
            rouletteModal.style.display = 'none';
        }
    }
    
    // --- LÓGICA PRINCIPAL DE VERIFICAÇÃO ---
    window.checkSpinEligibility = () => {
        const customer = window.currentCustomerDetails;
        if (!customer) return;
        
        const lastSpin = customer.lastSpinTimestamp?.toDate();

        if (!lastSpin) {
            openRouletteModal();
        } else {
            const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
            const timeSinceLastSpin = new Date().getTime() - lastSpin.getTime();

            if (timeSinceLastSpin > sevenDaysInMillis) {
                openRouletteModal();
            } else {
                console.log("Cliente já girou a roleta nesta semana.");
            }
        }
    };

    // --- EVENT LISTENERS ---
    if (spinButton) spinButton.addEventListener('click', startSpin);
    if (closeRouletteModalBtn) closeRouletteModalBtn.addEventListener('click', closeRouletteModal);
});
