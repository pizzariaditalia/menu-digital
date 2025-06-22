// scripts.js - VERSÃO COM LÓGICA DE INSTALAÇÃO DO PWA

document.addEventListener('DOMContentLoaded', () => {

    // ======================================================================
    // LÓGICA PARA O BOTÃO DE INSTALAÇÃO DO PWA (NOVO)
    // ======================================================================
    let deferredPrompt; // Variável para guardar o evento de instalação
    const installButton = document.getElementById('install-pwa-button');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Impede que o mini-infobar padrão do Chrome apareça
        e.preventDefault();
        // Guarda o evento para que possa ser acionado mais tarde.
        deferredPrompt = e;
        // Mostra o nosso botão de instalação customizado
        if (installButton) {
            installButton.style.display = 'flex';
        }
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) {
                // Se o deferredPrompt não estiver disponível, não faz nada.
                return;
            }
            // Mostra o prompt de instalação do navegador
            deferredPrompt.prompt();
            // Espera o usuário responder ao prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            
            if (outcome === 'accepted') {
                console.log('Usuário aceitou a instalação!');
            } else {
                console.log('Usuário recusou a instalação.');
            }
            
            // O prompt só pode ser usado uma vez. Limpamos a variável.
            deferredPrompt = null;
            // Esconde o botão após o uso
            installButton.style.display = 'none';
        });
    }

    // Ouve o evento 'appinstalled' para saber quando o PWA foi instalado
    window.addEventListener('appinstalled', (evt) => {
        console.log('PWA foi instalado com sucesso!');
        // Esconde o botão de instalação permanentemente
        if (installButton) {
            installButton.style.display = 'none';
        }
        deferredPrompt = null;
    });


    // ======================================================================
    // LÓGICA PARA O MODAL POP-UP DE PROMOÇÃO (EXISTENTE)
    // ======================================================================
    const promoModal = document.getElementById('promo-popup-modal');
    const closePromoButton = document.getElementById('close-promo-popup');

    const openPromoModal = () => {
        if (promoModal) {
            promoModal.style.display = 'flex';
        }
    };

    const closePromoModal = () => {
        if (promoModal) {
            promoModal.style.display = 'none';
        }
    };

    // Mostra o pop-up de promoção apenas uma vez por sessão
    if (!sessionStorage.getItem('promoShown')) {
        setTimeout(openPromoModal, 2000);
        sessionStorage.setItem('promoShown', 'true');
    }

    if (closePromoButton) {
        closePromoButton.addEventListener('click', closePromoModal);
    }
    if (promoModal) {
        promoModal.addEventListener('click', (event) => {
            if (event.target === promoModal) {
                closePromoModal();
            }
        });
    }
});

// ======================================================================
// LÓGICA PARA O CARROSSEL DE VÍDEOS AUTOMÁTICO
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.getElementById('video-carousel-container');
    if (!carouselContainer) return; // Se não houver carrossel, não faz nada

    const slides = carouselContainer.querySelectorAll('.video-slide');
    const dotsContainer = carouselContainer.querySelector('.carousel-dots');

    if (slides.length <= 1) return; // Se tiver 1 vídeo ou menos, não precisa de carrossel

    let currentSlide = 0;
    let slideInterval;

    // Cria os "dots" (indicadores)
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
            newIndex = 0; // Volta para o primeiro
        }
        setSlide(newIndex);
    }

    function resetInterval() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 7000); // Troca de vídeo a cada 7 segundos
    }

    // Inicia o carrossel
    setSlide(0);
    resetInterval();
});
