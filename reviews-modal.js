// Arquivo: reviews-modal.js - VERSÃO FINAL COM SELEÇÃO POR ID

document.addEventListener('DOMContentLoaded', () => {
    // CORREÇÃO: Agora procuramos pelo ID específico que criamos.
    const reviewsLink = document.getElementById('open-reviews-modal-link');

    const reviewsModal = document.getElementById('google-reviews-modal');
    const closeModalBtn = reviewsModal?.querySelector('.close-button');

    if (reviewsLink && reviewsModal && closeModalBtn) {
        reviewsLink.addEventListener('click', function(event) {
            event.preventDefault(); // Impede a ação padrão do link '#'
            reviewsModal.classList.add('show'); // Mostra o nosso modal
        });

        closeModalBtn.addEventListener('click', () => reviewsModal.classList.remove('show'));

        reviewsModal.addEventListener('click', (e) => {
            if (e.target === reviewsModal) {
                reviewsModal.classList.remove('show');
            }
        });
        console.log("Modal de avaliações inicializado com sucesso, usando ID!");
    } else {
        console.warn("Não foi possível inicializar o modal de avaliações. Link com ID 'open-reviews-modal-link' não foi encontrado.");
    }
});
