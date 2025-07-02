// Arquivo: reviews-modal.js - VERSÃO FINAL COM TRAVA DE SCROLL

document.addEventListener('DOMContentLoaded', () => {
    const reviewsLink = document.getElementById('open-reviews-modal-link');
    const reviewsModal = document.getElementById('google-reviews-modal');
    const closeModalBtn = reviewsModal?.querySelector('.close-button');

    if (reviewsLink && reviewsModal && closeModalBtn) {

        const openTheModal = () => {
            reviewsModal.classList.add('show');
            document.body.classList.add('body-no-scroll'); // <-- TRAVA O SCROLL DO FUNDO
        };

        const closeTheModal = () => {
            reviewsModal.classList.remove('show');
            document.body.classList.remove('body-no-scroll'); // <-- DESTRAVA O SCROLL
        };

        reviewsLink.addEventListener('click', (event) => {
            event.preventDefault();
            openTheModal();
        });

        closeModalBtn.addEventListener('click', closeTheModal);

        reviewsModal.addEventListener('click', (e) => {
            if (e.target === reviewsModal) {
                closeTheModal();
            }
        });
        console.log("Modal de avaliações com trava de scroll inicializado!");
    } else {
        console.warn("Não foi possível inicializar o modal de avaliações. Link não encontrado.");
    }
});
