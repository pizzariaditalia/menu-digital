// Arquivo: ingredientes.js - VERSÃO COM CONTROLE DE ESTOQUE

let ingredientsSectionInitialized = false;
const INGREDIENTS_COLLECTION = "ingredientes";

async function fetchIngredients() {
    if (!window.db || !window.firebaseFirestore) return [];
    const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
    try {
        const q = query(collection(window.db, INGREDIENTS_COLLECTION), orderBy("name"));
        const snapshot = await getDocs(q);
        window.allIngredients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return window.allIngredients;
    } catch (error) {
        console.error("Erro ao buscar ingredientes:", error);
        return [];
    }
}
window.fetchIngredients = fetchIngredients;

function initializeIngredientsSection() {
    if (ingredientsSectionInitialized) return;
    ingredientsSectionInitialized = true;
    console.log("Módulo Ingredientes.js: Inicializando...");

    const ingredientForm = document.getElementById('ingredient-form');
    const formTitle = document.getElementById('ingredient-form-title');
    const nameInput = document.getElementById('ingredient-name');
    const priceInput = document.getElementById('ingredient-price');
    const unitInput = document.getElementById('ingredient-unit');
    const quantityInput = document.getElementById('ingredient-quantity');
    const stockInput = document.getElementById('ingredient-stock'); // NOVO
    const idHiddenInput = document.getElementById('ingredient-id-hidden');
    const cancelBtn = document.getElementById('cancel-edit-ingredient-btn');
    const listContainer = document.getElementById('ingredients-list-container');

    async function saveIngredient(id, data) {
        const { doc, setDoc } = window.firebaseFirestore;
        try {
            await setDoc(doc(window.db, INGREDIENTS_COLLECTION, id), data, { merge: true });
            return true;
        } catch (error) {
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
            return false;
        }
    }

    function renderIngredientsList(ingredients) {
        if (!listContainer) return;
        const tableHTML = `
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Ingrediente</th>
                            <th>Estoque Atual</th>
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
        const { name, price, unit, quantity, stock = 0 } = ingredient;
        let costPerBaseUnit = 0, baseUnitLabel = '', stockUnitLabel = '';

        if (quantity > 0) {
            if (unit === 'kg') { costPerBaseUnit = price / (quantity * 1000); baseUnitLabel = '/g'; stockUnitLabel = 'g'; }
            else if (unit === 'l') { costPerBaseUnit = price / (quantity * 1000); baseUnitLabel = '/ml'; stockUnitLabel = 'ml'; }
            else { costPerBaseUnit = price / quantity; baseUnitLabel = '/un'; stockUnitLabel = 'un'; }
        }
        
        const formattedCost = (costPerBaseUnit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 });
        const stockLevelClass = stock < 100 ? 'text-danger' : ''; // Alerta de estoque baixo

        return `
            <tr>
                <td>${name}</td>
                <td class="${stockLevelClass}"><strong>${stock.toLocaleString('pt-BR')} ${stockUnitLabel}</strong></td>
                <td>${formattedCost}${baseUnitLabel}</td>
                <td class="table-actions">
                    <button class="btn-icon edit-ingredient-btn" data-id="${ingredient.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete-ingredient-btn" data-id="${ingredient.id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }
    
    function addIngredientActionListeners(ingredients) {
        listContainer.querySelectorAll('.edit-ingredient-btn').forEach(button => {
            button.addEventListener('click', () => {
                const data = ingredients.find(i => i.id === button.dataset.id);
                if (data) {
                    formTitle.textContent = "Editar Ingrediente";
                    idHiddenInput.value = data.id;
                    nameInput.value = data.name;
                    priceInput.value = data.price;
                    unitInput.value = data.unit;
                    quantityInput.value = data.quantity;
                    stockInput.value = data.stock || 0;
                    cancelBtn.classList.remove('hidden');
                    nameInput.focus();
                }
            });
        });

        listContainer.querySelectorAll('.delete-ingredient-btn').forEach(button => {
            button.addEventListener('click', async () => {
                if (await deleteIngredient(button.dataset.id)) main();
            });
        });
    }

    ingredientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const id = idHiddenInput.value || name.toLowerCase().replace(/\s+/g, '-');
        
        const data = {
            name: name,
            price: parseFloat(priceInput.value),
            unit: unitInput.value,
            quantity: parseFloat(quantityInput.value),
            stock: parseInt(stockInput.value, 10) // NOVO
        };

        if (!data.name || isNaN(data.price) || isNaN(data.quantity) || isNaN(data.stock)) {
            window.showToast("Preencha todos os campos corretamente.", "warning");
            return;
        }

        if (await saveIngredient(id, data)) {
            cancelBtn.click();
            main();
        }
    });

    cancelBtn.addEventListener('click', () => {
        ingredientForm.reset();
        idHiddenInput.value = '';
        formTitle.textContent = "Adicionar Novo Ingrediente";
        cancelBtn.classList.add('hidden');
    });

    async function main() {
        const ingredients = await fetchIngredients();
        renderIngredientsList(ingredients);
    }

    main();
}