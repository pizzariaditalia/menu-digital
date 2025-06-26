// promocoes.js - VERSÃO COMPLETA COM EDIÇÃO E VISIBILIDADE

let promotionsSectionInitialized = false;

async function initializePromotionsSection() {
    if (promotionsSectionInitialized) {
        // Se a seção já foi inicializada, apenas recarrega os dados para garantir que estão atualizados
        await main();
        return; 
    }
    promotionsSectionInitialized = true;
    console.log("Módulo Promocoes.js: Inicializando PELA PRIMEIRA VEZ...");

    // --- Seletores de Elementos ---
    const promotionForm = document.getElementById('new-promotion-form');
    const formTitle = document.getElementById('new-promotion-form-title'); 
    const toggleFormBtn = document.getElementById('toggle-new-promotion-form-btn');
    const cancelFormBtn = document.getElementById('cancel-new-promotion-btn');
    const itemSelect = document.getElementById('select-item-for-promotion');
    const originalPriceInput = document.getElementById('promotion-original-price');
    const newPriceInput = document.getElementById('promotion-new-price');
    const promotionsListContainer = document.getElementById('promotions-list-container');
    const hiddenPromoIdInput = document.getElementById('promotion-id-hidden'); 

    const PROMOTIONS_COLLECTION = "promotions";
    let allItems = [];
    let allPromotions = [];

    // --- Funções de Dados (Firestore) ---
    async function fetchPromotions() {
        if (!window.db || !window.firebaseFirestore) return [];
        const { collection, getDocs } = window.firebaseFirestore;
        try {
            const querySnapshot = await getDocs(collection(window.db, PROMOTIONS_COLLECTION));
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao buscar promoções:", error);
            return [];
        }
    }

    async function saveOrUpdatePromotion(promotionData, isUpdating) {
        const { doc, setDoc, updateDoc } = window.firebaseFirestore;
        // O ID do documento é o ID do item, para garantir que não haja duas promoções para o mesmo item
        const promotionDocRef = doc(window.db, PROMOTIONS_COLLECTION, promotionData.itemId);
        try {
            // Se estiver atualizando, usa updateDoc. Se for novo, usa setDoc.
            // setDoc com merge:true também funcionaria para ambos os casos.
            if (isUpdating) {
                await updateDoc(promotionDocRef, promotionData);
            } else {
                await setDoc(promotionDocRef, promotionData);
            }
            window.showToast("Promoção salva com sucesso!");
            return true;
        } catch (error) {
            console.error("Erro ao salvar promoção:", error);
            window.showToast("Erro ao salvar promoção.", "error");
            return false;
        }
    }

    async function deletePromotion(promotionId) {
        if (!confirm("Tem certeza que deseja remover esta promoção?")) return false;
        const { doc, deleteDoc } = window.firebaseFirestore;
        try {
            await deleteDoc(doc(window.db, PROMOTIONS_COLLECTION, promotionId));
            window.showToast("Promoção removida.");
            return true;
        } catch (error) {
            console.error("Erro ao remover promoção:", error);
            window.showToast("Erro ao remover promoção.", "error");
            return false;
        }
    }

    // --- Funções de UI (Interface) ---
    function populateItemsSelect() {
        if (!window.menuData) {
            itemSelect.innerHTML = '<option value="">Erro ao carregar cardápio</option>';
            return;
        }

        allItems = [];
        const currentSelectedValue = itemSelect.value;
        itemSelect.innerHTML = '<option value="" disabled selected>Selecione um item...</option>';
        
        Object.keys(window.menuData).forEach(categoryKey => {
            const category = window.menuData[categoryKey];
            if (category && category.items) {
                category.items.forEach(item => {
                    const fullItemData = { ...item, category: categoryKey };
                    allItems.push(fullItemData);
                    const option = new Option(`${item.name} (${category.name})`, item.id);
                    itemSelect.appendChild(option);
                });
            }
        });
        itemSelect.value = currentSelectedValue;
    }
    
    function openPromotionForm(promoId = null) {
        promotionForm.reset();
        populateItemsSelect(); // Popula o select primeiro
        const promo = promoId ? allPromotions.find(p => p.id === promoId) : null;
        
        if (promo) { // Modo de Edição
            if (formTitle) formTitle.textContent = "Editar Promoção";
            itemSelect.value = promo.itemId;
            itemSelect.disabled = true; // Impede a troca do item na edição
            originalPriceInput.value = promo.originalPrice.toFixed(2);
            newPriceInput.value = promo.newPrice;
            if(hiddenPromoIdInput) hiddenPromoIdInput.value = promo.id;
        } else { // Modo de Criação
            if (formTitle) formTitle.textContent = "Criar Nova Promoção";
            itemSelect.disabled = false;
            originalPriceInput.value = '';
            if(hiddenPromoIdInput) hiddenPromoIdInput.value = "";
        }
        
        promotionForm.style.display = 'block';
    }
    
    function renderPromotionsList(promotions) {
        if (promotions.length === 0) {
            promotionsListContainer.innerHTML = '<p class="empty-list-message">Nenhuma promoção criada no momento.</p>';
            return;
        }

        promotionsListContainer.innerHTML = promotions.map(promo => {
            const formatPrice = (price) => `R$ ${price ? price.toFixed(2).replace('.', ',') : '0,00'}`;
            const isActive = promo.active !== false;
            const hiddenClass = isActive ? '' : 'item-hidden';
            const visibilityIcon = isActive ? 'fa-eye' : 'fa-eye-slash';

            return `
                <div class="admin-menu-item-card ${hiddenClass}" data-promo-id="${promo.id}">
                    <img src="../${(promo.image || 'img/placeholder.png').replace('../', '')}" alt="${promo.name}" onerror="this.onerror=null;this.src='../img/placeholder.png';">
                    <div class="details">
                        <h4>${promo.name}</h4>
                        <p>De: <span style="text-decoration: line-through;">${formatPrice(promo.originalPrice)}</span></p>
                        <p><strong>Por: <span style="color: var(--admin-success-green);">${formatPrice(promo.newPrice)}</span></strong></p>
                    </div>
                    <div class="actions">
                        <button class="btn btn-icon toggle-promo-visibility-btn" title="Alternar visibilidade"><i class="fas ${visibilityIcon}"></i></button>
                        <button class="btn btn-sm edit-promotion-btn" title="Editar Promoção"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm delete-promotion-btn btn-danger" title="Remover Promoção"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        addPromotionActionListeners(promotions);
    }
    
    function addPromotionActionListeners(promotions) {
        promotionsListContainer.querySelectorAll('.delete-promotion-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const promoId = e.target.closest('.admin-menu-item-card').dataset.promoId;
                if (await deletePromotion(promoId)) main(); 
            });
        });

        promotionsListContainer.querySelectorAll('.edit-promotion-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const promoId = e.target.closest('.admin-menu-item-card').dataset.promoId;
                openPromotionForm(promoId);
            });
        });

        promotionsListContainer.querySelectorAll('.toggle-promo-visibility-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const card = e.target.closest('.admin-menu-item-card');
                const promoId = card.dataset.promoId;
                const promo = promotions.find(p => p.id === promoId);
                if (promo) {
                    const newStatus = !(promo.active !== false);
                    const { doc, updateDoc } = window.firebaseFirestore;
                    const promoDocRef = doc(window.db, PROMOTIONS_COLLECTION, promoId);
                    try {
                        await updateDoc(promoDocRef, { active: newStatus });
                        window.showToast(`Promoção "${promo.name}" agora está ${newStatus ? 'visível' : 'oculta'}.`);
                        promo.active = newStatus;
                        card.classList.toggle('item-hidden', !newStatus);
                        const icon = button.querySelector('i');
                        icon.classList.toggle('fa-eye', newStatus);
                        icon.classList.toggle('fa-eye-slash', !newStatus);
                    } catch (error) {
                        window.showToast("Erro ao atualizar promoção.", "error");
                    }
                }
            });
        });
    }

    // --- Lógica de Eventos ---
    if (toggleFormBtn) {
        toggleFormBtn.addEventListener('click', () => openPromotionForm());
    }

    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', () => {
            promotionForm.style.display = 'none';
            promotionForm.reset();
            itemSelect.disabled = false;
        });
    }

    if (itemSelect) {
        itemSelect.addEventListener('change', () => {
            const selectedId = itemSelect.value;
            const selectedItem = allItems.find(item => item.id === selectedId);
            if (selectedItem) {
                originalPriceInput.value = selectedItem.price.toFixed(2);
                newPriceInput.focus();
            }
        });
    }

    if (promotionForm) {
        promotionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedId = itemSelect.value;
            const selectedItem = allItems.find(item => item.id === selectedId);
            const newPrice = parseFloat(newPriceInput.value);
            const promoId = hiddenPromoIdInput ? hiddenPromoIdInput.value : null;
            const isUpdating = !!promoId;

            if (!selectedItem || isNaN(newPrice) || newPrice <= 0) {
                window.showToast("Selecione um item e insira um preço válido.", "error");
                return;
            }
            
            const promotionData = {
                itemId: selectedItem.id,
                name: selectedItem.name,
                description: selectedItem.description,
                image: selectedItem.image || '',
                originalPrice: selectedItem.price,
                newPrice: newPrice,
                // Mantém o status atual ao editar, ou define como true se for nova
                active: isUpdating ? allPromotions.find(p => p.id === promoId).active !== false : true, 
                // Mantém a data de criação original ao editar
                createdAt: isUpdating ? allPromotions.find(p => p.id === promoId).createdAt : new Date().toISOString()
            };

            if (await saveOrUpdatePromotion(promotionData, isUpdating)) {
                promotionForm.style.display = 'none';
                promotionForm.reset();
                itemSelect.disabled = false;
                main(); 
            }
        });
    }

    // --- Função Principal ---
    async function main() {
        allPromotions = await fetchPromotions();
        renderPromotionsList(allPromotions);
    }
    
    main();
}

window.initializePromotionsSection = initializePromotionsSection;
