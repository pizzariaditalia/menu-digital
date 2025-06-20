// roulette.js - VERSÃO COM CORREÇÃO FINAL DE VISIBILIDADE (display: important)

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO DA ROLETA ---
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
    
    // ... dentro do seu roulette.js

function handlePrizeAwarded(indicatedSegment) {
    const prizeText = indicatedSegment.text;
    let prizeObject = null;

    // Converte o texto do prêmio em um objeto estruturado
    switch (prizeText) {
        case '10% OFF':
            prizeObject = { type: 'percent', value: 10, description: '10% de Desconto (Roleta)' };
            break;
        case '5% OFF':
            prizeObject = { type: 'percent', value: 5, description: '5% de Desconto (Roleta)' };
            break;
        
        // --- CORREÇÃO AQUI ---
        // Use o nome exato do produto como está no seu menu.js
        case 'Refri Grátis':
            prizeObject = { type: 'free_item', value: 'Coca-Cola 2L', description: 'Refrigerante Grátis (Roleta)' };
            break;

        // --- CORREÇÃO AQUI ---
        // Use o nome exato da borda como está no seu banco de dados
        case 'Borda Grátis':
            // Este prêmio é mais complexo de implementar, pois depende de uma pizza ser adicionada.
            // Por enquanto, vamos focar em registrar que o cliente ganhou.
            prizeObject = { type: 'free_extra', value: 'Catupiry', description: 'Borda Grátis (Roleta)' };
            break;
        
        case 'Tente de Novo':
             // Nenhuma ação necessária
            break;
    }

    if (prizeObject) {
        // Salva o prêmio na sessão do navegador
        sessionStorage.setItem('activeRoulettePrize', JSON.stringify(prizeObject));
        alert(`Parabéns! Você ganhou: ${prizeObject.description}! O prêmio será aplicado no seu carrinho.`);
    } else {
        alert('Não foi dessa vez! Tente novamente na próxima semana.');
    }

    updateLastSpinTime();
    closeRouletteModal();

    // Abre o carrinho para o cliente ver o prêmio (se houver um e a função existir)
    if (prizeObject && prizeObject.type !== 'free_extra' && typeof window.openCartModal === 'function') {
        window.openCartModal();
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
