// roulette.js - VERSÃO DEFINITIVA (Modo de Teste Forçado)

document.addEventListener('DOMContentLoaded', () => {
    // AVISO: Este script força a roleta a abrir 1 segundo após o carregamento da página.

    let theWheel = null;
    let isSpinning = false;

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

    function initializeAndDrawWheel() {
        const canvas = document.getElementById('prize-wheel');
        if (!canvas) { return; }
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
                'callbackFinished' : handlePrizeAwarded,
                'callbackAfter' : () => { isSpinning = false; }
            }
        });
    }

    function startSpin() {
        if (isSpinning) return;
        if (theWheel) { isSpinning = true; theWheel.startAnimation(); }
    }
    
    function handlePrizeAwarded(indicatedSegment) {
        const prizeText = indicatedSegment.text;
        alert(`Prêmio: ${prizeText}! (Lógica de salvar desativada em modo de teste)`);
        closeRouletteModal();
    }
    
    function showRoulette() {
        const rouletteModal = document.getElementById('roulette-modal');
        if (rouletteModal) {
            // *** A CORREÇÃO ESTÁ AQUI ***
            // Usamos a classe .show para exibir o modal, que é o padrão do seu style.css
            rouletteModal.classList.add('show');
            initializeAndDrawWheel();
        }
    }

    function closeRouletteModal() {
        const rouletteModal = document.getElementById('roulette-modal');
        if (rouletteModal) rouletteModal.classList.remove('show');
    }

    // Listeners para os botões internos do modal
    const spinButton = document.getElementById('spin-button');
    const closeRouletteModalBtn = document.getElementById('close-roulette-modal');
    if (spinButton) spinButton.addEventListener('click', startSpin);
    if (closeRouletteModalBtn) closeRouletteModalBtn.addEventListener('click', closeRouletteModal);
    
    // Força a abertura da roleta ao carregar a página
    setTimeout(showRoulette, 1000);
});
