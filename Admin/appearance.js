// Arquivo: appearance.js
// VERSÃO FINAL - GERENCIA NOMES DE ARQUIVOS DE VÍDEO LOCAIS NO PROJETO

let appearanceSectionInitialized = false;
const CAROUSEL_SETTINGS_DOC_ID = "carouselSettings";
const VIDEO_BASE_PATH = "img/banner/"; // Caminho base onde seus vídeos estão

async function initializeAppearanceSection() {
    if (appearanceSectionInitialized) {
        loadAndRenderCarouselVideos();
        return;
    }
    appearanceSectionInitialized = true;
    console.log("Módulo Aparência.js: Inicializando...");

    // Seletores para a seção do carrossel
    const carouselVideosListContainer = document.getElementById('carousel-videos-list');
    const videoFileNameInput = document.getElementById('carousel-video-filename-input');
    const addVideoBtn = document.getElementById('add-video-btn');

    // Carrega a lista de vídeos do Firestore e renderiza na tela
    async function loadAndRenderCarouselVideos() {
        if (!carouselVideosListContainer || !window.db) return;
        carouselVideosListContainer.innerHTML = "<p>Carregando vídeos...</p>";
        
        const { doc, getDoc } = window.firebaseFirestore;
        const carouselSettingsRef = doc(window.db, "configuracoes", CAROUSEL_SETTINGS_DOC_ID);
        
        try {
            const docSnap = await getDoc(carouselSettingsRef);
            const videos = (docSnap.exists() && docSnap.data().videos) ? docSnap.data().videos : [];
            renderCarouselVideoItems(videos);
        } catch (error) {
            console.error("Erro ao carregar vídeos do carrossel:", error);
            carouselVideosListContainer.innerHTML = "<p>Erro ao carregar vídeos.</p>";
        }
    }

    // Renderiza os cards dos vídeos com o botão de excluir
    function renderCarouselVideoItems(videos) {
        if (!carouselVideosListContainer) return;
        if (!videos || videos.length === 0) {
            carouselVideosListContainer.innerHTML = "<p>Nenhum vídeo no carrossel. Adicione um novo.</p>";
            return;
        }

        carouselVideosListContainer.innerHTML = videos.map((video, index) => {
            // Usa o caminho salvo, que já deve ser o caminho relativo correto
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

    // Função genérica para adicionar ou remover um vídeo da lista no Firestore
    async function updateVideoList(indexToRemove, newFileName) {
        if (!window.db) return;
        const { doc, getDoc, setDoc } = window.firebaseFirestore;
        const carouselSettingsRef = doc(window.db, "configuracoes", CAROUSEL_SETTINGS_DOC_ID);

        try {
            const docSnap = await getDoc(carouselSettingsRef);
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
            
            await setDoc(carouselSettingsRef, { videos: currentVideos }, { merge: true });
            
            loadAndRenderCarouselVideos();

        } catch (error) {
            console.error("Erro ao atualizar a lista de vídeos:", error);
            window.showToast("Ocorreu um erro.", "error");
        }
    }

    // Listener para o botão de adicionar
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

    // Carga inicial dos vídeos
    loadAndRenderCarouselVideos();
}

// Inicializa a seção de Aparência
// Se você tem outras lógicas no seu appearance.js, elas devem ser mantidas
// O ideal é mesclar, mas se a única função era o carrossel, pode substituir tudo.
initializeAppearanceSection();
