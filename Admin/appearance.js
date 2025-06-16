// appearance.js

async function initializeAppearanceSection() {
    console.log("Módulo Appearance.js (versão simplificada): Inicializando...");

    const form = document.getElementById('appearance-form');
    if (!form) return;

    // Seletores de elementos do formulário
    const logoPathInput = document.getElementById('logo-path-input');
    const bannerPathInput = document.getElementById('banner-path-input');
    const primaryColorInput = document.getElementById('primary-color-input');
    const backgroundColorInput = document.getElementById('background-color-input');

    // Função para carregar as configurações atuais do Firestore
    async function loadCurrentSettings() {
        if (!window.db || !window.firebaseFirestore) return;
        const { doc, getDoc } = window.firebaseFirestore;
        const settingsRef = doc(window.db, "configuracoes", "mainSettings");
        
        try {
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists() && docSnap.data().appearance) {
                const appearanceSettings = docSnap.data().appearance;
                // Popula os campos do formulário com os dados salvos
                logoPathInput.value = appearanceSettings.logoUrl || '';
                bannerPathInput.value = appearanceSettings.bannerUrl || '';
                primaryColorInput.value = appearanceSettings.primaryColor || '#ea1d2c';
                backgroundColorInput.value = appearanceSettings.backgroundColor || '#f7f7f7';
            } else {
                // Valores padrão se não houver nada salvo
                primaryColorInput.value = '#ea1d2c';
                backgroundColorInput.value = '#f7f7f7';
            }
        } catch (error) {
            console.error("Erro ao carregar configurações de aparência:", error);
            window.showToast("Não foi possível carregar as configurações.", "error");
        }
    }

    // Event listener para salvar o formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const settingsToSave = {
            logoUrl: logoPathInput.value.trim(),
            bannerUrl: bannerPathInput.value.trim(),
            primaryColor: primaryColorInput.value,
            backgroundColor: backgroundColorInput.value
        };

        if (!window.db || !window.firebaseFirestore) {
            window.showToast("Erro de conexão com o banco de dados.", "error");
            return;
        }

        const { doc, setDoc } = window.firebaseFirestore;
        const settingsRef = doc(window.db, "configuracoes", "mainSettings");

        try {
            // Salva o objeto 'appearance' dentro do documento, mesclando com dados existentes
            await setDoc(settingsRef, { appearance: settingsToSave }, { merge: true });
            window.showToast("Aparência do site salva com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar aparência:", error);
            window.showToast("Falha ao salvar as alterações.", "error");
        }
    });

    // Carrega as configurações iniciais ao entrar na seção
    await loadCurrentSettings();
}

window.initializeAppearanceSection = initializeAppearanceSection;