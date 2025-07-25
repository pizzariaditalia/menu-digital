// Arquivo: ingredientes.js

let ingredientsSectionInitialized = false;
const INGREDIENTS_COLLECTION = "ingredientes";

// Função principal que será chamada pelo cardapio.js
function initializeIngredientsSection() {
    if (ingredientsSectionInitialized) return;
    ingredientsSectionInitialized = true;
    console.log("Módulo Ingredientes.js: Inicializando...");

    // Seletores de Elementos do DOM
    const ingredientForm = document.getElementById('ingredient-form');
    const formTitle = document.getElementById('ingredient-form-title');
    const nameInput = document.getElementById('ingredient-name');
    const priceInput = document.getElementById('ingredient-price');
    const unitInput = document.getElementById('ingredient-unit');
    const quantityInput = document.getElementById('ingredient-quantity');
    const idHiddenInput = document.getElementById('ingredient-id-hidden');
    const cancelBtn = document.getElementById('cancel-edit-ingredient-btn');
    const listContainer = document.getElementById('ingredients-list-container');

    // --- Funções de Interação com o Firestore ---
    async function fetchIngredients() {
        const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
        try {
            const q = query(collection(window.db, INGREDIENTS_COLLECTION), orderBy("name"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao buscar ingredientes:", error);
            window.showToast("Erro ao carregar ingredientes.", "error");
            return [];
        }
    }

    async function saveIngredient(id, data) {
        const { doc, setDoc } = window.firebaseFirestore;
        try {
            await setDoc(doc(window.db, INGREDIENTS_COLLECTION, id), data);
            return true;
        } catch (error) {
            console.error("Erro ao salvar ingrediente:", error);
            window.showToast("Falha ao salvar o ingrediente.", "error");
            return false;
        }
    }
    
    async function deleteIngredient(id) {
        if (!confirm("Tem certeza que deseja apagar este ingrediente?")) return false;
        const { doc, deleteDoc } = window.firebaseFirestore;
        try {
            await deleteDoc(doc(window.db, INGREDIENTS_COLLECTION, id));
            return true;
        } catch (error) {
            console.error("Erro ao apagar ingrediente:", error);
            window.showToast("Falha ao apagar o ingrediente.", "error");
            return false;
        }
    }

    // --- Funções de UI (Interface) ---
    function renderIngredientsList(ingredients) {
        if (!listContainer) return;
        if (ingredients.length === 0) {
            listContainer.innerHTML = '<p class="empty-list-message">Nenhum ingrediente cadastrado.</p>';
            return;
        }

        const tableHTML = `
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Ingrediente</th>
                            <th>Preço Pago</th>
                            <th>Embalagem</th>
                            <th>Custo por Unidade Base</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ingredients.map(renderIngredientRow).join('')}
                    </tbody>
                </table>
            </div>
        `;
        listContainer.innerHTML = tableHTML;
        addIngredientActionListeners(ingredients);
    }

    function renderIngredientRow(ingredient) {
        const { name, price, unit, quantity } = ingredient;
        let costPerBaseUnit = 0;
        let baseUnitLabel = '';

        if (quantity > 0) {
            if (unit === 'kg' || unit === 'l') {
                costPerBaseUnit = price / (quantity * 1000);
                baseUnitLabel = unit === 'kg' ? '/g' : '/ml';
            } else {
                costPerBaseUnit = price / quantity;
                baseUnitLabel = '/un';
            }
        }
        
        const formattedCost = (costPerBaseUnit * (baseUnitLabel.includes('g') || baseUnitLabel.includes('ml') ? 1 : 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 });

        return `
            <tr>
                <td>${name}</td>
                <td>${formatPriceAdmin(price)}</td>
                <td>${quantity} ${unit}</td>
                <td>${formattedCost}${baseUnitLabel}</td>
                <td class="table-actions">
                    <button class="btn-icon edit-ingredient-btn" data-id="${ingredient.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete-ingredient-btn" data-id="${ingredient.id}" title="Apagar"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }
    
    function addIngredientActionListeners(ingredients) {
        listContainer.querySelectorAll('.edit-ingredient-btn').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.dataset.id;
                const data = ingredients.find(i => i.id === id);
                if (data) {
                    formTitle.textContent = "Editar Ingrediente";
                    idHiddenInput.value = id;
                    nameInput.value = data.name;
                    priceInput.value = data.price;
                    unitInput.value = data.unit;
                    quantityInput.value = data.quantity;
                    cancelBtn.classList.remove('hidden');
                    nameInput.focus();
                }
            });
        });

        listContainer.querySelectorAll('.delete-ingredient-btn').forEach(button => {
            button.addEventListener('click', async () => {
                if (await deleteIngredient(button.dataset.id)) {
                    main(); // Recarrega a lista
                }
            });
        });
    }

    // --- Event Listeners do Formulário ---
    ingredientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const id = idHiddenInput.value || name.toLowerCase().replace(/\s+/g, '-');
        
        const data = {
            name: name,
            price: parseFloat(priceInput.value),
            unit: unitInput.value,
            quantity: parseFloat(quantityInput.value)
        };

        if (!data.name || isNaN(data.price) || isNaN(data.quantity)) {
            window.showToast("Por favor, preencha todos os campos corretamente.", "warning");
            return;
        }

        if (await saveIngredient(id, data)) {
            cancelBtn.click();
            main(); // Recarrega a lista
        }
    });

    cancelBtn.addEventListener('click', () => {
        ingredientForm.reset();
        idHiddenInput.value = '';
        formTitle.textContent = "Adicionar Novo Ingrediente";
        cancelBtn.classList.add('hidden');
    });

    // --- Função Principal de Execução ---
    async function main() {
        const ingredients = await fetchIngredients();
        renderIngredientsList(ingredients);
    }

    main(); // Executa ao inicializar
}