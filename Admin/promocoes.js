// Arquivo: promocoes.js

// Adicione esta linha no topo do arquivo (fora de qualquer função)
let promotionsSectionInitialized = false;

async function initializePromotionsSection() {
    // Adicione esta verificação no início da função
    if (promotionsSectionInitialized) {
        return; // Se já foi inicializado, não faz nada e sai da função
    }
    promotionsSectionInitialized = true; // Marca como inicializado
    
    console.log("Módulo Promocoes.js: Inicializando PELA PRIMEIRA VEZ...");

    // --- Seletores de Elementos ---
    const promotionForm = document.getElementById('new-promotion-form');
    const toggleFormBtn = document.getElementById('toggle-new-promotion-form-btn');
    const cancelFormBtn = document.getElementById('cancel-new-promotion-btn');
    const itemSelect = document.getElementById('select-item-for-promotion');
    const originalPriceInput = document.getElementById('promotion-original-price');
    const newPriceInput = document.getElementById('promotion-new-price');
    const promotionsListContainer = document.getElementById('promotions-list-container');
    const PROMOTIONS_COLLECTION = "promotions";

    let allItems = [];

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

    async function savePromotion(promotionData) {
        const { doc, setDoc } = window.firebaseFirestore;
        const promotionDocRef = doc(window.db, PROMOTIONS_COLLECTION, promotionData.itemId);
        try {
            await setDoc(promotionDocRef, promotionData);
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
    }
    
    function renderPromotionsList(promotions) {
        if (promotions.length === 0) {
            promotionsListContainer.innerHTML = '<p class="empty-list-message">Nenhuma promoção ativa no momento.</p>';
            return;
        }

        promotionsListContainer.innerHTML = promotions.map(promo => {
            const formatPrice = (price) => `R$ ${price.toFixed(2).replace('.', ',')}`;
            return `
                <div class="admin-menu-item-card" data-promo-id="${promo.id}">
                    <img src="../${(promo.image || 'img/placeholder.png').replace('../', '')}" alt="${promo.name}" onerror="this.onerror=null;this.src='../img/placeholder.png';">
                    <div class="details">
                        <h4>${promo.name}</h4>
                        <p>De: <span style="text-decoration: line-through;">${formatPrice(promo.originalPrice)}</span></p>
                        <p><strong>Por: <span style="color: var(--admin-success-green);">${formatPrice(promo.newPrice)}</span></strong></p>
                    </div>
                    <div class="actions">
                        <button class="btn btn-sm delete-promotion-btn btn-danger" title="Remover Promoção"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        promotionsListContainer.querySelectorAll('.delete-promotion-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const promoId = e.target.closest('.admin-menu-item-card').dataset.promoId;
                if (await deletePromotion(promoId)) {
                    main(); 
                }
            });
        });
    }

    // --- Lógica de Eventos ---
    if (toggleFormBtn) {
        toggleFormBtn.addEventListener('click', () => {
            const isHidden = !promotionForm.style.display || promotionForm.style.display === 'none';
            
            if (isHidden) {
                promotionForm.style.display = 'block';
                populateItemsSelect();
            } else {
                promotionForm.style.display = 'none';
            }
        });
    }

    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', () => {
            promotionForm.style.display = 'none';
            promotionForm.reset();
            originalPriceInput.value = '';
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
                createdAt: new Date().toISOString()
            };

            if (await savePromotion(promotionData)) {
                promotionForm.style.display = 'none';
                promotionForm.reset();
                main(); 
            }
        });
    }

    // --- Função Principal ---
    async function main() {
        const promotions = await fetchPromotions();
        renderPromotionsList(promotions);
    }
    
    main();
}

window.initializePromotionsSection = initializePromotionsSection;