// scripts.js - VERSÃO COM LÓGICA DO CARROSSEL SEPARADA EM UMA FUNÇÃO

// A lógica do PWA e do Pop-up continuam dentro do DOMContentLoaded
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
   /* const promoModal = document.getElementById('promo-popup-modal');
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
    });*/
}); 

// ======================================================================
// NOVA FUNÇÃO GLOBAL PARA INICIAR O CARROSSEL
// ======================================================================
function initializeCarousel() {
    const carouselContainer = document.getElementById('video-carousel-container');
    if (!carouselContainer) return;

    const slides = carouselContainer.querySelectorAll('.video-slide');
    const dotsContainer = carouselContainer.querySelector('.carousel-dots');

    if (slides.length <= 1) { // Se tiver 1 vídeo, mostra mas não anima
        if(slides.length === 1) slides[0].classList.add('active');
        dotsContainer.style.display = 'none';
        return;
    };

    let currentSlide = 0;
    let slideInterval;

    // Limpa e cria os "dots" (indicadores)
    dotsContainer.innerHTML = '';
    slides.forEach((slide, index) => {
        const dot = document.createElement('button');
        dot.classList.add('dot');
        dot.addEventListener('click', () => {
            setSlide(index);
            resetInterval();
        });
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.dot');

    function setSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        let newIndex = currentSlide + 1;
        if (newIndex >= slides.length) {
            newIndex = 0;
        }
        setSlide(newIndex);
    }

    function resetInterval() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 7000); // Troca de vídeo a cada 7 segundos
    }

    setSlide(0);
    resetInterval();
}

// Deixa a função acessível para ser chamada por outros arquivos
window.initializeCarousel = initializeCarousel;
