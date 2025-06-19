// roulette.js - VERSÃO DE PRODUÇÃO FINAL

document.addEventListener('DOMContentLoaded', () => {
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
        if (!canvas) return;
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
        if (theWheel) {
            isSpinning = true;
            theWheel.startAnimation();
        }
    }
    
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

    function handlePrizeAwarded(indicatedSegment) {
        const prizeText = indicatedSegment.text;
        if (prizeText !== 'Tente de Novo') {
            alert(`Parabéns! Você ganhou: ${prizeText}!`);
            // Aqui podemos adicionar lógica futura para salvar o prêmio
        } else {
            alert('Não foi dessa vez! Tente novamente na próxima semana.');
        }
        updateLastSpinTime();
        closeRouletteModal();
    }

    function showRouletteModal() {
        const rouletteModal = document.getElementById('roulette-modal');
        if (rouletteModal) {
            rouletteModal.classList.add('show');
            initializeAndDrawWheel();
        }
    }

    function closeRouletteModal() {
        const rouletteModal = document.getElementById('roulette-modal');
        if (rouletteModal) rouletteModal.classList.remove('show');
    }

    window.checkSpinEligibility = () => {
        const customer = window.currentCustomerDetails;
        if (!customer) return;

        const lastSpin = customer.lastSpinTimestamp?.toDate();

        if (!lastSpin) {
            console.log("Elegível para girar (nunca girou).");
            showRouletteModal();
        } else {
            const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
            const timeSinceLastSpin = new Date().getTime() - lastSpin.getTime();
            if (timeSinceLastSpin > sevenDaysInMillis) {
                console.log("Elegível para girar (mais de 7 dias).");
                showRouletteModal();
            } else {
                console.log("Não elegível para girar (menos de 7 dias).");
            }
        }
    };

    const spinButton = document.getElementById('spin-button');
    const closeRouletteModalBtn = document.getElementById('close-roulette-modal');
    if (spinButton) spinButton.addEventListener('click', startSpin);
    if (closeRouletteModalBtn) closeRouletteModalBtn.addEventListener('click', closeRouletteModal);
});
