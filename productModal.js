// productModal.js - VERSÃO COM MODAL SEPARADO PARA CALZONES

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores dos Modais ---
    const productModal = document.getElementById('product-modal');
    const calzoneModal = document.getElementById('calzone-notes-modal');
    
    // --- Variáveis de estado do Módulo ---
    let currentProduct = null;
    let selectedHalf2 = null;
    let selectedStuffedCrust = null;
    let originalProductPrice = 0;

    // --- FUNÇÃO DE ABERTURA PRINCIPAL (O "ROTEADOR") ---
    window.openProductModal = (item) => {
        currentProduct = item; // Guarda o item que foi clicado

        const isPizza = item.category && item.category.includes('pizzas-');
        const isCalzone = item.category && item.category.includes('calzones');

        if (isPizza) {
            // Se for uma pizza, abre o modal complexo de customização
            openPizzaModal(item);
        } else if (isCalzone) {
            // Se for um calzone, abre o novo modal simples de observações
            openCalzoneModal(item);
        } else {
            // Para qualquer outro item (bebidas, etc.), adiciona direto ao carrinho
            if (window.addToCart) {
                window.addToCart({ ...item, quantity: 1, unitPrice: item.price, notes: '' });
            }
        }
    };

    // --- LÓGICA DO MODAL DE PIZZA ---
    function openPizzaModal(item) {
        if (!productModal) return;
        
        // Configura o estado inicial do modal de pizza
        originalProductPrice = item.isPromotion ? item.originalPrice : item.price;
        document.getElementById('modal-product-image').src = (item.image || 'img/placeholder.png').replace('../', '');
        document.getElementById('modal-product-name').textContent = item.name;
        document.getElementById('modal-product-description').textContent = item.description;
        document.getElementById('product-notes').value = '';
        document.getElementById('price-inteira').textContent = formatPrice(item.price);
        document.getElementById('price-metade').textContent = formatPrice(item.price / 2);
        
        selectedHalf2 = null;
        selectedStuffedCrust = null;
        document.getElementById('selected-halves-info').style.display = 'none';
        document.querySelector('input[name="pizza-size"][value="inteira"]').checked = true;
        
        renderStuffedCrustTypes(item.category);
        updateTotalPrice();
        openModal(productModal);
    }
    
    // --- LÓGICA DO NOVO MODAL DE CALZONE ---
    function openCalzoneModal(item) {
        if (!calzoneModal) return;

        // Preenche os dados do modal do calzone
        document.getElementById('calzone-modal-name').textContent = item.name;
        document.getElementById('calzone-notes').value = '';

        const addBtn = document.getElementById('add-calzone-to-cart-btn');
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        
        newAddBtn.textContent = `Adicionar - ${formatPrice(item.price)}`;
        newAddBtn.onclick = () => {
            if (window.addToCart) {
                const itemToAdd = {
                    ...item,
                    quantity: 1,
                    unitPrice: item.price,
                    notes: document.getElementById('calzone-notes').value.trim(),
                    selectedSize: 'único' // Define um tamanho padrão para o carrinho
                };
                window.addToCart(itemToAdd);
                closeModal(calzoneModal);
            }
        };

        openModal(calzoneModal);
    }

    // --- FUNÇÕES AUXILIARES E EVENTOS ---

    const formatPrice = (price) => price && typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(price);

    function updateTotalPrice() {
        const selectedSizeRadio = productModal.querySelector('input[name="pizza-size"]:checked');
        if (!selectedSizeRadio || !currentProduct) return;
        
        let basePrice = 0;
        if (currentProduct.isPromotion) {
            basePrice = currentProduct.price;
        } else if (selectedSizeRadio.value === 'inteira') {
            basePrice = originalProductPrice;
        } else {
            const firstHalfPrice = originalProductPrice / 2;
            const secondHalfOriginalPrice = selectedHalf2 ? (window.menuData[selectedHalf2.category].items.find(i => i.id === selectedHalf2.id).price) / 2 : firstHalfPrice;
            basePrice = Math.max(firstHalfPrice, secondHalfOriginalPrice) * 2;
        }
        
        let finalPrice = basePrice;
        if (selectedStuffedCrust) {
            finalPrice += selectedStuffedCrust.price;
        }
        document.getElementById('add-to-cart-modal-button').textContent = `Adicionar ao Carrinho - ${formatPrice(finalPrice)}`;
    }

    function renderStuffedCrustTypes(pizzaCategory) {
        const stuffedCrustTypeListDiv = document.getElementById('stuffed-crust-type-list');
        if (!stuffedCrustTypeListDiv) return;
        
        const allCrusts = (window.stuffedCrustData || []);
        const requiredCrustType = (pizzaCategory === 'pizzas-doces') ? 'doce' : 'salgada';
        const filteredCrusts = allCrusts.filter(crust => (crust.type || 'salgada') === requiredCrustType);
        const sortedCrusts = filteredCrusts.sort((a, b) => a.price - b.price);
        
        let typesHtml = `<div class="option-group"><label class="option-label"><input type="radio" name="stuffed-crust-type" value="none" checked> Sem Borda Adicional<span class="option-price"></span></label></div>`;
        sortedCrusts.forEach(crust => {
            typesHtml += `<div class="option-group"><label class="option-label"><input type="radio" name="stuffed-crust-type" value="${crust.id}" data-price="${crust.price}"> ${crust.name}<span class="option-price">+ ${formatPrice(crust.price)}</span></label></div>`;
        });
        stuffedCrustTypeListDiv.innerHTML = typesHtml;

        stuffedCrustTypeListDiv.querySelectorAll('input[name="stuffed-crust-type"]').forEach(radio => {
            radio.addEventListener('change', (event) => {
                const selectedCrustId = event.target.value;
                selectedStuffedCrust = (selectedCrustId === 'none') ? null : sortedCrusts.find(c => c.id === selectedCrustId);
                updateTotalPrice();
            });
        });
    }

    // --- EVENT LISTENERS ---
    
    // Fechar Modais
    productModal?.querySelector('.close-button').addEventListener('click', () => closeModal(productModal));
    calzoneModal?.querySelector('.close-button').addEventListener('click', () => closeModal(calzoneModal));

    // Lógica do modal de pizza
    const addToCartModalButton = document.getElementById('add-to-cart-modal-button');
    if (addToCartModalButton) {
        addToCartModalButton.addEventListener('click', () => {
            const selectedSizeRadio = document.querySelector('input[name="pizza-size"]:checked');
            if (!selectedSizeRadio || !currentProduct) return;
            
            const selectedSize = selectedSizeRadio.value;
            if (selectedSize === 'metade' && !selectedHalf2) {
                alert("Por favor, escolha a segunda metade da pizza.");
                return;
            }

            let basePrice = 0;
            if (currentProduct.isPromotion) {
                basePrice = currentProduct.price;
            } else if (selectedSize === 'inteira') {
                basePrice = originalProductPrice;
            } else {
                const firstHalfPrice = originalProductPrice / 2;
                const secondHalfBasePrice = selectedHalf2 ? (window.menuData[selectedHalf2.category].items.find(i => i.id === selectedHalf2.id).price) / 2 : firstHalfPrice;
                basePrice = Math.max(firstHalfPrice, secondHalfBasePrice) * 2;
            }

            const itemFinalPrice = basePrice + (selectedStuffedCrust ? selectedStuffedCrust.price : 0);
            
            const itemToAdd = {
                id: currentProduct.id,
                name: currentProduct.name,
                image: currentProduct.image,
                price: itemFinalPrice,
                quantity: 1,
                selectedSize: selectedSize,
                notes: document.getElementById('product-notes').value.trim(),
                unitPrice: itemFinalPrice, 
                stuffedCrust: selectedStuffedCrust,
                category: currentProduct.category,
                isPromotion: currentProduct.isPromotion || false
            };

            if (selectedSize === 'metade' && selectedHalf2) {
                itemToAdd.secondHalf = { id: selectedHalf2.id, name: selectedHalf2.name, image: selectedHalf2.image, category: selectedHalf2.category };
                itemToAdd.name = `Metade ${currentProduct.name} / Metade ${selectedHalf2.name}`;
            }

            if (itemToAdd.stuffedCrust) {
                itemToAdd.name += ` com ${itemToAdd.stuffedCrust.name}`;
            }
            
            if (window.addToCart) {
                window.addToCart(itemToAdd);
                closeModal(productModal);
            } else {
                console.error("Função 'addToCart' não encontrada.");
            }
        });
    }
});
