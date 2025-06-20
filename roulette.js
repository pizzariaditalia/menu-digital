// roulette.js - VERSÃO COM ALERTA DE PRÊMIO CUSTOMIZADO

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
    
    // --- SELETORES DO NOVO MODAL DE ALERTA ---
    const prizeAlertModal = document.getElementById('prize-alert-modal');
    const prizeAlertIcon = document.getElementById('prize-alert-icon');
    const prizeAlertTitle = document.getElementById('prize-alert-title');
    const prizeAlertMessage = document.getElementById('prize-alert-message');
    const prizeAlertOkButton = document.getElementById('prize-alert-ok-button');


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
    
    // --- NOVA FUNÇÃO PARA EXIBIR O ALERTA CUSTOMIZADO ---
    function showPrizeAlert(title, message, isPrize) {
        if (!prizeAlertModal || !prizeAlertTitle || !prizeAlertMessage || !prizeAlertOkButton || !prizeAlertIcon) {
            alert(`${title}\n${message}`); // Fallback para o alerta antigo se os elementos não existirem
            return;
        }

        prizeAlertTitle.textContent = title;
        prizeAlertMessage.textContent = message;

        if (isPrize) {
            prizeAlertIcon.className = 'fas fa-gift'; // Ícone de presente
            prizeAlertOkButton.textContent = 'Ver no Carrinho';
        } else {
            prizeAlertIcon.className = 'fas fa-sync-alt'; // Ícone de "tentar novamente"
            prizeAlertOkButton.textContent = 'OK';
        }

        prizeAlertModal.style.display = 'flex';

        // Usamos { once: true } para que o evento seja adicionado e removido automaticamente
        prizeAlertOkButton.addEventListener('click', () => {
            prizeAlertModal.style.display = 'none';
            // Se for um prêmio e a função existir, abre o carrinho
            if (isPrize && typeof window.openCartModal === 'function') {
                window.openCartModal();
            }
        }, { once: true });
    }
    
    function handlePrizeAwarded(indicatedSegment) {
        const prizeText = indicatedSegment.text;
        let prizeObject = null;

        switch (prizeText) {
            case '10% OFF':
                prizeObject = { type: 'percent', value: 10, description: '10% de Desconto' };
                break;
            case '5% OFF':
                prizeObject = { type: 'percent', value: 5, description: '5% de Desconto' };
                break;
            case 'Refri Grátis':
                prizeObject = { type: 'free_item', value: 'Coca-Cola 2L', description: 'Refrigerante Grátis' };
                break;
            case 'Borda Grátis':
                prizeObject = { type: 'free_extra', value: 'Catupiry', description: 'Borda Grátis' };
                break;
        }
        
        closeRouletteModal(); // Fecha o modal da roleta imediatamente
        updateLastSpinTime(); // Salva a data do giro

        if (prizeObject) {
            sessionStorage.setItem('activeRoulettePrize', JSON.stringify(prizeObject));
            // Chama o novo alerta customizado
            showPrizeAlert('Parabéns!', `Você ganhou: ${prizeObject.description}!`, true);
        } else {
            showPrizeAlert('Não foi dessa vez!', 'Gire novamente na próxima semana.', false);
        }
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

    function openRouletteModal() {
        if (rouletteModal) {
            rouletteModal.style.setProperty('display', 'flex', 'important');
            initializeWheel();
        }
    }

    function closeRouletteModal() {
        if (rouletteModal) {
            rouletteModal.style.display = 'none';
        }
    }
    
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
            }
        }
    };

    if (spinButton) spinButton.addEventListener('click', startSpin);
    if (closeRouletteModalBtn) closeRouletteModalBtn.addEventListener('click', closeRouletteModal);
});
