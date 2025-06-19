// roulette.js - VERSÃO CORRIGIDA PARA DESENHAR APÓS O MODAL ABRIR

document.addEventListener('DOMContentLoaded', () => {
    // Seleciona o botão que abre o modal de fidelidade
    const loyaltyButton = document.getElementById('loyalty-button');
    let theWheel = null; // Variável para guardar o objeto da roleta

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
        console.log("Tentando inicializar e desenhar a roleta...");
        const canvas = document.getElementById('prize-wheel');

        if (canvas) {
            // Se já existir uma roleta, a destrói antes de criar uma nova
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
                'animation'   : false // Animação ainda desativada para este teste
            });
            console.log("Roleta desenhada com sucesso!");
        } else {
            console.error("Elemento canvas 'prize-wheel' não foi encontrado.");
        }
    }

    // A mágica está aqui: nós "ouvimos" o clique no botão "Fidelidade"
    if (loyaltyButton) {
        loyaltyButton.addEventListener('click', () => {
            // Espera um instante mínimo para o modal começar a transição de CSS e ficar visível
            // antes de tentar desenhar a roleta dentro dele.
            setTimeout(initializeAndDrawWheel, 50); 
        });
    }
});
