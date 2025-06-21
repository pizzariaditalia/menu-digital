// cart.js - VERSÃO FINAL COMPLETA COM LÓGICA DE CUPOM REATORADA

document.addEventListener('DOMContentLoaded', () => {
  let cart = [];
  let appliedLoyaltyDiscount = null;
  let appliedCoupon = null;
  let activeRoulettePrize = null;

  const cartIconWrapper = document.querySelector('.cart-icon-wrapper');
  const cartModal = document.getElementById('cart-modal');
  const closeCartModalButton = cartModal?.querySelector('.close-button');
  const viewCartButton = document.getElementById('view-cart-button');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartCountSpan = document.querySelector('.cart-count');
  const cartTotalSpan = document.querySelector('.cart-total');
  const cartSubtotalSummary = document.getElementById('cart-subtotal');
  const cartTotalSummary = document.getElementById('cart-total-summary');
  const emptyCartMessageElement = cartItemsList?.querySelector('.empty-cart-message');
  const cartLoyaltySection = document.getElementById('cart-loyalty-section');
  const cartCouponSection = document.getElementById('cart-coupon-section');
  const cartDiscountLine = document.getElementById('cart-discount-line');
  const cartDiscountAmountSpan = document.getElementById('cart-discount-amount');

  const formatPrice = (price) => price && typeof price === 'number' ? price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }) : String(price);

  window.openCartModal = () => {
    if (cartModal) cartModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    renderCart();
  };

  const closeCartModal = () => {
    if (cartModal) cartModal.classList.remove('show');
    document.body.style.overflow = '';
  };

  window.addToCart = (item) => {
    const existingItem = cart.find(cartItem =>
      cartItem.id === item.id &&
      cartItem.selectedSize === item.selectedSize &&
      (cartItem.notes || '') === (item.notes || '') &&
      ((item.selectedSize !== 'metade') || (cartItem.secondHalf?.id === item.secondHalf?.id)) &&
      (JSON.stringify(cartItem.stuffedCrust) === JSON.stringify(item.stuffedCrust))
    );

    const quantityToAdd = item.quantity || 1;

    if (existingItem) {
      existingItem.quantity += quantityToAdd;
    } else {
      cart.push({
        ...item,
        quantity: quantityToAdd
      });
    }

    if (cartIconWrapper) {
      cartIconWrapper.classList.add('pulse');
      setTimeout(() => {
        cartIconWrapper.classList.remove('pulse');
      }, 600);
    }

    updateCartUI();
  };

  window.getAppliedRoulettePrize = () => activeRoulettePrize ? JSON.parse(JSON.stringify(activeRoulettePrize)) : null;
  window.getCartItems = () => JSON.parse(JSON.stringify(cart));
  window.getCartTotalAmount = () => calculateCartTotals().totalPrice;
  window.getCartSubtotalAmount = () => calculateCartTotals().subtotal;
  window.getAppliedLoyaltyDiscountInfo = () => appliedLoyaltyDiscount ? JSON.parse(JSON.stringify(appliedLoyaltyDiscount)) : null;
  window.getAppliedCouponInfo = () => appliedCoupon ? JSON.parse(JSON.stringify(appliedCoupon)) : null;
  window.clearCartAndUI = () => {
    cart = [];
    appliedLoyaltyDiscount = null;
    appliedCoupon = null;
    sessionStorage.removeItem('activeRoulettePrize');
    activeRoulettePrize = null;
    updateCartUI();
  };

  const removeItemFromCart = (index) => {
    if (!cart[index]) return;
    cart.splice(index, 1);
    appliedLoyaltyDiscount = null;
    appliedCoupon = null;
    updateCartUI();
  };

  const increaseQuantity = (index) => {
    if (cart[index]) {
      cart[index].quantity++;
      updateCartUI();
    }
  };

  const decreaseQuantity = (index) => {
    if (cart[index]) {
      if (cart[index].quantity > 1) {
        cart[index].quantity--;
      } else {
        removeItemFromCart(index);
        return;
      }
      updateCartUI();
    }
  };

  const calculateEligibleItemsTotal = () => {
    const eligibleCategories = ["pizzas-tradicionais",
      "pizzas-especiais",
      "pizzas-doces"
    ];
    return cart.reduce((total, item) => {
      if (item.category && eligibleCategories.includes(item.category)) {
        return total + (item.unitPrice * item.quantity);
      }
      return total;
    }, 0);
  };

  const applyLoyaltyDiscount = (discount) => {
    if (activeRoulettePrize) {
      alert("Apenas um tipo de desconto pode ser usado. O prêmio da roleta já está ativo.");
      return;
    }
    if (appliedCoupon) {
      alert("Apenas um tipo de desconto (fidelidade ou cupom) pode ser usado por pedido. Remova o cupom para aplicar os pontos.");
      return;
    }
    if (!discount || !window.currentCustomerDetails || window.currentCustomerDetails.points < discount.pointsToUse) {
      alert("Você não tem pontos suficientes para este desconto.");
      return;
    }
    const eligibleTotal = calculateEligibleItemsTotal();
    if (eligibleTotal === 0) {
      alert("Nenhum item elegível no carrinho para aplicar o desconto.");
      return;
    }
    const discountAmount = eligibleTotal * discount.percentage;
    appliedLoyaltyDiscount = {
      pointsUsed: discount.pointsToUse,
      discountAmount,
      percentage: discount.percentage,
      label: discount.label
    };
    updateCartUI();
  };

  const removeLoyaltyDiscount = () => {
    appliedLoyaltyDiscount = null;
    updateCartUI();
  };

  const removeCoupon = () => {
    const couponCodeInput = document.getElementById('coupon-code-input');
    appliedCoupon = null;
    if (couponCodeInput) couponCodeInput.value = '';
    updateCartUI();
  };

  async function validateAndApplyCoupon(code) {
    const couponMessageDiv = document.getElementById('coupon-message');

    if (!code) return { success: false, message: "Código inválido." };

    if (activeRoulettePrize) {
      return { success: false, message: "Apenas um tipo de desconto pode ser usado. O prêmio da roleta já está ativo." };
    }
    if (appliedLoyaltyDiscount) {
      return { success: false, message: "Remova o desconto de fidelidade para aplicar um cupom." };
    }
    if (cart.some(item => item.isPromotion)) {
      return { success: false, message: "Cupons não são válidos para itens em promoção." };
    }

    try {
      const { doc, getDoc } = window.firebaseFirestore;
      const couponRef = doc(window.db, "coupons", code);
      const couponSnap = await getDoc(couponRef);

      if (!couponSnap.exists() || !couponSnap.data().active) {
        return { success: false, message: "Cupom inválido, expirado ou inativo." };
      }

      const coupon = { id: couponSnap.id, ...couponSnap.data() };
      const { subtotal } = calculateCartTotals();

      if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
        return { success: false, message: `Este cupom é válido para pedidos acima de ${formatPrice(coupon.minOrderValue)}.` };
      }

      if (coupon.oneTimeUsePerCustomer && window.currentCustomerDetails?.id) {
        if (Array.isArray(coupon.usedBy) && coupon.usedBy.includes(window.currentCustomerDetails.id)) {
          return { success: false, message: "Você já utilizou este cupom de uso único." };
        }
      }

      if (coupon.code === 'PRIMEIRA-COMPRA' && window.currentCustomerDetails?.points > 0) {
        return { success: false, message: "Este cupom é válido apenas para a primeira compra." };
      }

      appliedCoupon = coupon;
      if (couponMessageDiv) {
        couponMessageDiv.textContent = "Cupom aplicado com sucesso!";
        couponMessageDiv.className = 'success';
      }
      updateCartUI();
      return { success: true, message: "Cupom aplicado com sucesso!" };

    } catch (error) {
      console.error("Erro ao aplicar cupom:", error);
      return { success: false, message: "Erro ao verificar o cupom. Tente novamente." };
    }
  }
  window.validateAndApplyCoupon = validateAndApplyCoupon;

  const applyCoupon = async () => {
    const couponCodeInput = document.getElementById('coupon-code-input');
    const couponMessageDiv = document.getElementById('coupon-message');
    const applyCouponButton = document.getElementById('apply-coupon-button');

    if (!couponCodeInput || !couponMessageDiv || !applyCouponButton) return;

    const code = couponCodeInput.value.trim().toUpperCase();
    if (!code) return;

    applyCouponButton.disabled = true;
    applyCouponButton.textContent = 'Verificando...';

    const result = await validateAndApplyCoupon(code);

    if (!result.success) {
      couponMessageDiv.textContent = result.message;
      couponMessageDiv.className = 'error';
    }

    applyCouponButton.disabled = false;
    applyCouponButton.textContent = 'Aplicar';
  };

  const checkForRoulettePrize = () => {
    const prizeJSON = sessionStorage.getItem('activeRoulettePrize');
    if (prizeJSON) {
      activeRoulettePrize = JSON.parse(prizeJSON);
      appliedLoyaltyDiscount = null;
      appliedCoupon = null;
    } else {
      activeRoulettePrize = null;
    }
  };

  const calculateCartTotals = () => {
    checkForRoulettePrize();

    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    let discountAmount = 0;

    if (activeRoulettePrize) {
      if (activeRoulettePrize.type === 'percent') {
        discountAmount = subtotal * (activeRoulettePrize.value / 100);
      } else if (activeRoulettePrize.type === 'free_item') {
        const freeItemInCart = cart.find(item => item.name === activeRoulettePrize.value);
        if (freeItemInCart) {
          discountAmount = freeItemInCart.unitPrice;
        }
      } else if (activeRoulettePrize.type === 'free_extra') {
        let crustDiscountApplied = false;
        for (const item of cart) {
          if (item.stuffedCrust && item.stuffedCrust.price > 0 && !crustDiscountApplied) {
            discountAmount += item.stuffedCrust.price;
            crustDiscountApplied = true;
            break;
          }
        }
      }
    } else if (appliedLoyaltyDiscount) {
      discountAmount = appliedLoyaltyDiscount.discountAmount;
    } else if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        discountAmount = subtotal * (appliedCoupon.value / 100);
      } else { // 'fixed' e 'free_delivery' (tratado no checkout)
        discountAmount = appliedCoupon.value;
      }
    }

    const finalTotal = subtotal - discountAmount;

    return {
      subtotal,
      totalPrice: Math.max(0, finalTotal),
      totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
      discountAmount: discountAmount
    };
  };

  const renderCart = () => {
    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';
    const {
      subtotal,
      totalPrice,
      totalItems,
      discountAmount
    } = calculateCartTotals();
    const hasPromotionalItems = cart.some(item => item.isPromotion);

    if (totalItems === 0) {
      if (emptyCartMessageElement) {
        const placeholder = document.createElement('div');
        const emptyMessageClone = emptyCartMessageElement.cloneNode(true);
        emptyMessageClone.style.display = 'block';
        placeholder.appendChild(emptyMessageClone);
        cartItemsList.innerHTML = placeholder.innerHTML;
      }
      if (cartLoyaltySection) cartLoyaltySection.style.display = 'none';
      if (cartCouponSection) cartCouponSection.style.display = 'none';
      if (cartDiscountLine) cartDiscountLine.style.display = 'none';
    } else {
      if (emptyCartMessageElement) emptyCartMessageElement.style.display = 'none';
      cart.forEach((item, index) => {
        let itemDescriptionHtml = '';
        if (item.selectedSize && item.selectedSize !== 'único' && item.selectedSize !== 'inteira') {
          itemDescriptionHtml += `<p class="item-description">Tamanho: ${item.selectedSize === 'metade' ? 'Metade/Metade' : item.selectedSize}</p>`;
        }
        if (item.stuffedCrust && item.stuffedCrust.name) {
          itemDescriptionHtml += `<p class="item-description">Borda: ${item.stuffedCrust.name}</p>`;
        }
        if (item.notes) {
          itemDescriptionHtml += `<p class="item-notes">Obs: ${item.notes}</p>`;
        }
        const itemImage = Array.isArray(item.image) ? item.image[0] : item.image;
        const cartItemDiv = document.createElement('div');
        cartItemDiv.classList.add('cart-item');
        if (item.isPromotion) {
          cartItemDiv.style.borderLeft = '3px solid var(--primary-red)';
          cartItemDiv.style.paddingLeft = '10px';
        }
        cartItemDiv.innerHTML = `
        <img src="${(itemImage || 'img/placeholder.png').replace('../', '')}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
        <h4>${item.name} ${item.isPromotion ? '<span style="color: var(--primary-red); font-size: 0.8em; font-weight: bold;">(PROMO)</span>' : ''}</h4>
        ${itemDescriptionHtml}
        <div class="cart-item-quantity-controls">
        <button class="quantity-button decrease-button" data-index="${index}">-</button>
        <span class="item-quantity">${item.quantity}</span>
        <button class="quantity-button increase-button" data-index="${index}">+</button>
        </div>
        </div>
        <span class="cart-item-price">${formatPrice(item.unitPrice * item.quantity)}</span>`;
        cartItemsList.appendChild(cartItemDiv);
      });
      cartItemsList.querySelectorAll('.increase-button').forEach(b => b.addEventListener('click', (e) => increaseQuantity(parseInt(e.target.dataset.index))));
      cartItemsList.querySelectorAll('.decrease-button').forEach(b => b.addEventListener('click', (e) => decreaseQuantity(parseInt(e.target.dataset.index))));

      const hasActiveDiscount = activeRoulettePrize || appliedLoyaltyDiscount || appliedCoupon;

      if (activeRoulettePrize) {
        if (cartLoyaltySection) cartLoyaltySection.style.display = 'none';
        if (cartCouponSection) cartCouponSection.style.display = 'none';
      } else {
        if (cartLoyaltySection) {
          const loyaltyDiscountInfoDiv = document.getElementById('loyalty-discount-info');
          const applyLoyaltyDiscountButton = document.getElementById('apply-loyalty-discount-button');
          const removeLoyaltyDiscountButton = document.getElementById('remove-loyalty-discount-button');
          const loyaltyDiscountAppliedMessage = document.getElementById('loyalty-discount-applied-message');

          if (hasActiveDiscount && !appliedLoyaltyDiscount) {
            cartLoyaltySection.style.display = 'none';
          } else if (window.currentCustomerDetails) {
            const customerPoints = window.currentCustomerDetails.points || 0;
            const bestDiscount = window.getApplicableDiscount ? window.getApplicableDiscount(customerPoints) : null;
            if (appliedLoyaltyDiscount) {
              loyaltyDiscountInfoDiv.innerHTML = `<p>Desconto de <strong>${appliedLoyaltyDiscount.percentage * 100}%</strong> aplicado.</p>`;
              applyLoyaltyDiscountButton.style.display = 'none';
              removeLoyaltyDiscountButton.style.display = 'inline-block';
              loyaltyDiscountAppliedMessage.textContent = `Você economizou ${formatPrice(appliedLoyaltyDiscount.discountAmount)}!`;
              loyaltyDiscountAppliedMessage.style.display = 'block';
              cartLoyaltySection.style.display = 'block';
            } else if (bestDiscount && calculateEligibleItemsTotal() > 0) {
              loyaltyDiscountInfoDiv.innerHTML = `<p>Você tem <strong>${customerPoints}</strong> pontos. ${bestDiscount.label}.</p>`;
              applyLoyaltyDiscountButton.style.display = 'inline-block';
              applyLoyaltyDiscountButton.onclick = () => applyLoyaltyDiscount(bestDiscount);
              removeLoyaltyDiscountButton.style.display = 'none';
              loyaltyDiscountAppliedMessage.style.display = 'none';
              cartLoyaltySection.style.display = 'block';
            } else {
              cartLoyaltySection.style.display = 'none';
            }
          } else {
            cartLoyaltySection.style.display = 'none';
          }
        }

        if (cartCouponSection) {
          if (hasPromotionalItems) {
            cartCouponSection.style.display = 'block';
            cartCouponSection.innerHTML = `<div class="promo-items-message" style="padding: 10px; text-align: center; color: var(--medium-gray); background-color: #fef0f0; border-radius: 8px;">
              <i class="fas fa-info-circle" style="color: var(--primary-red);"></i>
              <span style="display: block; font-size: 0.9em; margin-top: 5px;">Cupons não são válidos para produtos em promoção.</span>
              </div>`;
            if (appliedCoupon) {
              removeCoupon();
            }
          } else if (hasActiveDiscount && !appliedCoupon) {
            cartCouponSection.style.display = 'none';
          } else {
            cartCouponSection.innerHTML = `<h4 style="font-size: 1.1em; margin-top:0; margin-bottom: 10px;">Aplicar Cupom de Desconto</h4><div id="coupon-input-area"><div class="coupon-input-wrapper"><input type="text" id="coupon-code-input" placeholder="Digite o código do cupom"><button id="apply-coupon-button">Aplicar</button></div><div id="coupon-message"></div></div><div id="applied-coupon-info" style="display: none;"><span id="applied-coupon-text"></span><button id="remove-coupon-button" class="button-link-style" style="font-size: 1em; color: var(--primary-red);">Remover</button></div>`;
            cartCouponSection.style.display = 'block';

            document.getElementById('apply-coupon-button')?.addEventListener('click', applyCoupon);
            document.getElementById('remove-coupon-button')?.addEventListener('click', removeCoupon);

            if (appliedCoupon) {
              document.getElementById('coupon-input-area').style.display = 'none';
              document.getElementById('applied-coupon-info').style.display = 'flex';
              document.getElementById('applied-coupon-text').textContent = `Cupom "${appliedCoupon.code}" aplicado!`;
            } else {
              document.getElementById('coupon-input-area').style.display = 'block';
              document.getElementById('applied-coupon-info').style.display = 'none';
            }
          }
        }
      }
    }

    if (cartSubtotalSummary) cartSubtotalSummary.textContent = formatPrice(subtotal);
    if (cartDiscountLine && cartDiscountAmountSpan) {
      if (discountAmount > 0) {
        cartDiscountAmountSpan.textContent = `- ${formatPrice(discountAmount)}`;
        const discountLabel = cartDiscountLine.querySelector('span:first-child');
        if (activeRoulettePrize) {
          discountLabel.textContent = `Prêmio Roleta:`;
        } else if (appliedLoyaltyDiscount) {
          discountLabel.textContent = 'Desconto Fidelidade:';
        } else if (appliedCoupon) {
          discountLabel.textContent = 'Desconto (Cupom):';
        }
        cartDiscountLine.style.display = 'flex';
      } else {
        cartDiscountLine.style.display = 'none';
      }
    }
    if (cartTotalSummary) cartTotalSummary.textContent = formatPrice(totalPrice);
    if (cartCountSpan) cartCountSpan.textContent = totalItems;
    if (cartTotalSpan) cartTotalSpan.textContent = formatPrice(totalPrice);
    if (cartCountSpan) cartCountSpan.style.display = totalItems > 0 ? 'block' : 'none';

    const checkoutButton = document.querySelector('#cart-modal .checkout-button');
    if (checkoutButton) {
      const minOrderValue = window.appSettings?.storeInfo?.minOrderValue || 0;
      const restaurantStatusOpen = document.querySelector('.status')?.textContent === 'ABERTO';
      if (!restaurantStatusOpen) {
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'Restaurante Fechado';
        checkoutButton.style.backgroundColor = 'var(--medium-gray)';
        checkoutButton.style.cursor = 'not-allowed';
      } else if (totalItems > 0 && minOrderValue > 0 && subtotal < minOrderValue) {
        checkoutButton.disabled = true;
        checkoutButton.textContent = `Pedido Mínimo: ${formatPrice(minOrderValue)}`;
        checkoutButton.style.backgroundColor = 'var(--medium-gray)';
        checkoutButton.style.cursor = 'not-allowed';
      } else {
        checkoutButton.disabled = false;
        checkoutButton.textContent = 'Finalizar Pedido';
        checkoutButton.style.backgroundColor = '';
        checkoutButton.style.cursor = '';
      }
    }
  };

  const updateCartUI = () => {
    setTimeout(renderCart, 0);
  }

  if (viewCartButton) viewCartButton.addEventListener('click', window.openCartModal);
  if (closeCartModalButton) closeCartModalButton.addEventListener('click', closeCartModal);
  if (cartModal) cartModal.addEventListener('click', (event) => {
    if (event.target === cartModal) closeCartModal();
  });

  document.body.addEventListener('click',
    function(event) {
      if (event.target && event.target.id === 'remove-loyalty-discount-button') {
        removeLoyaltyDiscount();
      }
    });


  const checkoutButtonInCartModal = document.querySelector('#cart-modal .checkout-button');
  if (checkoutButtonInCartModal) {
    checkoutButtonInCartModal.addEventListener('click', () => {
      if (cart.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
      }
      if (typeof window.openCheckoutModal === 'function') {
        closeCartModal();
        window.openCheckoutModal();
      } else {
        alert("Erro: A função para finalizar o pedido não foi carregada. Tente recarregar a página.");
        console.error("Função 'openCheckoutModal' não encontrada no escopo global.");
      }
    });
  }

  updateCartUI();
});
