// roulette.js - VERSÃO CORRIGIDA (APENAS DESENHA E GIRA)

// Variáveis que precisam ser acessíveis por todo o script
let theWheel = null;
let isSpinning = false;

// Configuração de prêmios e cores
const prizes = [
   {'fillStyle' : '#ea1d2c', 'text' : '5% OFF', 'textFillStyle': '#ffffff'},
   {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo', 'textFillStyle': '#3f3f3f'},
   {'fillStyle' : '#FFD700', 'text' : 'Borda Grátis', 'textFillStyle': '#3f3f3f'},
   {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo', 'textFillStyle': '#3f3f3f'},
   {'fillStyle' : '#ea1d2c', 'text' : '10% OFF', 'textFillStyle': '#ffffff'},
   {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo', 'textFillStyle': '#3f3f3f'},
   {'fillStyle' : '#FFD700', 'text' : 'Refri Grátis', 'textFillStyle': '#3f3f3f'},
   {'fillStyle' : '#ffffff', 'text' : 'Tente de Novo', 'textFillStyle': '#3f3f3f'}
];

// Função que cria e desenha a roleta
function initializeAndDrawWheel() {
    const canvas = document.getElementById('prize-wheel');
    if (!canvas) {
        console.error("Elemento canvas 'prize-wheel' não foi encontrado.");
        return;
    }

    // Destrói a roleta antiga se existir, para evitar bugs
    if (theWheel) {
        theWheel.stopAnimation(false);
        theWheel = null;
    }

    theWheel = new Winwheel({
        'canvasId'    : 'prize-wheel',
        'numSegments' : prizes.length,
        'outerRadius' : 145,
        'textFontSize': 16,
        'segments'    : prizes,
        'animation'   : {
            'type'     : 'spinToStop',
            'duration' : 7,
            'spins'    : 10,
            'callbackFinished' : handlePrizeAwarded,
            'callbackAfter' : () => { isSpinning = false; }
        }
    });
}

// Função para iniciar o giro
function startSpin() {
    if (isSpinning) return;
    if (theWheel) {
        isSpinning = true;
        theWheel.startAnimation();
    } else {
        alert("Erro ao iniciar a roleta.");
    }
}

// Função para lidar com o prêmio
function handlePrizeAwarded(indicatedSegment) {
    const prizeText = indicatedSegment.text;
    if (prizeText !== 'Tente de Novo') {
        alert(`Parabéns! Você ganhou: ${prizeText}!`);
    } else {
        alert('Não foi dessa vez! Tente novamente na próxima semana.');
    }
    updateLastSpinTime();
    document.getElementById('close-roulette-modal')?.click(); // Fecha o modal
}

// Função para salvar a data do giro no Firestore
async function updateLastSpinTime() {
    const customerId = window.currentCustomerDetails?.id;
    if (!customerId || !window.db || !window.firebaseFirestore) return;
    const { doc, updateDoc, serverTimestamp } = window.firebaseFirestore;
    const customerRef = doc(window.db, "customer", customerId);
    try {
        await updateDoc(customerRef, { lastSpinTimestamp: serverTimestamp() });
        if (window.currentCustomerDetails) {
            window.currentCustomerDetails.lastSpinTimestamp = new Date();
        }
    } catch (error) {
        console.error("Erro ao salvar a data do giro:", error);
    }
}

// Event listener para o botão de girar
const spinButton = document.getElementById('spin-button');
if (spinButton) {
    spinButton.addEventListener('click', startSpin);
}

// Expõe a função principal de desenho para ser chamada pelo loyalty.js
window.setupRouletteDrawing = initializeAndDrawWheel;
