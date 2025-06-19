
// roulette.js - PASSO 1: APENAS DESENHAR A ROLETA ESTÁTICA

document.addEventListener('DOMContentLoaded', () => {
    console.log("roulette.js: Arquivo carregado. Tentando desenhar a roleta...");

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

    // Verifica se o elemento canvas existe antes de tentar criar a roleta
    const canvas = document.getElementById('prize-wheel');
    if (canvas) {
        // Tenta criar e desenhar a roleta estática
        let theWheel = new Winwheel({
            'canvasId'    : 'prize-wheel',
            'numSegments' : prizes.length,
            'outerRadius' : 145,
            'textFontSize': 16,
            'segments'    : prizes,
            'animation'   : false // IMPORTANTE: Animação desativada por enquanto
        });
    } else {
        console.error("Elemento canvas 'prize-wheel' não foi encontrado ao tentar desenhar a roleta.");
    }
});
