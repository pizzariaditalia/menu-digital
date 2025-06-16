// productModal.js - VERSÃO COM FILTRO NA SELEÇÃO DE METADES

document.addEventListener('DOMContentLoaded', () => {
    const productModal = document.getElementById('product-modal');
    if (!productModal) return;

    const closeButton = productModal.querySelector('.close-button');
    const modalProductName = document.getElementById('modal-product-name');
    const pizzaSizeRadios = document.querySelectorAll('input[name="pizza-size"]');
    const priceInteiraSpan = document.getElementById('price-inteira');
    const priceMetadeSpan = document.getElementById('price-metade');
    const secondHalfOptionsDiv = document.getElementById('second-half-options');
    const secondHalfListDiv = document.getElementById('second-half-list');
    const productNotesTextarea = document.getElementById('product-notes');
    const addToCartModalButton = document.getElementById('add-to-cart-modal-button');
    const modalProductImageEl = document.getElementById('modal-product-image');
    const modalProductDescriptionEl = document.getElementById('modal-product-description');
    const sizeOptionsSection = Array.from(productModal.querySelectorAll('.options-section')).find(section => section.querySelector('input[name="pizza-size"]'));
    const stuffedCrustOptionsContainer = document.getElementById('stuffed-crust-options-container');
    const stuffedCrustTypeListDiv = document.getElementById('stuffed-crust-type-list');
    const modalFixedBottom = productModal.querySelector('.modal-fixed-bottom');
    const selectedHalvesInfoDiv = document.getElementById('selected-halves-info');
    const firstHalfNameDisplay = document.getElementById('first-half-name-display');
    const secondHalfNameDisplay = document.getElementById('second-half-name-display');

    let currentProduct = null;
    let selectedHalf2 = null;
    let originalProductPrice = 0;
    let selectedStuffedCrust = null;

    const formatPrice = (price) => price && typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(price);

    function renderModalForMainView() {
        if(productModal) productModal.classList.remove('second-half-view');
        
        if (modalProductName && currentProduct) modalProductName.textContent = currentProduct.name;
        if (modalProductImageEl) modalProductImageEl.style.display = 'block';
        if (modalProductDescriptionEl) modalProductDescriptionEl.style.display = 'block';
        if (sizeOptionsSection) sizeOptionsSection.style.display = 'block';
        if (stuffedCrustOptionsContainer) stuffedCrustOptionsContainer.classList.remove('hidden');
        if (modalFixedBottom) modalFixedBottom.style.display = 'flex';
        if (secondHalfOptionsDiv) secondHalfOptionsDiv.classList.add('hidden');

        if (selectedHalf2 && currentProduct && selectedHalvesInfoDiv) {
            firstHalfNameDisplay.textContent = currentProduct.name;
            secondHalfNameDisplay.textContent = selectedHalf2.name;
            selectedHalvesInfoDiv.style.display = 'block';
        } else if (selectedHalvesInfoDiv) {
            selectedHalvesInfoDiv.style.display = 'none';
        }
        updateTotalPrice();
    }

    function renderModalForSecondHalfSelection() {
        if (productModal) productModal.classList.add('second-half-view');

        if (modalProductName) modalProductName.textContent = "Escolha a segunda metade";
        if (modalProductImageEl) modalProductImageEl.style.display = 'none';
        if (modalProductDescriptionEl) modalProductDescriptionEl.style.display = 'none';
        if (sizeOptionsSection) sizeOptionsSection.style.display = 'none';
        if (stuffedCrustOptionsContainer) stuffedCrustOptionsContainer.classList.add('hidden');
        if (selectedHalvesInfoDiv) selectedHalvesInfoDiv.style.display = 'none';
        if (modalFixedBottom) modalFixedBottom.style.display = 'none';

        if (secondHalfOptionsDiv) secondHalfOptionsDiv.classList.remove('hidden');
        renderSecondHalfOptionsList();
    }

    const renderSecondHalfOptionsList = () => {
        if (!secondHalfListDiv || !window.menuData || !currentProduct) return;
        secondHalfListDiv.innerHTML = '';
        const allPizzas = [];
        
        for (const cat in window.menuData) {
            if (cat.includes('pizzas-') && window.menuData[cat] && Array.isArray(window.menuData[cat].items)) {
                // Filtra apenas os itens visíveis
                const visiblePizzas = window.menuData[cat].items.filter(item => item.isVisible !== false);
                
                visiblePizzas.forEach(pizza => {
                    if (pizza.id !== currentProduct.id) {
                        allPizzas.push({ ...pizza, category: cat });
                    }
                });
            }
        }

        if (allPizzas.length === 0) {
            secondHalfListDiv.innerHTML = "<p>Nenhuma outra pizza disponível para segunda metade.</p>"; 
            return;
        }

        allPizzas.forEach(pizza => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('second-half-item');
            itemDiv.innerHTML = `<img src="${(pizza.image || 'img/placeholder.png').replace('../','')}" alt="${pizza.name}" class="item-image"><div class="item-details"><h5>${pizza.name}</h5></div><span class="item-price">${formatPrice(pizza.price / 2)}</span>`;
            
            itemDiv.addEventListener('click', () => {
                selectedHalf2 = { id: pizza.id, name: pizza.name, category: pizza.category };
                renderModalForMainView();
            });
            secondHalfListDiv.appendChild(itemDiv);
        });
    };
    
    window.openProductModal = (item) => {
        currentProduct = item;
        originalProductPrice = item.isPromotion ? item.originalPrice : item.price;
        let displayPrice = item.price;

        selectedHalf2 = null;
        selectedStuffedCrust = null;
        
        if (modalProductImageEl) modalProductImageEl.src = (item.image || 'img/placeholder.png').replace('../', '');
        
        if (modalProductDescriptionEl) modalProductDescriptionEl.textContent = item.description;

        const isPizza = item.category && item.category.includes('pizzas-');
        
        if (isPizza) {
            if(stuffedCrustOptionsContainer) stuffedCrustOptionsContainer.classList.remove('hidden');
            if(sizeOptionsSection) sizeOptionsSection.style.display = 'block';
            renderStuffedCrustTypes(item.category);
        } else {
            if(stuffedCrustOptionsContainer) stuffedCrustOptionsContainer.classList.add('hidden');
            if(sizeOptionsSection) sizeOptionsSection.style.display = 'none';
        }
        
        if (selectedHalvesInfoDiv) selectedHalvesInfoDiv.style.display = 'none';
        if (secondHalfOptionsDiv) secondHalfOptionsDiv.classList.add('hidden');
        if (pizzaSizeRadios.length > 0) pizzaSizeRadios[0].checked = true;
        if (productNotesTextarea) productNotesTextarea.value = '';
        if (priceInteiraSpan) priceInteiraSpan.textContent = formatPrice(displayPrice);
        if (priceMetadeSpan) priceMetadeSpan.textContent = formatPrice(displayPrice / 2);
        
        const metadeOptionGroup = document.querySelector('input[name="pizza-size"][value="metade"]')?.closest('.option-group');
        if (item.isPromotion) {
            if(metadeOptionGroup) metadeOptionGroup.style.display = 'none';
        } else {
            if(metadeOptionGroup) metadeOptionGroup.style.display = 'block';
        }
        
        renderModalForMainView();
        productModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    const closeProductModal = () => {
        productModal.classList.remove('show');
        document.body.style.overflow = '';
    };

    const calculateFinalPrice = () => {
        const selectedSizeRadio = document.querySelector('input[name="pizza-size"]:checked');
        if (!selectedSizeRadio || !currentProduct) return 0;
        
        const selectedSize = selectedSizeRadio.value;
        let basePrice = 0;

        if (currentProduct.isPromotion) {
            basePrice = currentProduct.price;
        } else if (selectedSize === 'inteira') {
            basePrice = originalProductPrice;
        } else { // 'metade'
            const firstHalfPrice = originalProductPrice / 2;
            const secondHalfOriginalPrice = selectedHalf2 ? (window.menuData[selectedHalf2.category].items.find(i => i.id === selectedHalf2.id).price) / 2 : firstHalfPrice;
            basePrice = Math.max(firstHalfPrice, secondHalfOriginalPrice) * 2;
        }
        
        let finalPrice = basePrice;
        if (selectedStuffedCrust) {
            finalPrice += selectedStuffedCrust.price;
        }
        return finalPrice;
    }

    const updateTotalPrice = () => {
        const totalPrice = calculateFinalPrice();
        if (addToCartModalButton) addToCartModalButton.textContent = `Adicionar ao Carrinho - ${formatPrice(totalPrice)}`;
    };

    const renderStuffedCrustTypes = (pizzaCategory) => {
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
                if (selectedCrustId === 'none') {
                    selectedStuffedCrust = null;
                } else {
                    selectedStuffedCrust = sortedCrusts.find(c => c.id === selectedCrustId);
                }
                updateTotalPrice();
            });
        });
    };
    
    if (closeButton) closeButton.addEventListener('click', closeProductModal);
    if (productModal) productModal.addEventListener('click', (event) => { if (event.target === event.currentTarget) closeProductModal(); });

    if (pizzaSizeRadios.length > 0) {
        pizzaSizeRadios.forEach(radio => radio.addEventListener('change', (event) => {
            if (event.target.value === 'metade') {
                renderModalForSecondHalfSelection();
            } else { 
                selectedHalf2 = null; 
                renderModalForMainView(); 
            }
        }));
    }

    if (addToCartModalButton) {
        addToCartModalButton.addEventListener('click', () => {
            const selectedSizeRadio = document.querySelector('input[name="pizza-size"]:checked');
            if (!selectedSizeRadio || !currentProduct) { return; }
            const selectedSize = selectedSizeRadio.value;
            if (selectedSize === 'metade' && !selectedHalf2) {
                alert("Por favor, escolha a segunda metade da pizza.");
                renderModalForSecondHalfSelection(); 
                return;
            }
            
            const itemFinalPrice = calculateFinalPrice();
            
            const itemToAdd = {
                id: currentProduct.id,
                name: currentProduct.name,
                image: currentProduct.image,
                price: itemFinalPrice,
                quantity: 1,
                selectedSize: selectedSize,
                notes: productNotesTextarea.value.trim(),
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
                closeProductModal();
            } else {
                console.error("Função 'addToCart' não encontrada.");
            }
        });
    }
});