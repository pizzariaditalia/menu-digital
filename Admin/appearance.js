// Arquivo: appearance.js
// VERSÃO 5.1 - CÓDIGO FINAL E CORRIGIDO PARA GERENCIAMENTO DE VÍDEOS

let appearanceSectionInitialized = false;

// Apontando para o documento e pasta corretos
const SETTINGS_DOC_ID = "mainSettings"; 
const VIDEO_BASE_PATH = "img/banner/";

// Esta função atualiza a lista de vídeos no Firestore
async function updateVideoList(indexToRemove, newFileName) {
    const { doc, getDoc, setDoc } = window.firebaseFirestore;
    const settingsRef = doc(window.db, "configuracoes", SETTINGS_DOC_ID);

    try {
        const docSnap = await getDoc(settingsRef);
        let currentVideos = (docSnap.exists() && docSnap.data().videos) ? docSnap.data().videos : [];

        if (indexToRemove !== null) { // Se for para remover
            currentVideos.splice(indexToRemove, 1);
            window.showToast("Vídeo removido com sucesso!", "success");
        }

        if (newFileName) { // Se for para adicionar
            const fullPath = `${VIDEO_BASE_PATH}${newFileName}`;
            currentVideos.push({ path: fullPath, addedAt: new Date().toISOString() });
            window.showToast("Vídeo adicionado com sucesso!", "success");
        }
        
        // Salva o array de vídeos de volta no documento `mainSettings`
        // `merge: true` garante que outros campos como "appearance" não sejam apagados
        await setDoc(settingsRef, { videos: currentVideos }, { merge: true });
        
        // Recarrega a visualização dos vídeos na tela
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

    // Adiciona os eventos de clique para os botões de excluir recém-criados
    carouselVideosListContainer.querySelectorAll('.delete-video-btn').forEach(button => {
        button.addEventListener('click', (e) => {
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
    // A verificação de inicialização agora só decide se o log aparece
    if (!appearanceSectionInitialized) {
        console.log("Módulo Aparência.js: Inicializando PELA PRIMEIRA VEZ...");
        appearanceSectionInitialized = true;
    }

    const videoFileNameInput = document.getElementById('carousel-video-filename-input');
    const addVideoBtn = document.getElementById('add-video-btn');

    // Listener do botão "Adicionar"
    if (addVideoBtn) {
        // Previne múltiplos listeners sendo adicionados
        if (!addVideoBtn.dataset.listener) {
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
    }

    // Carrega os vídeos sempre que a aba é aberta
    await loadAndRenderCarouselVideos();
}

window.initializeAppearanceSection = initializeAppearanceSection;
