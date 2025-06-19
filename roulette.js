// roulette.js - VERSÃO COM CORREÇÃO FINAL DE VISIBILIDADE (display: important)

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO DA ROLETA ---
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
    let theWheel = null;
    let isSpinning = false;
    
    const spinButton = document.getElementById('spin-button');
    const rouletteModal = document.getElementById('roulette-modal');
    const closeRouletteModalBtn = document.getElementById('close-roulette-modal');

    // --- FUNÇÕES DA ROLETA ---

    function initializeWheel() {
        if (theWheel) {
            theWheel.stopAnimation(false);
            theWheel = null;
        }
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
            // *** LINHA CORRIGIDA PARA FORÇAR A EXIBIÇÃO ***
            rouletteModal.style.setProperty('display', 'flex', 'important');
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
            console.log("Cliente nunca girou. Mostrando roleta.");
            openRouletteModal();
        } else {
            const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
            const timeSinceLastSpin = new Date().getTime() - lastSpin.getTime();

            if (timeSinceLastSpin > sevenDaysInMillis) {
                console.log("Mais de 7 dias desde o último giro. Mostrando roleta.");
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
