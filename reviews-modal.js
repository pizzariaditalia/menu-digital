// Arquivo: reviews-modal.js - VERSÃO COM MODAL CENTRALIZADO

document.addEventListener('DOMContentLoaded', () => {
    const reviewsLink = document.getElementById('open-reviews-modal-link');
    const reviewsModal = document.getElementById('google-reviews-modal');
    const closeModalBtn = reviewsModal?.querySelector('.close-button');

    if (reviewsLink && reviewsModal && closeModalBtn) {
        reviewsLink.addEventListener('click', function(event) {
            event.preventDefault(); 
            // USA A NOVA FUNÇÃO GLOBAL
            openModal(reviewsModal); 
        });

        // USA A NOVA FUNÇÃO GLOBAL
        closeModalBtn.addEventListener('click', () => closeModal(reviewsModal));
        
        reviewsModal.addEventListener('click', (e) => {
            if (e.target === reviewsModal) {
                // USA A NOVA FUNÇÃO GLOBAL
                closeModal(reviewsModal);
            }
        });
        console.log("Modal de avaliações inicializado com sucesso, usando ID!");
    } else {
        console.warn("Não foi possível inicializar o modal de avaliações. Link com ID 'open-reviews-modal-link' não foi encontrado.");
    }
});
