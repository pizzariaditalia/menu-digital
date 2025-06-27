// Arquivo: reviews-modal.js - VERSÃO COM O SELETOR CORRETO

document.addEventListener('DOMContentLoaded', () => {
    // CORREÇÃO: Este seletor agora procura o link dentro do card de informações do restaurante
    const reviewsLink = document.querySelector('.restaurant-info-card a[href*="g.co/kgs"]');

    const reviewsModal = document.getElementById('google-reviews-modal');
    // Adicionamos um '?' para o caso do modal não ser encontrado, evitando erros
    const closeModalBtn = reviewsModal?.querySelector('.close-button');

    if (reviewsLink && reviewsModal && closeModalBtn) {
        // Adiciona o evento de clique ao link
        reviewsLink.addEventListener('click', function(event) {
            event.preventDefault(); // Impede a navegação para o site do Google
            reviewsModal.classList.add('show'); // Mostra o nosso modal
        });

        // Adiciona o evento para o botão de fechar
        closeModalBtn.addEventListener('click', () => reviewsModal.classList.remove('show'));

        // Adiciona o evento para fechar clicando fora do conteúdo
        reviewsModal.addEventListener('click', (e) => {
            if (e.target === reviewsModal) {
                reviewsModal.classList.remove('show');
            }
        });
        console.log("Modal de avaliações inicializado com sucesso!");
    } else {
        console.warn("Não foi possível inicializar o modal de avaliações. Link não encontrado.");
    }
});
