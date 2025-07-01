// promocoes.js - VERSÃO COM CORREÇÃO FINAL DE ESCOPO E INICIALIZAÇÃO

let promotionsSectionInitialized = false;
let allPromotions = [];
let allItems = [];

// Variáveis para os elementos do DOM
let promotionForm, formTitle, toggleFormBtn, cancelFormBtn, itemSelect, 
    originalPriceInput, newPriceInput, promotionsListContainer, hiddenPromoIdInput;

const PROMOTIONS_COLLECTION = "promotions";

async function initializePromotionsSection() {
    if (promotionsSectionInitialized) {
        // Se a seção já foi inicializada, apenas recarrega os dados
        await refreshPromotionsData();
        return; 
    }
    promotionsSectionInitialized = true;
    console.log("Módulo Promocoes.js: Inicializando PELA PRIMEIRA VEZ...");

    // --- Seleciona os Elementos do DOM (apenas na primeira vez) ---
    promotionForm = document.getElementById('new-promotion-form');
    formTitle = document.getElementById('new-promotion-form-title'); 
    toggleFormBtn = document.getElementById('toggle-new-promotion-form-btn');
    cancelFormBtn = document.getElementById('cancel-new-promotion-btn');
    itemSelect = document.getElementById('select-item-for-promotion');
    originalPriceInput = document.getElementById('promotion-original-price');
    newPriceInput = document.getElementById('promotion-new-price');
    promotionsListContainer = document.getElementById('promotions-list-container');
    hiddenPromoIdInput = document.getElementById('promotion-id-hidden'); 

    // --- Adiciona os Event Listeners (apenas na primeira vez) ---
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
                active: isUpdating ? allPromotions.find(p => p.id === promoId).active !== false : true, 
                createdAt: isUpdating ? allPromotions.find(p => p.id === promoId).createdAt : new Date().toISOString()
            };

            if (await saveOrUpdatePromotion(promotionData, isUpdating)) {
                promotionForm.style.display = 'none';
                promotionForm.reset();
                itemSelect.disabled = false;
                await refreshPromotionsData(); 
            }
        });
    }
    
    // --- Execução Inicial ---
    await refreshPromotionsData();
}

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
    const promotionDocRef = doc(window.db, PROMOTIONS_COLLECTION, promotionData.itemId);
    try {
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
    if (!window.menuData || !itemSelect) {
        if(itemSelect) itemSelect.innerHTML = '<option value="">Erro ao carregar cardápio</option>';
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
    populateItemsSelect();
    const promo = promoId ? allPromotions.find(p => p.id === promoId) : null;
    
    if (promo) {
        if (formTitle) formTitle.textContent = "Editar Promoção";
        itemSelect.value = promo.itemId;
        itemSelect.disabled = true;
        originalPriceInput.value = promo.originalPrice.toFixed(2);
        newPriceInput.value = promo.newPrice;
        if(hiddenPromoIdInput) hiddenPromoIdInput.value = promo.id;
    } else {
        if (formTitle) formTitle.textContent = "Criar Nova Promoção";
        itemSelect.disabled = false;
        originalPriceInput.value = '';
        if(hiddenPromoIdInput) hiddenPromoIdInput.value = "";
    }
    
    promotionForm.style.display = 'block';
}

function renderPromotionsList(promotions) {
    if (!promotionsListContainer) return;
    if (!promotions || promotions.length === 0) {
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
    if (!promotionsListContainer) return;
    promotionsListContainer.querySelectorAll('.delete-promotion-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const promoId = e.target.closest('.admin-menu-item-card').dataset.promoId;
            if (await deletePromotion(promoId)) await refreshPromotionsData(); 
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

// --- Função Principal de Atualização de Dados ---
async function refreshPromotionsData() {
    allPromotions = await fetchPromotions();
    renderPromotionsList(allPromotions);
}

window.initializePromotionsSection = initializePromotionsSection;
