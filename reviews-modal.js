// Arquivo: reviews-modal.js - VERSÃO SIMPLIFICADA E CORRETA

document.addEventListener('DOMContentLoaded', () => {
    // Encontra o link especificamente dentro do rodapé (footer)
    const reviewsLink = document.querySelector('.footer-social a[href*="google.com/search"]');

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
        console.log("Modal de avaliações do rodapé inicializado com sucesso!");
    } else {
        console.warn("Não foi possível inicializar o modal de avaliações. Link do rodapé não encontrado.");
    }
});
