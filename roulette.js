// roulette.js - MODO DE TESTE FORÇADO (SEMPRE MOSTRAR NO CARREGAMENTO)

/*
    AVISO: Este script vai forçar a roleta a abrir em todo carregamento de página.
    Ele IGNORA o status de login e a regra dos 7 dias.
    Use apenas para testes visuais da roleta.
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis da Roleta ---
    let theWheel = null;
    let isSpinning = false;

    // --- Configuração de Prêmios ---
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

    // --- Funções da Roleta ---
    function initializeAndDrawWheel() {
        const canvas = document.getElementById('prize-wheel');
        if (!canvas) {
            console.error("Canvas da roleta não encontrado.");
            return;
        }

        if (theWheel) { theWheel.stopAnimation(false); theWheel = null; }

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
                'callbackFinished' : () => {
                    alert('Roleta parou! (Lógica de prêmio desativada em modo de teste)');
                    isSpinning = false;
                },
                'callbackAfter' : () => { isSpinning = false; }
            }
        });
    }

    function startSpin() {
        if (isSpinning) return;
        if (theWheel) { isSpinning = true; theWheel.startAnimation(); }
    }
    
    function showRoulette() {
        const rouletteModal = document.getElementById('roulette-modal');
        if (rouletteModal) {
            rouletteModal.style.setProperty('display', 'flex', 'important');
            initializeAndDrawWheel();
        }
    }

    function closeRouletteModal() {
        const rouletteModal = document.getElementById('roulette-modal');
        if (rouletteModal) rouletteModal.style.display = 'none';
    }

    // --- Listeners para os botões internos do modal ---
    const spinButton = document.getElementById('spin-button');
    const closeRouletteModalBtn = document.getElementById('close-roulette-modal');
    if (spinButton) spinButton.addEventListener('click', startSpin);
    if (closeRouletteModalBtn) closeRouletteModalBtn.addEventListener('click', closeRouletteModal);
    
    // --- Lógica Principal: Forçar abertura da roleta ao carregar a página ---
    // Usamos um pequeno atraso para garantir que a página "respirou"
    setTimeout(showRoulette, 1000); // Mostra a roleta 1 segundo após a página carregar

});
