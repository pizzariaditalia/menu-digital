// Arquivo: reviews-modal.js - VERSÃO COM SELETOR PRECISO

document.addEventListener('DOMContentLoaded', () => {
    // CORREÇÃO: Este seletor agora procura pelo link exato que você informou.
    const reviewsLink = document.querySelector('a[href="https://g.co/kgs/5ZHYjoE"]');

    const reviewsModal = document.getElementById('google-reviews-modal');
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
        console.warn("Não foi possível inicializar o modal de avaliações. Link de avaliação não encontrado.");
    }
});
