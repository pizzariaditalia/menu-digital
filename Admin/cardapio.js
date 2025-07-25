// Arquivo: cardapio.js - VERSÃO COMPLETA E FINAL COM FICHA TÉCNICA

let cardapioSectionInitialized = false;

// Seletores de Elementos do DOM (definidos globalmente no escopo do módulo para serem acessados por múltiplas funções)
let categoryListContainer, addCategoryButton, addCategoryModal, addCategoryForm, closeAddCategoryModalBtns,
    itemEditorModal, itemEditorForm, itemEditorTitle, closeItemEditorModalBtns,
    stuffedCrustForm, stuffedCrustFormTitle, stuffedCrustNameInput, stuffedCrustPriceInput,
    stuffedCrustTypeSelect, stuffedCrustIdHidden, cancelEditStuffedCrustBtn, stuffedCrustListContainer;

// --- FUNÇÃO DE AJUDA ---
const formatPriceAdmin = (price) => (typeof price === 'number') ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00";

// Armazena a receita do item que está sendo editado no momento
let currentItemRecipe = [];

async function initializeCardapioSection() {
    // Se a seção já foi inicializada, apenas recarrega os dados para garantir que estejam atualizados
    if (cardapioSectionInitialized) {
        if (typeof mainStuffedCrustLogic === 'function') {
            mainStuffedCrustLogic();
        }
        renderCategories();
        return;
    }
    cardapioSectionInitialized = true;
    console.log("Módulo Cardapio.js: Inicializando PELA PRIMEIRA VEZ...");

    // --- Vincula as variáveis aos elementos do DOM ---
    categoryListContainer = document.getElementById('category-list-container');
    addCategoryButton = document.getElementById('add-category-button');
    addCategoryModal = document.getElementById('add-category-modal');
    addCategoryForm = document.getElementById('add-category-form');
    closeAddCategoryModalBtns = document.querySelectorAll('.close-modal-btn[data-modal-id="add-category-modal"]');
    itemEditorModal = document.getElementById('item-editor-modal');
    itemEditorForm = document.getElementById('item-editor-form');
    itemEditorTitle = document.getElementById('item-editor-title');
    closeItemEditorModalBtns = document.querySelectorAll('.close-modal-btn[data-modal-id="item-editor-modal"]');
    
    // Bordas Recheadas
    stuffedCrustForm = document.getElementById('stuffed-crust-form');
    stuffedCrustFormTitle = document.getElementById('stuffed-crust-form-title');
    stuffedCrustNameInput = document.getElementById('stuffed-crust-name');
    stuffedCrustPriceInput = document.getElementById('stuffed-crust-price');
    stuffedCrustTypeSelect = document.getElementById('stuffed-crust-type');
    stuffedCrustIdHidden = document.getElementById('stuffed-crust-id-hidden');
    cancelEditStuffedCrustBtn = document.getElementById('cancel-edit-stuffed-crust-btn');
    stuffedCrustListContainer = document.getElementById('stuffed-crust-list-container');

    // --- Seletores da Ficha Técnica ---
    const selectIngredient = document.getElementById('select-ingredient');
    const quantityUsedInput = document.getElementById('ingredient-quantity-used');
    const addIngredientBtn = document.getElementById('add-ingredient-to-recipe-btn');
    const recipeListContainer = document.getElementById('item-recipe-list');

    // --- Funções de Interação com o Firestore ---
    async function saveMenuToFirestore() {
        if (!window.db || !window.firebaseFirestore) {
            window.showToast("Erro: Conexão com Firestore não encontrada.", "error");
            return;
        }
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

    // --- Funções de UI (Interface do Cardápio) ---
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
        return `<div class="category-item" data-category-key="${categoryKey}"><div class="category-info-clickable"><i class="fas ${iconClass} category-icon"></i><div class="category-name-wrapper"><span class="category-name">${categoryName}</span><span class="item-count">${itemCount} itens</span></div></div><div class="category-actions"><button class="btn btn-sm btn-primary-outline add-item-btn" title="Adicionar item"><i class="fas fa-plus"></i></button><button class="btn btn-icon edit-category-btn" title="Editar categoria"><i class="fas fa-edit"></i></button><button class="btn btn-icon delete-category-btn btn-danger-outline" title="Excluir categoria"><i class="fas fa-trash-alt"></i></button><button class="btn btn-icon expand-category-btn" title="Ver itens"><i class="fas fa-chevron-down"></i></button></div></div><div class="pizza-items-in-category" id="items-${categoryKey}" style="display: none;"></div>`;
    }

    function createAdminPizzaItemHTML(item, categoryKey) {
        const imagePathForAdmin = `../${(item.image || 'img/placeholder.png').replace('../', '')}`;
        const isVisible = item.isVisible !== false;
        const visibilityIcon = isVisible ? 'fa-eye' : 'fa-eye-slash';
        const hiddenClass = isVisible ? '' : 'item-hidden';
        const itemCost = calculateItemCost(item);
        const profitMargin = (item.price > 0 && itemCost > 0) ? ((item.price - itemCost) / item.price) * 100 : 0;
        
        const costHtml = itemCost > 0 
            ? `<p class="price-details">Custo: <strong>${formatPriceAdmin(itemCost)}</strong> | Margem: <strong>${profitMargin.toFixed(0)}%</strong></p>` 
            : '';

        return `<div class="admin-menu-item-card ${hiddenClass}" data-item-id="${item.id}" data-category-key="${categoryKey}"><img src="${imagePathForAdmin}" alt="${item.name}" onerror="this.onerror=null;this.src='../img/placeholder.png';"><div class="details"><h4>${item.name}</h4><p>${item.description || 'Sem descrição.'}</p><p class="price">Venda: <strong>${formatPriceAdmin(item.price)}</strong></p>${costHtml}</div><div class="actions"><button class="btn btn-icon toggle-visibility-btn" title="Alternar visibilidade"><i class="fas ${visibilityIcon}"></i></button><button class="btn btn-sm edit-item-btn" title="Editar Item"><i class="fas fa-edit"></i></button><button class="btn btn-sm delete-item-btn btn-danger-outline" title="Excluir Item"><i class="fas fa-trash-alt"></i></button></div></div>`;
    }

    function renderCategories() {
        if (!categoryListContainer || !window.menuData) return;
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
        currentItemRecipe = [];
        document.getElementById('edit-item-category-key').value = categoryKey;
        if (selectIngredient) {
            selectIngredient.innerHTML = '<option value="">Selecione...</option>';
            (window.allIngredients || []).sort((a, b) => a.name.localeCompare(b.name)).forEach(ing => {
                selectIngredient.add(new Option(ing.name, ing.id));
            });
        }
        if (itemId) {
            itemEditorTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Item';
            const item = window.menuData[categoryKey].items.find(i => i.id == itemId);
            if (item) {
                document.getElementById('edit-item-id').value = item.id;
                document.getElementById('item-name').value = item.name;
                document.getElementById('item-description').value = item.description || '';
                document.getElementById('item-price').value = item.price;
                document.getElementById('item-image').value = item.image || '';
                currentItemRecipe = item.recipe || [];
            }
        } else {
            itemEditorTitle.innerHTML = '<i class="fas fa-plus"></i> Novo Item';
            document.getElementById('edit-item-id').value = '';
        }
        renderRecipeList();
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
                e.stopPropagation();
                const categoryKey = header.dataset.categoryKey;
                const categoryName = header.querySelector('.category-name').textContent;
                
                if (e.target.closest('.add-item-btn')) {
                    openItemEditorModal(categoryKey);
                } else if (e.target.closest('.edit-category-btn')) {
                    openCategoryEditorModal(categoryKey);
                } else if (e.target.closest('.delete-category-btn')) {
                    deleteCategory(categoryKey, categoryName);
                } else {
                    const itemsContainer = document.getElementById(`items-${categoryKey}`);
                    const expandBtnIcon = header.querySelector('.expand-category-btn i');
                    const isVisible = itemsContainer.style.display === 'block';
                    itemsContainer.style.display = isVisible ? 'none' : 'block';
                    if(expandBtnIcon) { expandBtnIcon.classList.toggle('fa-chevron-down', isVisible); expandBtnIcon.classList.toggle('fa-chevron-up', !isVisible); }
                    if (!isVisible) {
                        loadItemsIntoCategory(categoryKey, itemsContainer);
                    }
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
            button.addEventListener('click', (e) => { 
                const card = e.target.closest('.admin-menu-item-card'); 
                const itemId = card.dataset.itemId; 
                const categoryKey = card.dataset.categoryKey; 
                openItemEditorModal(categoryKey, itemId); 
            });
        });
        container.querySelectorAll('.delete-item-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const card = e.target.closest('.admin-menu-item-card'); 
                const itemId = card.dataset.itemId; 
                const categoryKey = card.dataset.categoryKey;
                const item = window.menuData[categoryKey].items.find(i => i.id == itemId);
                if (confirm(`Tem certeza que deseja excluir o item "${item.name}"?`)) {
                    const itemIndex = window.menuData[categoryKey].items.findIndex(i => i.id == itemId);
                    if (itemIndex > -1) {
                        window.menuData[categoryKey].items.splice(itemIndex, 1);
                        await saveMenuToFirestore();
                        card.remove();
                        const categoryHeader = document.querySelector(`.category-item[data-category-key="${categoryKey}"]`);
                        if (categoryHeader) { 
                            const countSpan = categoryHeader.querySelector('.item-count'); 
                            const newCount = window.menuData[categoryKey].items.length; 
                            countSpan.textContent = `${newCount} itens`; 
                        }
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
    
    // --- LÓGICA DA FICHA TÉCNICA ---
    function getCostPerBaseUnit(ingredient) {
        if (!ingredient || typeof ingredient.price !== 'number' || typeof ingredient.quantity !== 'number' || ingredient.quantity === 0) return 0;
        if (ingredient.unit === 'kg' || ingredient.unit === 'l') return ingredient.price / (ingredient.quantity * 1000);
        if (ingredient.unit === 'g' || ingredient.unit === 'ml') return ingredient.price / ingredient.quantity;
        return ingredient.price / ingredient.quantity;
    }

    function calculateItemCost(item) {
        if (!item.recipe || !Array.isArray(item.recipe) || !window.allIngredients) return 0;
        return item.recipe.reduce((total, recipeItem) => {
            const ingredient = window.allIngredients.find(i => i.id === recipeItem.id);
            return total + (getCostPerBaseUnit(ingredient) * recipeItem.quantity);
        }, 0);
    }
    
    function renderRecipeList() {
        if (!recipeListContainer) return;
        recipeListContainer.innerHTML = currentItemRecipe.map((recipeItem, index) => {
            const ingredient = window.allIngredients.find(i => i.id === recipeItem.id);
            if (!ingredient) return '';
            const itemCost = getCostPerBaseUnit(ingredient) * recipeItem.quantity;
            let unitLabel = 'un';
            if (ingredient.unit === 'kg' || ingredient.unit === 'g') unitLabel = 'g';
            if (ingredient.unit === 'l' || ingredient.unit === 'ml') unitLabel = 'ml';
            return `<div class="recipe-item-row" style="display:flex; justify-content:space-between; align-items:center; padding: 5px 0; border-bottom: 1px solid #eee;"><span>- ${ingredient.name} (${recipeItem.quantity} ${unitLabel})</span><div><span style="font-weight: 500;">${formatPriceAdmin(itemCost)}</span><button type="button" class="btn-icon btn-danger-outline remove-ingredient-btn" data-index="${index}" style="margin-left: 10px;"><i class="fas fa-times"></i></button></div></div>`;
        }).join('');
        recipeListContainer.querySelectorAll('.remove-ingredient-btn').forEach(button => {
            button.addEventListener('click', () => { currentItemRecipe.splice(button.dataset.index, 1); renderRecipeList(); });
        });
        updateTotalItemCost();
    }

    function updateTotalItemCost() {
        const totalCost = calculateItemCost({ recipe: currentItemRecipe });
        document.getElementById('item-cost-display').textContent = formatPriceAdmin(totalCost);
    }
    
    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', () => {
            const ingredientId = selectIngredient.value;
            const quantity = parseFloat(quantityUsedInput.value);
            if (!ingredientId || isNaN(quantity) || quantity <= 0) {
                window.showToast("Selecione um ingrediente e a quantidade.", "warning"); return;
            }
            currentItemRecipe.push({ id: ingredientId, quantity });
            renderRecipeList();
            selectIngredient.value = '';
            quantityUsedInput.value = '';
        });
    }
    
    // --- Event Listeners dos Formulários ---
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const keyInput = document.getElementById('new-category-key');
            const nameInput = document.getElementById('new-category-name');
            const newKey = keyInput.value.trim().toLowerCase().replace(/\s+/g, '-');
            const newName = nameInput.value.trim();
            if (!newKey || !newName) { window.showToast('Preencha a chave e o nome da categoria.', "warning"); return; }
            if (keyInput.readOnly) {
                window.menuData[newKey].name = newName;
                window.showToast("Categoria atualizada com sucesso!");
            } else {
                if (window.menuData[newKey]) { window.showToast('Erro: A "Chave da Categoria" já existe.', "error"); return; }
                window.menuData[newKey] = { name: newName, items: [] };
                window.showToast("Categoria criada com sucesso!");
            }
            await saveMenuToFirestore();
            addCategoryForm.reset();
            keyInput.readOnly = false;
            closeModal(addCategoryModal);
            renderCategories();
        });
    }

    if (itemEditorForm) {
        itemEditorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryKey = document.getElementById('edit-item-category-key').value;
            const itemId = document.getElementById('edit-item-id').value;
            const isNewItem = !itemId;
            const updatedItemData = {
                id: isNewItem ? `item_${Date.now()}` : itemId,
                name: document.getElementById('item-name').value.trim(),
                description: document.getElementById('item-description').value.trim(),
                price: parseFloat(document.getElementById('item-price').value),
                image: document.getElementById('item-image').value.trim().replace('../', ''),
                category: categoryKey,
                recipe: currentItemRecipe
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
            loadItemsIntoCategory(categoryKey, document.getElementById(`items-${categoryKey}`));
            const categoryHeader = document.querySelector(`.category-item[data-category-key="${categoryKey}"]`);
            if (categoryHeader) { 
                const countSpan = categoryHeader.querySelector('.item-count'); 
                countSpan.textContent = `${window.menuData[categoryKey].items.length} itens`; 
            }
            window.showToast("Item salvo com sucesso!");
        });
    }
    
    if (addCategoryButton) addCategoryButton.addEventListener('click', () => openCategoryEditorModal());
    closeAddCategoryModalBtns.forEach(btn => btn.addEventListener('click', () => {
        closeModal(addCategoryModal);
        document.getElementById('new-category-key').readOnly = false;
    }));
    closeItemEditorModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(itemEditorModal)));
    
    // --- EXECUÇÃO INICIAL ---
    if (typeof initializeIngredientsSection === 'function') {
        initializeIngredientsSection();
    }
    renderCategories();
    // A inicialização das bordas foi movida para uma função separada para ser chamada quando necessário
    if (typeof mainStuffedCrustLogic === 'function') {
        mainStuffedCrustLogic();
    }
}

window.initializeCardapioSection = initializeCardapioSection;