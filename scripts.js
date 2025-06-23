// scripts.js - VERSÃO FINAL (LIMPA, SEM LÓGICA DO CARROSSEL)

document.addEventListener('DOMContentLoaded', () => {
    // ======================================================================
    // LÓGICA PARA O BOTÃO DE INSTALAÇÃO DO PWA
    // ======================================================================
    let deferredPrompt;
    const installButton = document.getElementById('install-pwa-button');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installButton) {
            installButton.style.display = 'flex';
        }
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('Usuário aceitou a instalação!');
            }
            deferredPrompt = null;
            installButton.style.display = 'none';
        });
    }

    window.addEventListener('appinstalled', (evt) => {
        if (installButton) {
            installButton.style.display = 'none';
        }
        deferredPrompt = null;
    });

    // ======================================================================
    // LÓGICA PARA O MODAL POP-UP DE PROMOÇÃO
    // ======================================================================
    const promoModal = document.getElementById('promo-popup-modal');
    const closePromoButton = document.getElementById('close-promo-popup');

    const openPromoModal = () => { if (promoModal) promoModal.style.display = 'flex'; };
    const closePromoModal = () => { if (promoModal) promoModal.style.display = 'none'; };

    if (!sessionStorage.getItem('promoShown')) {
        setTimeout(openPromoModal, 2000);
        sessionStorage.setItem('promoShown', 'true');
    }

    if (closePromoButton) closePromoButton.addEventListener('click', closePromoModal);
    if (promoModal) promoModal.addEventListener('click', (event) => {
        if (event.target === promoModal) closePromoModal();
    });
});
