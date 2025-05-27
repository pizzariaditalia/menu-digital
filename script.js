document.addEventListener('DOMContentLoaded', () => {
    const menu = {
        'Pizzas Tradicionais': [
            { id: 'pt1', name: 'Muçarela', price: 45.90, description: 'Molho, queijo muçarela e tomate' },
            { id: 'pt2', name: 'Muçarela ao Alho', price: 47.90, description: 'Molho, muçarela e alho frito' },
            { id: 'pt3', name: 'Toscana', price: 49.90, description: 'Molho, muçarela e calabresa ralada' },
            { id: 'pt4', name: 'Bauru', price: 50.90, description: 'Molho, presunto, tomate e muçarela' },
            { id: 'pt5', name: 'Caipira', price: 50.90, description: 'Molho, frango desfiado, milho verde e muçarela' },
            { id: 'pt6', name: 'Frango com Catupiry', price: 55.90, description: 'Molho, frango desfiado e catupiry' },
            { id: 'pt7', name: 'Portuguesa', price: 52.90, description: 'Molho, presunto, palmito, ervilha, ovo e cebola' },
            { id: 'pt8', name: 'Calabresa', price: 55.90, description: 'Molho, calabresa fatiada, muçarela e cebola' },
            { id: 'pt9', name: 'Atum', price: 48.90, description: 'Molho, atum ralado, muçarela e cebola' },
            { id: 'pt10', name: 'Atum Especial', price: 58.90, description: 'Molho, atum ralado e cebola' },
            { id: 'pt11', name: 'Mafiosa', price: 58.90, description: 'Molho, muçarela, calabresa, bacon, ovo e cebola' },
            { id: 'pt12', name: 'Marguerita', price: 50.90, description: 'Molho, muçarela, tomate, parmesão e manjericão' },
            { id: 'pt13', name: 'Napolitana', price: 55.90, description: 'Molho, muçarela, tomate e parmesão' },
            { id: 'pt14', name: 'Palmito', price: 49.90, description: 'Molho, palmito pupunha e muçarela' },
            { id: 'pt15', name: 'Brócolis com Bacon', price: 49.90, description: 'Molho, muçarela, brócolis, bacon e alho frito' },
            { id: 'pt16', name: 'Quatro Queijos', price: 52.90, description: 'Molho, muçarela, parmesão, catupiry e gorgonzola' },
            { id: 'pt17', name: 'Milho Verde', price: 48.90, description: 'Molho, muçarela e milho verde' },
            { id: 'pt18', name: 'Lombo Canadense', price: 52.90, description: 'Molho, lombo fatiado e catupiry' },
            { id: 'pt19', name: 'Peperoni', price: 55.90, description: 'Molho, muçarela e peperoni' },
            { id: 'pt20', name: 'Palmito ao Catupiry', price: 52.90, description: 'Molho, muçarela, palmito pupunha e catupiry' },
            { id: 'pt21', name: 'Vegetariana', price: 57.90, description: 'Molho, muçarela, brócolis, palmito, milho e ervilha' }
        ],
        'Pizzas Especiais': [
            { id: 'pe1', name: 'A Moda do Chefe', price: 69.90, description: 'Molho, muçarela, alho poró, presunto Parma e damasco' },
            { id: 'pe2', name: 'Caprese', price: 62.90, description: 'Molho, muçarela de búfala, rúcula e tomate seco' },
            { id: 'pe3', name: 'Búfala ao Pesto', price: 58.90, description: 'Molho, muçarela de búfala, tomate seco e molho pesto' },
            { id: 'pe4', name: 'Especial da Casa', price: 55.90, description: 'Molho, muçarela, calabresa, frango, bacon, cebola e catupiry' },
            { id: 'pe5', name: 'Frango Bacon com Catupiry', price: 59.90, description: 'Molho, muçarela, frango desfiado, cebola, bacon e catupiry' }
        ],
        'Pizzas Doces': [
            { id: 'pd1', name: 'Banana com Canela', price: 40.90, description: 'Creme de leite, banana fatiada, canela e leite condensado' },
            { id: 'pd2', name: 'Queijadinha', price: 45.90, description: 'Creme de leite, muçarela, coco em flocos e leite condensado' },
            { id: 'pd3', name: 'Romeu e Julieta', price: 49.90, description: 'Creme de leite, muçarela, goiabada cremosa e catupiry' },
            { id: 'pd4', name: 'Charge', price: 45.90, description: 'Creme de leite, ganache de chocolate, doce de leite e amendoim' },
            { id: 'pd5', name: 'Brigadeiro', price: 42.90, description: 'Creme de leite, ganache de chocolate e lascas de barra Garoto' },
            { id: 'pd6', name: 'M&M\'s', price: 45.90, description: 'Creme de leite, ganache de chocolate e M&M\'s' }
        ],
        'Bordas': [
            { id: 'b1', name: 'Borda Vulcão', price: 0.00, description: 'Catupiry ou Cheddar' },
            { id: 'b2', name: 'Borda em Forma de Camarão', price: 0.00, description: 'Catupiry ou Cheddar' },
            { id: 'b3', name: 'Borda Trançada', price: 0.00, description: 'Catupiry, Cheddar, doce de leite ou goiaba cremosa' }
        ],
        'Bebidas': [
            { id: 'be1', name: 'Coca-Cola 2L', price: 18.00, description: '' },
            { id: 'be2', name: 'Fanta Laranja 2L', price: 15.00, description: '' },
            { id: 'be3', name: 'Guaraná Antártica 2L', price: 10.00, description: '' }
        ]
    };

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    const productModal = document.getElementById('productModal');
    const cartModal = document.getElementById('cartModal');
    const checkoutModal = document.getElementById('checkoutModal');
    const categoryMenu = document.getElementById('categoryMenu');
    const menuCategories = document.querySelectorAll('.menu-category');
    const categoryButtons = document.querySelectorAll('.category-button');
    const mainContent = document.querySelector('.main-content');

    const closeModalButtons = document.querySelectorAll('.close-button');
    const cartFloatButton = document.getElementById('cart-float-button');
    const addToCartButton = document.getElementById('addToCartButton');
    const checkoutButton = document.getElementById('checkoutButton');

    let selectedProduct = null;
    let firstHalfPizza = null;

    function renderMenuItems(categoryName, targetElement) {
        targetElement.innerHTML = '';
        if (menu[categoryName]) {
            menu[categoryName].forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('menu-item');
                itemElement.innerHTML = `
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <div class="item-footer">
                        <span class="item-price">R$ ${item.price.toFixed(2).replace('.', ',')}</span>
                        <button class="add-button" data-product-id="${item.id}" data-product-category="${categoryName}">+</button>
                    </div>
                `;
                targetElement.appendChild(itemElement);
            });
        }
    }

    function showCategory(category) {
        menuCategories.forEach(cat => cat.classList.remove('active'));
        categoryButtons.forEach(button => button.classList.remove('active'));

        const activeCategorySection = document.getElementById(category);
        const activeButton = document.querySelector(`.category-button[data-category="${category}"]`);

        if (activeCategorySection) {
            activeCategorySection.classList.add('active');
            const categoryNameForData = Object.keys(menu).find(key => key.toLowerCase().replace(/ /g, '-') === category);
            const targetDiv = activeCategorySection.querySelector('.menu-items');
            if (categoryNameForData) {
                renderMenuItems(categoryNameForData, targetDiv);
            }
        }
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    function openProductModal(productId, productCategory) {
        for (const category in menu) {
            const product = menu[category].find(item => item.id === productId);
            if (product) {
                selectedProduct = product;
                document.getElementById('modalProductName').textContent = selectedProduct.name;
                document.getElementById('modalProductDescription').textContent = selectedProduct.description;
                document.getElementById('modalProductPrice').textContent = selectedProduct.price.toFixed(2).replace('.', ',');

                const pizzaTypeSelect = document.getElementById('pizzaType');
                if (productCategory.toLowerCase().includes('pizza')) {
                    pizzaTypeSelect.style.display = 'block';
                    pizzaTypeSelect.previousElementSibling.style.display = 'block';
                } else {
                    pizzaTypeSelect.style.display = 'none';
                    pizzaTypeSelect.previousElementSibling.style.display = 'none';
                }

                document.getElementById('productObservation').value = '';
                productModal.style.display = 'flex';
                break;
            }
        }
    }

    addToCartButton.addEventListener('click', () => {
        const pizzaType = document.getElementById('pizzaType').value;
        const observation = document.getElementById('productObservation').value;

        if (!selectedProduct) return;

        if (pizzaType === 'metade') {
            if (!firstHalfPizza) {
                firstHalfPizza = {
                    id: selectedProduct.id,
                    name: selectedProduct.name,
                    price: selectedProduct.price,
                    description: selectedProduct.description
                };
                productModal.style.display = 'none';
                alert('Agora selecione a outra metade da pizza.');
            } else {
                const averagePrice = ((firstHalfPizza.price + selectedProduct.price) / 2).toFixed(2);
                const combinedName = `${firstHalfPizza.name} / ${selectedProduct.name}`;
                const combinedId = `${firstHalfPizza.id}-${selectedProduct.id}`;
                const combinedDescription = `${firstHalfPizza.description} / ${selectedProduct.description}`;

                let newItem = {
                    id: combinedId,
                    name: combinedName + ' (1/2)',
                    price: parseFloat(averagePrice),
                    description: combinedDescription,
                    type: 'metade-metade',
                    observation: observation,
                    quantity: 1
                };

                cart.push(newItem);
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartDisplay();
                productModal.style.display = 'none';
                firstHalfPizza = null;
            }
        } else {
            let newItem = {
                id: selectedProduct.id,
                name: selectedProduct.name,
                price: selectedProduct.price,
                description: selectedProduct.description,
                type: pizzaType,
                observation: observation,
                quantity: 1
            };

            const existingItem = cart.find(item => item.id === newItem.id && item.observation === newItem.observation);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push(newItem);
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();
            productModal.style.display = 'none';
        }
    });

    function updateCartDisplay() {
    const cartItemCount = document.getElementById('cart-item-count');
    const cartTotal = document.getElementById('cart-total');
    const cartModalTotal = document.getElementById('cart-modal-total');
    const cartItemsList = document.getElementById('cart-items-list');
    const emptyCartMessage = document.getElementById('empty-cart-message');

    let totalItems = 0;
    let totalPrice = 0;

    cartItemsList.innerHTML = '';
    
    if (cart.length === 0) {
        emptyCartMessage.style.display = 'block';
    } else {
        emptyCartMessage.style.display = 'none';

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            totalItems += item.quantity;
            totalPrice += itemTotal;

            const cartItem = document.createElement('div');
            cartItem.classList.add('cart-item');
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.name}</span>
                    ${item.observation ? `<span class="cart-item-observation">Obs: ${item.observation}</span>` : ''}
                    <span class="cart-item-details">R$ ${item.price.toFixed(2).replace('.', ',')} x ${item.quantity}</span>
                </div>
                <div class="cart-item-actions">
                    <button class="add-to-cart-modal-button" data-index="${index}" data-action="decrease">-</button>
                    <span class="cart-item-quantity">${item.quantity}</span>
                    <button class="add-to-cart-modal-button" data-index="${index}" data-action="increase">+</button>
                    <span class="cart-item-price">= R$ ${itemTotal.toFixed(2).replace('.', ',')}</span>
                </div>
            `;
            cartItemsList.appendChild(cartItem);
        });
    }

    // Atualiza contadores do botão flutuante e total
    cartItemCount.textContent = totalItems;
    cartTotal.textContent = totalPrice.toFixed(2).replace('.', ',');
    cartModalTotal.textContent = totalPrice.toFixed(2).replace('.', ',');

    // Eventos de + e - quantidade
    document.querySelectorAll('.cart-item-actions button').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const action = e.target.dataset.action;
            updateItemQuantity(index, action);
        });
    });
}

    function updateItemQuantity(index, action) {
        if (index >= 0 && index < cart.length) {
            if (action === 'increase') {
                cart[index].quantity++;
            } else if (action === 'decrease') {
                cart[index].quantity--;
                if (cart[index].quantity <= 0) {
                    cart.splice(index, 1);
                }
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();
        }
    }

    categoryMenu.addEventListener('click', (event) => {
        if (event.target.classList.contains('category-button')) {
            event.preventDefault();
            const category = event.target.dataset.category;
            showCategory(category);
        }
    });

    cartFloatButton.addEventListener('click', () => {
        cartModal.style.display = 'flex';
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            productModal.style.display = 'none';
            cartModal.style.display = 'none';
            checkoutModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === productModal) productModal.style.display = 'none';
        if (event.target === cartModal) cartModal.style.display = 'none';
        if (event.target === checkoutModal) checkoutModal.style.display = 'none';
    });

    mainContent.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-button')) {
            const productId = event.target.dataset.productId;
            const productCategory = event.target.dataset.productCategory;
            openProductModal(productId, productCategory);
        }
    });

    showCategory('pizzas-tradicionais');
    updateCartDisplay();
});

const clearCartButton = document.getElementById('clearCartButton');

clearCartButton.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja esvaziar o carrinho?')) {
        cart = [];
        localStorage.removeItem('cart');
        updateCartDisplay();
    }
});