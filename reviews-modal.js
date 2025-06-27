// Arquivo: reviews-modal.js

document.addEventListener('DOMContentLoaded', () => {
    // Encontra o link de avaliações pelo seu texto
    const reviewsLink = Array.from(document.querySelectorAll('a')).find(
        a => a.textContent.includes('Avaliações')
    );

    const reviewsModal = document.getElementById('google-reviews-modal');
    const closeModalBtn = reviewsModal?.querySelector('.close-button');

    if (reviewsLink && reviewsModal && closeModalBtn) {
        // Adiciona o evento de clique ao link
        reviewsLink.addEventListener('click', function(event) {
            event.preventDefault(); // Impede que o link vá para o site do Google
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
    }
});