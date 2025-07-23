// Arquivo: appearance.js - VERSÃO COM MAIS OPÇÕES DE CUSTOMIZAÇÃO

let appearanceSectionInitialized = false;

const SETTINGS_DOC_ID = "mainSettings";
const VIDEO_BASE_PATH = "img/banner/";

// Função para salvar as configurações de aparência (cores, logo, banner, fontes)
async function saveAppearanceSettings() {
    const { doc, setDoc } = window.firebaseFirestore;
    const settingsRef = doc(window.db, "configuracoes", SETTINGS_DOC_ID);

    const appearanceData = {
        appearance: {
            logoUrl: document.getElementById('logo-path-input').value.trim(),
            bannerUrl: document.getElementById('banner-path-input').value.trim(),
            primaryColor: document.getElementById('primary-color-input').value,
            backgroundColor: document.getElementById('background-color-input').value,
            cardBgColor: document.getElementById('card-bg-color-input').value,
            mainTextColor: document.getElementById('main-text-color-input').value,
            secondaryTextColor: document.getElementById('secondary-text-color-input').value,
            mainFont: document.getElementById('main-font-select').value
        }
    };

    try {
        await setDoc(settingsRef, appearanceData, { merge: true });
        window.showToast("Aparência do site salva com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao salvar configurações de aparência:", error);
        window.showToast("Ocorreu um erro ao salvar a aparência.", "error");
    }
}

// Função para carregar as configurações atuais e preencher o formulário
async function loadAppearanceSettings() {
    const { doc, getDoc } = window.firebaseFirestore;
    const settingsRef = doc(window.db, "configuracoes", SETTINGS_DOC_ID);

    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists() && docSnap.data().appearance) {
            const settings = docSnap.data().appearance;
            document.getElementById('logo-path-input').value = settings.logoUrl || '';
            document.getElementById('banner-path-input').value = settings.bannerUrl || '';
            document.getElementById('primary-color-input').value = settings.primaryColor || '#ea1d2c';
            document.getElementById('background-color-input').value = settings.backgroundColor || '#f7f7f7';
            document.getElementById('card-bg-color-input').value = settings.cardBgColor || '#ffffff';
            document.getElementById('main-text-color-input').value = settings.mainTextColor || '#3f3f3f';
            document.getElementById('secondary-text-color-input').value = settings.secondaryTextColor || '#757575';
            document.getElementById('main-font-select').value = settings.mainFont || 'Roboto';
        }
    } catch (error) {
        console.error("Erro ao carregar configurações de aparência:", error);
    }
}

// Esta função atualiza a lista de vídeos no Firestore
async function updateVideoList(indexToRemove, newFileName) {
    const { doc, getDoc, setDoc } = window.firebaseFirestore;
    const settingsRef = doc(window.db, "configuracoes", SETTINGS_DOC_ID);
    try {
        const docSnap = await getDoc(settingsRef);
        let currentVideos = (docSnap.exists() && docSnap.data().videos) ? docSnap.data().videos : [];
        if (indexToRemove !== null) {
            currentVideos.splice(indexToRemove, 1);
            window.showToast("Vídeo removido com sucesso!", "success");
        }
        if (newFileName) {
            const fullPath = `${VIDEO_BASE_PATH}${newFileName}`;
            currentVideos.push({ path: fullPath, addedAt: new Date().toISOString() });
            window.showToast("Vídeo adicionado com sucesso!", "success");
        }
        await setDoc(settingsRef, { videos: currentVideos }, { merge: true });
        await loadAndRenderCarouselVideos();
    } catch (error) {
        console.error("Erro ao atualizar a lista de vídeos:", error);
        window.showToast("Ocorreu um erro ao salvar.", "error");
    }
}

// Esta função renderiza os itens na tela do painel
function renderCarouselVideoItems(videos) {
    const carouselVideosListContainer = document.getElementById('carousel-videos-list');
    if (!carouselVideosListContainer) return;
    if (!videos || videos.length === 0) {
        carouselVideosListContainer.innerHTML = "<p>Nenhum vídeo no carrossel. Adicione um novo.</p>";
        return;
    }
    carouselVideosListContainer.innerHTML = videos.map((video, index) => {
        const videoPathForAdminPreview = `../${video.path}`;
        return `
            <div class="image-preview-item">
                <video src="${videoPathForAdminPreview}" muted loop class="preview-thumbnail" title="${video.path}"></video>
                <button type="button" class="btn-icon btn-danger-outline delete-video-btn" data-index="${index}" title="Excluir Vídeo">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    }).join('');
    carouselVideosListContainer.querySelectorAll('.delete-video-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const indexToDelete = parseInt(e.target.closest('button').dataset.index);
            if (confirm("Tem certeza que deseja remover este vídeo do carrossel?")) {
                updateVideoList(indexToDelete, null);
            }
        });
    });
}

// Esta função busca os dados do Firestore
async function loadAndRenderCarouselVideos() {
    const carouselVideosListContainer = document.getElementById('carousel-videos-list');
    if (!carouselVideosListContainer) return;
    carouselVideosListContainer.innerHTML = "<p>Carregando vídeos...</p>";
    const { doc, getDoc } = window.firebaseFirestore;
    const settingsRef = doc(window.db, "configuracoes", SETTINGS_DOC_ID);
    try {
        const docSnap = await getDoc(settingsRef);
        const videos = (docSnap.exists() && docSnap.data().videos) ? docSnap.data().videos : [];
        renderCarouselVideoItems(videos);
    } catch (error) {
        console.error("Erro ao carregar vídeos do carrossel:", error);
        carouselVideosListContainer.innerHTML = "<p>Erro ao carregar vídeos.</p>";
    }
}

// Função principal que inicializa tudo na aba "Aparência"
async function initializeAppearanceSection() {
    if (!appearanceSectionInitialized) {
        console.log("Módulo Aparência.js: Inicializando PELA PRIMEIRA VEZ...");
        appearanceSectionInitialized = true;
    }
    const appearanceForm = document.getElementById('appearance-form');
    const videoFileNameInput = document.getElementById('carousel-video-filename-input');
    const addVideoBtn = document.getElementById('add-video-btn');

    if (appearanceForm && !appearanceForm.dataset.listener) {
        appearanceForm.dataset.listener = 'true';
        appearanceForm.addEventListener('submit', (event) => {
            event.preventDefault();
            saveAppearanceSettings();
        });
    }

    if (addVideoBtn && !addVideoBtn.dataset.listener) {
        addVideoBtn.dataset.listener = 'true';
        addVideoBtn.addEventListener('click', (event) => {
            event.preventDefault();
            const newFileName = videoFileNameInput.value.trim();
            if (newFileName && newFileName.endsWith('.mp4')) {
                updateVideoList(null, newFileName);
                videoFileNameInput.value = '';
            } else {
                window.showToast("Por favor, insira um nome de arquivo .mp4 válido.", "warning");
            }
        });
    }
    
    // Carrega os dados sempre que a aba é aberta
    await loadAppearanceSettings();
    await loadAndRenderCarouselVideos();
}

window.initializeAppearanceSection = initializeAppearanceSection;