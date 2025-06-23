// Arquivo: appearance.js
// VERSÃO 5.2 - LÓGICA DE CAMINHO RELATIVO ESCLARECIDA E CORRIGIDA

let appearanceSectionInitialized = false;
const SETTINGS_DOC_ID = "mainSettings";
const VIDEO_BASE_PATH = "img/banner/";

async function loadAndRenderCarouselVideos() {
    const carouselVideosListContainer = document.getElementById('carousel-videos-list');
    if (!carouselVideosListContainer || !window.db) return;
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

function renderCarouselVideoItems(videos) {
    const carouselVideosListContainer = document.getElementById('carousel-videos-list');
    if (!carouselVideosListContainer) return;

    if (!videos || videos.length === 0) {
        carouselVideosListContainer.innerHTML = "<p>Nenhum vídeo no carrossel. Adicione um novo.</p>";
        return;
    }

    carouselVideosListContainer.innerHTML = videos.map((video, index) => {
        // A MÁGICA ACONTECE AQUI:
        // Pega o caminho salvo no banco (ex: "img/banner/video1.mp4")
        // e adiciona "../" na frente APENAS para a exibição no painel de admin.
        const videoPathForAdminPreview = `../${video.path}`;

        return `
            <div class="image-preview-item">
                <video src="${videoPathForAdminPreview}" muted loop class="preview-thumbnail" title="${video.path}"></video>
                <button class="btn-icon btn-danger-outline delete-video-btn" data-index="${index}" title="Excluir Vídeo">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    }).join('');

    carouselVideosListContainer.querySelectorAll('.delete-video-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const indexToDelete = parseInt(e.target.closest('button').dataset.index);
            if (confirm("Tem certeza que deseja remover este vídeo do carrossel?")) {
                updateVideoList(indexToDelete, null);
            }
        });
    });
}

async function updateVideoList(indexToRemove, newFileName) {
    if (!window.db) return;
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

async function initializeAppearanceSection() {
    if (!appearanceSectionInitialized) {
        console.log("Módulo Aparência.js: Inicializando PELA PRIMEIRA VEZ...");
        appearanceSectionInitialized = true;
    }

    const videoFileNameInput = document.getElementById('carousel-video-filename-input');
    const addVideoBtn = document.getElementById('add-video-btn');

    if (addVideoBtn && !addVideoBtn.dataset.listener) {
        addVideoBtn.dataset.listener = 'true';
        addVideoBtn.addEventListener('click', () => {
            const newFileName = videoFileNameInput.value.trim();
            if (newFileName && newFileName.endsWith('.mp4')) {
                updateVideoList(null, newFileName);
                videoFileNameInput.value = '';
            } else {
                window.showToast("Por favor, insira um nome de arquivo .mp4 válido.", "warning");
            }
        });
    }

    await loadAndRenderCarouselVideos();
}

window.initializeAppearanceSection = initializeAppearanceSection;
