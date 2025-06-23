// Arquivo: appearance.js
// VERSÃO 5.0 - CORRIGIDO PARA SALVAR NO DOCUMENTO "mainSettings"

let appearanceSectionInitialized = false;

// CORREÇÃO: Apontando para o documento correto no Firestore
const SETTINGS_DOC_ID = "mainSettings"; 
const VIDEO_BASE_PATH = "img/banner/";

async function loadAndRenderCarouselVideos() {
    const carouselVideosListContainer = document.getElementById('carousel-videos-list');
    if (!carouselVideosListContainer || !window.db) return;
    carouselVideosListContainer.innerHTML = "<p>Carregando vídeos...</p>";
    
    const { doc, getDoc } = window.firebaseFirestore;
    // Usa a constante correta
    const settingsRef = doc(window.db, "configuracoes", SETTINGS_DOC_ID); 
    
    try {
        const docSnap = await getDoc(settingsRef);
        // A lógica de procurar pelo campo "videos" continua a mesma
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
        const videoPath = `../${video.path.replace('../', '')}`;
        return `
            <div class="image-preview-item">
                <video src="${videoPath}" muted loop class="preview-thumbnail" title="${video.path}"></video>
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
    // Usa a constante correta
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
        
        // setDoc com merge:true garante que não vamos apagar os outros campos como "appearance" e "operatingHours"
        await setDoc(settingsRef, { videos: currentVideos }, { merge: true });
        
        await loadAndRenderCarouselVideos();

    } catch (error) {
        console.error("Erro ao atualizar a lista de vídeos:", error);
        window.showToast("Ocorreu um erro.", "error");
    }
}

async function initializeAppearanceSection() {
    if (appearanceSectionInitialized) {
        await loadAndRenderCarouselVideos();
        return;
    }
    appearanceSectionInitialized = true;
    console.log("Módulo Aparência.js: Inicializando...");

    const videoFileNameInput = document.getElementById('carousel-video-filename-input');
    const addVideoBtn = document.getElementById('add-video-btn');

    if (addVideoBtn) {
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
