// Arquivo: cardapio.js
// VERSÃO COM GESTÃO COMPLETA DE CATEGORIAS (EDITAR E EXCLUIR)

let cardapioSectionInitialized = false;

// --- CONSTANTE GLOBAL DO MÓDULO ---
const STUFFED_CRUSTS_COLLECTION = "stuffed_crusts";

// --- SELETORES DE ELEMENTOS GLOBAIS AO MÓDULO ---
let categoryListContainer, addCategoryButton, addCategoryModal, addCategoryForm, closeAddCategoryModalBtns,
    itemEditorModal, itemEditorForm, itemEditorTitle, closeItemEditorModalBtns;

let stuffedCrustForm, stuffedCrustFormTitle, stuffedCrustNameInput, stuffedCrustPriceInput,
    stuffedCrustTypeSelect,
    stuffedCrustIdHidden, cancelEditStuffedCrustBtn, stuffedCrustListContainer;


async function initializeCardapioSection() {
    if (cardapioSectionInitialized) {
        if (typeof mainStuffedCrustLogic === 'function') {
            mainStuffedCrustLogic();
        }
        renderCategories(); // Garante que as categorias sejam re-renderizadas ao visitar a aba
        return;
    }
    cardapioSectionInitialized = true;
    console.log("Módulo Cardapio.js: Inicializando PELA PRIMEIRA VEZ...");

    // --- ATRIBUIÇÃO DAS VARIÁVEIS DE ELEMENTOS DO DOM ---
    categoryListContainer = document.getElementById('category-list-container');
    addCategoryButton = document.getElementById('add-category-button');
    addCategoryModal = document.getElementById('add-category-modal');
    addCategoryForm = document.getElementById('add-category-form');
    closeAddCategoryModalBtns = document.querySelectorAll('.close-modal-btn[data-modal-id="add-category-modal"]');
    itemEditorModal = document.getElementById('item-editor-modal');
    itemEditorForm = document.getElementById('item-editor-form');
    itemEditorTitle = document.getElementById('item-editor-title');
    closeItemEditorModalBtns = document.querySelectorAll('.close-modal-btn[data-modal-id="item-editor-modal"]');

    stuffedCrustForm = document.getElementById('stuffed-crust-form');
    stuffedCrustFormTitle = document.getElementById('stuffed-crust-form-title');
    stuffedCrustNameInput = document.getElementById('stuffed-crust-name');
    stuffedCrustPriceInput = document.getElementById('stuffed-crust-price');
    stuffedCrustTypeSelect = document.getElementById('stuffed-crust-type');
    stuffedCrustIdHidden = document.getElementById('stuffed-crust-id-hidden');
    cancelEditStuffedCrustBtn = document.getElementById('cancel-edit-stuffed-crust-btn');
    stuffedCrustListContainer = document.getElementById('stuffed-crust-list-container');

    const formatPriceAdmin = (price) => (typeof price === 'number') ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00";

    async function saveMenuToFirestore() {
        if (!window.db || !window.firebaseFirestore) { window.showToast("Erro: Conexão com Firestore não encontrada.", "error"); return; }
        const { doc, setDoc } = window.firebaseFirestore;
        const menuDocRef = doc(window.db, "menus", "principal");
        try {
            await setDoc(menuDocRef, window.menuData);
            console.log("Cardápio salvo com sucesso no Firestore!");
        } catch (error) {
            console.error("Erro ao salvar cardápio no Firestore:", error);
            window.showToast("Ocorreu um erro grave ao salvar o cardápio.", "error");
        }
    }

    function getCategoryIcon(categoryKey) {
        const key = categoryKey.toLowerCase();
        if (key.includes('pizza')) return 'fa-pizza-slice';
        if (key.includes('bebida')) return 'fa-wine-bottle';
        if (key.includes('doce') || key.includes('sobremesa')) return 'fa-ice-cream';
        if (key.includes('esfiha')) return 'fa-dot-circle';
        if (key.includes('calzone')) return 'fa-moon';
        return 'fa-utensils';
    }
    
    function createCategoryItemHTML(categoryKey, categoryData) {
        const categoryName = window.menuData[categoryKey]?.name || categoryKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const itemCount = Array.isArray(categoryData.items) ? categoryData.items.length : 0;
        const iconClass = getCategoryIcon(categoryKey);
        
        return `
        <div class="category-item" data-category-key="${categoryKey}">
            <div class="category-info-clickable">
                <i class="fas ${iconClass} category-icon"></i>
                <div class="category-name-wrapper">
                    <span class="category-name">${categoryName}</span>
                    <span class="item-count">${itemCount} itens</span>
                </div>
            </div>
            <div class="category-actions">
                <button class="btn btn-sm btn-primary-outline add-item-btn" title="Adicionar item nesta categoria"><i class="fas fa-plus"></i></button>
                <button class="btn btn-icon edit-category-btn" title="Editar categoria"><i class="fas fa-edit"></i></button>
                <button class="btn btn-icon delete-category-btn btn-danger-outline" title="Excluir categoria"><i class="fas fa-trash-alt"></i></button>
                <button class="btn btn-icon expand-category-btn" title="Ver itens"><i class="fas fa-chevron-down"></i></button>
            </div>
        </div>
        <div class="pizza-items-in-category" id="items-${categoryKey}" style="display: none;"></div>`;
    }

    function createAdminPizzaItemHTML(item, categoryKey) {
        const imagePathForAdmin = `../${(item.image || 'img/placeholder.png').replace('../', '')}`;
        const isVisible = item.isVisible !== false;
        const visibilityIcon = isVisible ? 'fa-eye' : 'fa-eye-slash';
        const hiddenClass = isVisible ? '' : 'item-hidden';

        return `
            <div class="admin-menu-item-card ${hiddenClass}" data-item-id="${item.id}" data-category-key="${categoryKey}">
                <img src="${imagePathForAdmin}" alt="${item.name}" onerror="this.onerror=null;this.src='../img/placeholder.png';">
                <div class="details">
                    <h4>${item.name}</h4>
                    <p>${item.description || 'Sem descrição.'}</p>
                    <p class="price"><strong>${formatPriceAdmin(item.price)}</strong></p>
                </div>
                <div class="actions">
                    <button class="btn btn-icon toggle-visibility-btn" title="Alternar visibilidade"><i class="fas ${visibilityIcon}"></i></button>
                    <button class="btn btn-sm edit-item-btn" title="Editar Item"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm delete-item-btn btn-danger-outline" title="Excluir Item"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
    }

    function renderCategories() {
        if (!categoryListContainer || !window.menuData) { console.error("Cardapio.js: Container ou menuData não encontrado."); categoryListContainer.innerHTML = "<p>Erro: Não foi possível carregar os dados do cardápio.</p>"; return; }
        categoryListContainer.innerHTML = '';
        Object.keys(window.menuData).forEach(key => {
            if (typeof window.menuData[key] === 'object' && Array.isArray(window.menuData[key].items)) {
                categoryListContainer.insertAdjacentHTML('beforeend', createCategoryItemHTML(key, window.menuData[key]));
            }
        });
        addCategoryEventListeners();
    }

    function loadItemsIntoCategory(categoryKey, container) {
        container.innerHTML = '';
        const items = window.menuData[categoryKey]?.items || [];
        if (items.length > 0) {
            items.forEach(item => container.insertAdjacentHTML('beforeend', createAdminPizzaItemHTML(item, categoryKey)));
        } else {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--admin-text-light);">Nenhum item nesta categoria.</p>';
        }
        addItemActionListeners(container);
    }
    
    function openModal(modalElement) { if (modalElement) modalElement.classList.add('show'); }
    function closeModal(modalElement) { if (modalElement) modalElement.classList.remove('show'); }

    function openItemEditorModal(categoryKey, itemId = null) {
        itemEditorForm.reset();
        document.getElementById('edit-item-category-key').value = categoryKey;
        if (itemId) {
            itemEditorTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Item';
            const item = window.menuData[categoryKey].items.find(i => i.id == itemId);
            if (item) {
                document.getElementById('edit-item-id').value = item.id;
                document.getElementById('item-name').value = item.name;
                document.getElementById('item-description').value = item.description || '';
                document.getElementById('item-price').value = item.price;
                document.getElementById('item-image').value = item.image || '';
            }
        } else {
            itemEditorTitle.innerHTML = '<i class="fas fa-plus"></i> Novo Item';
            document.getElementById('edit-item-id').value = '';
        }
        openModal(itemEditorModal);
    }
    
    function openCategoryEditorModal(categoryKey = null) {
        const modalTitle = addCategoryModal.querySelector('h3');
        const keyInput = document.getElementById('new-category-key');
        const nameInput = document.getElementById('new-category-name');
        addCategoryForm.reset();

        if (categoryKey) {
            const categoryData = window.menuData[categoryKey];
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Categoria';
            keyInput.value = categoryKey;
            keyInput.readOnly = true;
            nameInput.value = categoryData.name;
        } else {
            modalTitle.innerHTML = '<i class="fas fa-folder-plus"></i> Adicionar Nova Categoria';
            keyInput.readOnly = false;
        }
        openModal(addCategoryModal);
    }

    function addCategoryEventListeners() {
        categoryListContainer.querySelectorAll('.category-item').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede a propagação para evitar múltiplos eventos
                const categoryKey = header.dataset.categoryKey;
                const categoryName = header.querySelector('.category-name').textContent;
                
                if (e.target.closest('.add-item-btn')) {
                    openItemEditorModal(categoryKey);
                } else if (e.target.closest('.edit-category-btn')) {
                    openCategoryEditorModal(categoryKey);
                } else if (e.target.closest('.delete-category-btn')) {
                    deleteCategory(categoryKey, categoryName);
                } else if (e.target.closest('.expand-category-btn') || e.target.closest('.category-info-clickable')) {
                    const itemsContainer = document.getElementById(`items-${categoryKey}`);
                    const expandBtnIcon = header.querySelector('.expand-category-btn i');
                    const isVisible = itemsContainer.style.display === 'block';
                    itemsContainer.style.display = isVisible ? 'none' : 'block';
                    if(expandBtnIcon) { expandBtnIcon.classList.toggle('fa-chevron-down', isVisible); expandBtnIcon.classList.toggle('fa-chevron-up', !isVisible); }
                    if (!isVisible) { loadItemsIntoCategory(key, itemsContainer); }
                }
            });
        });
    }

    async function deleteCategory(categoryKey, categoryName) {
        const itemCount = window.menuData[categoryKey].items.length;
        if (confirm(`Tem certeza que deseja apagar a categoria "${categoryName}"? Todos os ${itemCount} itens dentro dela também serão apagados.`)) {
            delete window.menuData[categoryKey];
            await saveMenuToFirestore();
            renderCategories();
            window.showToast("Categoria excluída com sucesso!");
        }
    }

    function addItemActionListeners(container) {
        container.querySelectorAll('.edit-item-btn').forEach(button => {
            button.addEventListener('click', (e) => { const card = e.target.closest('.admin-menu-item-card'); const itemId = card.dataset.itemId; const categoryKey = card.dataset.categoryKey; openItemEditorModal(categoryKey, itemId); });
        });
        container.querySelectorAll('.delete-item-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const card = e.target.closest('.admin-menu-item-card'); const itemId = card.dataset.itemId; const categoryKey = card.dataset.categoryKey;
                const item = window.menuData[categoryKey].items.find(i => i.id == itemId);
                if (confirm(`Tem certeza que deseja excluir o item "${item.name}"?`)) {
                    const itemIndex = window.menuData[categoryKey].items.findIndex(i => i.id == itemId);
                    if (itemIndex > -1) {
                        window.menuData[categoryKey].items.splice(itemIndex, 1);
                        await saveMenuToFirestore();
                        card.remove();
                        const categoryHeader = document.querySelector(`.category-item[data-category-key="${categoryKey}"]`);
                        if (categoryHeader) { const countSpan = categoryHeader.querySelector('.item-count'); const newCount = window.menuData[categoryKey].items.length; countSpan.textContent = `${newCount} itens`; }
                        window.showToast("Item excluído com sucesso.");
                    }
                }
            });
        });
        
        container.querySelectorAll('.toggle-visibility-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const card = e.target.closest('.admin-menu-item-card');
                const itemId = card.dataset.itemId;
                const categoryKey = card.dataset.categoryKey;
                const item = window.menuData[categoryKey].items.find(i => i.id == itemId);

                if (item) {
                    item.isVisible = !(item.isVisible !== false);
                    await saveMenuToFirestore();
                    
                    const icon = button.querySelector('i');
                    card.classList.toggle('item-hidden', !item.isVisible);
                    icon.classList.toggle('fa-eye', item.isVisible);
                    icon.classList.toggle('fa-eye-slash', !item.isVisible);
                    window.showToast(`Item "${item.name}" agora está ${item.isVisible ? 'visível' : 'oculto'}.`);
                }
            });
        });
    }
    
    async function fetchStuffedCrusts() {
        if (!window.db || !window.firebaseFirestore) return [];
        const { collection, getDocs, query } = window.firebaseFirestore;
        try {
            const q = query(collection(window.db, STUFFED_CRUSTS_COLLECTION));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao buscar bordas recheadas:", error);
            window.showToast("Não foi possível carregar as bordas.", "error");
            return [];
        }
    }

    async function saveStuffedCrust(id, data) {
        const { doc, setDoc } = window.firebaseFirestore;
        try {
            await setDoc(doc(window.db, STUFFED_CRUSTS_COLLECTION, id), data);
            return true;
        } catch (error) {
            window.showToast("Falha ao salvar a borda.", "error");
            return false;
        }
    }

    async function deleteStuffedCrust(id, name) {
        if (!confirm(`Tem certeza que deseja apagar a borda "${name}"?`)) return false;
        const { doc, deleteDoc } = window.firebaseFirestore;
        try {
            await deleteDoc(doc(window.db, STUFFED_CRUSTS_COLLECTION, id));
            return true;
        } catch (error) {
            window.showToast("Falha ao apagar a borda.", "error");
            return false;
        }
    }

    function renderStuffedCrustsAdmin(crusts) {
        if (!stuffedCrustListContainer) return;

        const sortedCrusts = crusts.sort((a, b) => a.name.localeCompare(b.name));
        let listHTML;

        if (sortedCrusts.length > 0) {
            listHTML = sortedCrusts.map(crust => `
                <div class="stuffed-crust-card">
                    <div class="crust-info">
                        <i class="fas fa-cheese"></i>
                        <span class="crust-name">${crust.name}</span>
                        <span class="crust-type-tag ${crust.type || 'salgada'}">${crust.type || 'Salgada'}</span>
                    </div>
                    <div class="crust-info">
                        <span class="crust-price">R$ ${crust.price.toFixed(2).replace('.', ',')}</span>
                        <div class="crust-actions">
                            <button class="btn-icon edit-crust-btn" data-id="${crust.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-crust-btn" data-id="${crust.id}" data-name="${crust.name}" title="Apagar">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            listHTML = '<p style="text-align:center; padding: 20px;">Nenhuma borda cadastrada.</p>';
        }

        stuffedCrustListContainer.innerHTML = `<div class="stuffed-crust-list">${listHTML}</div>`;
        addStuffedCrustActionListeners(sortedCrusts);
    }

    function addStuffedCrustActionListeners(crusts) {
        stuffedCrustListContainer.querySelectorAll('.edit-crust-btn').forEach(button => {
            button.addEventListener('click', () => {
                const crustId = button.dataset.id;
                const crustData = crusts.find(c => c.id === crustId);
                if (crustData) {
                    stuffedCrustFormTitle.textContent = "Editar Borda";
                    stuffedCrustNameInput.value = crustData.name;
                    stuffedCrustPriceInput.value = crustData.price;
                    stuffedCrustTypeSelect.value = crustData.type || 'salgada';
                    stuffedCrustIdHidden.value = crustId;
                    cancelEditStuffedCrustBtn.classList.remove('hidden');
                    stuffedCrustNameInput.focus();
                }
            });
        });
        stuffedCrustListContainer.querySelectorAll('.delete-crust-btn').forEach(button => {
            button.addEventListener('click', async () => {
                if (await deleteStuffedCrust(button.dataset.id, button.dataset.name)) {
                    await mainStuffedCrustLogic();
                }
            });
        });
    }
    
    async function mainStuffedCrustLogic() {
        if(stuffedCrustListContainer) stuffedCrustListContainer.innerHTML = "<p>Carregando bordas...</p>";
        const crusts = await fetchStuffedCrusts();
        renderStuffedCrustsAdmin(crusts);
    }

    if (addCategoryForm) { addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const keyInput = document.getElementById('new-category-key');
            const nameInput = document.getElementById('new-category-name');
            const newKey = keyInput.value.trim().toLowerCase().replace(/\s+/g, '-');
            const newName = nameInput.value.trim();

            if (!newKey || !newName) {
                window.showToast('Preencha a chave e o nome da categoria.', "warning"); return;
            }

            if (keyInput.readOnly) {
                window.menuData[newKey].name = newName;
                window.showToast("Categoria atualizada com sucesso!");
            } else {
                if (window.menuData[newKey]) {
                    window.showToast('Erro: A "Chave da Categoria" já existe.', "error"); return;
                }
                window.menuData[newKey] = { name: newName, items: [] };
                window.showToast("Categoria criada com sucesso!");
            }
            
            await saveMenuToFirestore();
            addCategoryForm.reset();
            keyInput.readOnly = false;
            closeModal(addCategoryModal);
            renderCategories();
    });}

    if (itemEditorForm) {
        itemEditorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryKey = document.getElementById('edit-item-category-key').value;
            const itemId = document.getElementById('edit-item-id').value;
            const imagePath = document.getElementById('item-image').value.trim().replace('../', '');
            
            const isNewItem = !itemId;
            const updatedItemData = {
                id: isNewItem ? `item_${Date.now()}` : itemId,
                name: document.getElementById('item-name').value.trim(),
                description: document.getElementById('item-description').value.trim(),
                price: parseFloat(document.getElementById('item-price').value),
                image: imagePath,
                category: categoryKey
            };

            if (isNaN(updatedItemData.price)) { window.showToast("Por favor, insira um preço válido.", "error"); return; }
            
            if (isNewItem) {
                updatedItemData.isVisible = true;
                window.menuData[categoryKey].items.push(updatedItemData);
            } else {
                const itemIndex = window.menuData[categoryKey].items.findIndex(i => i.id == itemId);
                if (itemIndex > -1) {
                    const existingItem = window.menuData[categoryKey].items[itemIndex];
                    updatedItemData.isVisible = existingItem.isVisible !== false;
                    window.menuData[categoryKey].items[itemIndex] = updatedItemData;
                }
            }
            
            await saveMenuToFirestore();
            closeModal(itemEditorModal);
            const itemsContainer = document.getElementById(`items-${categoryKey}`);
            const categoryHeader = document.querySelector(`.category-item[data-category-key="${categoryKey}"]`);
            if (itemsContainer && categoryHeader) {
                const expandBtn = categoryHeader.querySelector('.expand-category-btn i');
                itemsContainer.style.display = 'block';
                if(expandBtn) { expandBtn.classList.remove('fa-chevron-down'); expandBtn.classList.add('fa-chevron-up'); }
                loadItemsIntoCategory(categoryKey, itemsContainer);
                const countSpan = categoryHeader.querySelector('.item-count');
                const newCount = window.menuData[categoryKey].items.length;
                countSpan.textContent = `${newCount} itens`;
            }
            window.showToast("Item salvo com sucesso!");
        });
    }

    if (stuffedCrustForm) {
        stuffedCrustForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = stuffedCrustNameInput.value.trim();
            const price = parseFloat(stuffedCrustPriceInput.value);
            const type = stuffedCrustTypeSelect.value;
            const id = stuffedCrustIdHidden.value || `borda_${Date.now()}`;
            if (!name || isNaN(price) || price < 0) { window.showToast("Por favor, preencha nome e preço corretamente.", "warning"); return; }
            if (await saveStuffedCrust(id, { name, price, type })) {
                cancelEditStuffedCrustBtn.click();
                await mainStuffedCrustLogic();
            }
        });
    }

    if (cancelEditStuffedCrustBtn) {
        cancelEditStuffedCrustBtn.addEventListener('click', () => {
            stuffedCrustForm.reset();
            stuffedCrustIdHidden.value = '';
            stuffedCrustFormTitle.textContent = "Adicionar Nova Borda";
            cancelEditStuffedCrustBtn.classList.add('hidden');
        });
    }
    
    if (addCategoryButton) addCategoryButton.addEventListener('click', () => openCategoryEditorModal());
    closeAddCategoryModalBtns.forEach(btn => btn.addEventListener('click', () => {
        closeModal(addCategoryModal);
        document.getElementById('new-category-key').readOnly = false;
    }));
    closeItemEditorModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(itemEditorModal)));

    renderCategories();
    mainStuffedCrustLogic();
}

window.initializeCardapioSection = initializeCardapioSection;
