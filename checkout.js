// checkout.js - VERSÃO FINAL COM LÓGICA DE ENTREGA GRÁTIS E LOGIN GOOGLE

async function saveOrderToFirestore(orderData) {
    if (!window.db || !window.firebaseFirestore) {
        console.error("Firestore não foi inicializado. O pedido não pode ser salvo.");
        throw new Error("A conexão com o banco de dados falhou. Tente novamente.");
    }
    try {
        const { doc, setDoc, serverTimestamp } = window.firebaseFirestore;
        const db = window.db;
        const orderId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const orderDocRef = doc(db, "pedidos", orderId);
        const finalOrderData = {
            ...orderData,
            orderId: orderId,
            createdAt: serverTimestamp(),
            status: orderData.payment.method === 'Pix' ? 'Aguardando Comprovante' : 'Recebido'
        };
        await setDoc(orderDocRef, finalOrderData);
        console.log(`Pedido ${orderId} salvo com sucesso no Firestore!`);
        return orderId;
    } catch (error) {
        console.error("Erro ao salvar o pedido no Firestore:", error);
        throw new Error("Não foi possível registrar seu pedido no sistema. Por favor, tente novamente.");
    }
}

async function saveCustomerProfile(customerData) {
    if (!window.db || !window.firebaseFirestore) {
        console.error("Firestore não inicializado. Perfil do cliente não pode ser salvo.");
        return; 
    }
    try {
        const { doc, setDoc, serverTimestamp } = window.firebaseFirestore;
        const db = window.db;

        const customerId = window.currentCustomerDetails?.id || customerData.whatsapp;
        
        const customerDocRef = doc(db, "customer", customerId);
        const dataToSave = { ...customerData, lastUpdatedAt: serverTimestamp() };
        
        await setDoc(customerDocRef, dataToSave, { merge: true });
        console.log(`Perfil do cliente ${customerId} salvo/atualizado com sucesso!`);

    } catch (error) {
        console.error("Erro ao salvar o perfil do cliente no Firestore:", error);
    }
}

async function markCouponAsUsed(couponCode) {
    const customerId = window.currentCustomerDetails?.id;
    if (!window.db || !window.firebaseFirestore || !couponCode || !customerId) {
        return;
    }
    const { doc, updateDoc, arrayUnion } = window.firebaseFirestore;
    const couponRef = doc(window.db, "coupons", couponCode);
    try {
        await updateDoc(couponRef, {
            usedBy: arrayUnion(customerId)
        });
        console.log(`Cupom ${couponCode} marcado como usado pelo cliente ${customerId}.`);
    } catch (error) {
        console.error("Erro ao marcar cupom como usado:", error);
    }
}

async function showOrderSuccessAnimation(data) {
    return new Promise(resolve => {
        const overlay = document.getElementById('order-success-animation-overlay');
        const pointsSpan = document.getElementById('success-animation-points');
        
        if (!overlay || !pointsSpan) {
            resolve();
            return;
        }

        pointsSpan.textContent = data.finalPointsBalance;
        overlay.classList.add('show');

        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(resolve, 300);
        }, 3000);
    });
}

function showCustomConfirm(whatsappUrl) {
    const modal = document.getElementById('custom-confirm-modal');
    const btnOk = document.getElementById('custom-confirm-ok');
    const btnCancel = document.getElementById('custom-confirm-cancel');

    if (!modal || !btnOk || !btnCancel) return;

    modal.classList.add('show');

    btnOk.addEventListener('click', () => {
        window.open(whatsappUrl, '_blank');
        modal.classList.remove('show');
    }, { once: true });

    btnCancel.addEventListener('click', () => {
        modal.classList.remove('show');
    }, { once: true });
}


document.addEventListener('DOMContentLoaded', () => {
    let deliveryFeesData = {};
    let currentDeliveryFee = 0;
    
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutModalButton = document.getElementById('close-checkout-modal');
    const checkoutForm = document.getElementById('checkout-form');
    const checkoutOrderSummaryDiv = document.getElementById('checkout-order-summary');
    const paymentMethodSelect = document.getElementById('checkout-payment-method');
    const changeForGroupDiv = document.getElementById('change-for-group');
    const changeInput = document.getElementById('checkout-change');
    const checkoutNeighborhoodSelect = document.getElementById('checkout-neighborhood');
    const checkoutDeliveryFeeLine = document.getElementById('checkout-delivery-fee-line');
    const checkoutDeliveryFeeAmountSpan = document.getElementById('checkout-delivery-fee-amount');
    const checkoutGrandTotalSpan = document.getElementById('checkout-grand-total');
    const checkoutAppliedDiscountInfoDiv = document.getElementById('checkout-applied-discount-info');
    const YOUR_RESTAURANT_WHATSAPP_NUMBER = "551292226418";

    async function fetchDeliveryFees() {
        if (!window.db || !window.firebaseFirestore) return {};
        const { collection, getDocs } = window.firebaseFirestore;
        try {
            const querySnapshot = await getDocs(collection(window.db, "delivery_fees"));
            const fees = {};
            querySnapshot.forEach(doc => {
                fees[doc.data().name] = doc.data().fee;
            });
            return fees;
        } catch (error) {
            console.error("Erro ao buscar taxas de entrega:", error);
            return {};
        }
    }

    function formatPriceLocal(price) {
        return typeof price === 'number' ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(price);
    }

    // *** FUNÇÃO ATUALIZADA PARA LIDAR COM ENTREGA GRÁTIS ***
    function updateCheckoutTotalDisplay() {
        const cartSubtotal = typeof window.getCartSubtotalAmount === 'function' ? window.getCartSubtotalAmount() : 0;
        const loyaltyDiscount = window.getAppliedLoyaltyDiscountInfo ? window.getAppliedLoyaltyDiscountInfo() : null;
        const couponDiscount = window.getAppliedCouponInfo ? window.getAppliedCouponInfo() : null;
        
        let totalDiscountAmount = 0;
        let effectiveDeliveryFee = currentDeliveryFee;

        // Lógica para mostrar a taxa de entrega na UI
        if (checkoutDeliveryFeeAmountSpan && checkoutDeliveryFeeLine) {
            const selectedNeighborhood = checkoutNeighborhoodSelect.value;
            if (selectedNeighborhood && deliveryFeesData.hasOwnProperty(selectedNeighborhood)) {
                checkoutDeliveryFeeAmountSpan.textContent = formatPriceLocal(currentDeliveryFee);
                if (currentDeliveryFee === 0 && selectedNeighborhood === "Borda da Mata") {
                    checkoutDeliveryFeeAmountSpan.style.color = 'var(--green-status)';
                    checkoutDeliveryFeeAmountSpan.textContent = "Grátis";
                } else {
                    checkoutDeliveryFeeAmountSpan.style.color = 'var(--dark-gray)';
                }
                checkoutDeliveryFeeLine.style.display = 'block';
            } else {
                checkoutDeliveryFeeLine.style.display = 'none';
            }
        }

        // Lógica para calcular descontos
        if (loyaltyDiscount) {
            totalDiscountAmount = loyaltyDiscount.discountAmount;
            checkoutAppliedDiscountInfoDiv.innerHTML = `Desconto Fidelidade: - ${formatPriceLocal(totalDiscountAmount)}`;
            checkoutAppliedDiscountInfoDiv.style.display = 'block';

        } else if (couponDiscount) {
            if (couponDiscount.type === 'free_delivery') {
                totalDiscountAmount = currentDeliveryFee;
                effectiveDeliveryFee = 0; // A taxa a ser somada no final é zero
                checkoutAppliedDiscountInfoDiv.innerHTML = `Desconto (Entrega Grátis): - ${formatPriceLocal(totalDiscountAmount)}`;
            } else if (couponDiscount.type === 'percentage') {
                totalDiscountAmount = cartSubtotal * (couponDiscount.value / 100);
                checkoutAppliedDiscountInfoDiv.innerHTML = `Desconto (${couponDiscount.code}): - ${formatPriceLocal(totalDiscountAmount)}`;
            } else { // Cupom de valor fixo
                totalDiscountAmount = couponDiscount.value;
                checkoutAppliedDiscountInfoDiv.innerHTML = `Desconto (${couponDiscount.code}): - ${formatPriceLocal(totalDiscountAmount)}`;
            }
            
            if(totalDiscountAmount > 0) {
                checkoutAppliedDiscountInfoDiv.style.display = 'block';
            } else {
                checkoutAppliedDiscountInfoDiv.style.display = 'none';
            }
        } else {
            checkoutAppliedDiscountInfoDiv.style.display = 'none';
        }
        
        // Calcula o total final
        const grandTotal = cartSubtotal - totalDiscountAmount + effectiveDeliveryFee;

        if (checkoutGrandTotalSpan) {
            checkoutGrandTotalSpan.textContent = formatPriceLocal(grandTotal);
        }
    }

    const closeCheckoutModal = () => {
        if (checkoutModal) checkoutModal.classList.remove('show');
        document.body.style.overflow = '';
    };

    window.openCheckoutModal = async () => {
        if (!checkoutModal) { console.error("Modal de checkout não encontrado!"); return; }
        
        deliveryFeesData = await fetchDeliveryFees();

        const cartItems = typeof window.getCartItems === 'function' ? window.getCartItems() : [];
        if (cartItems.length === 0) {
            alert("Seu carrinho está vazio para finalizar o pedido!");
            if (typeof window.openCartModal === 'function') window.openCartModal();
            return;
        }
        
        let summaryHtml = '<ul>';
        cartItems.forEach(item => {
            summaryHtml += `<li>${item.quantity}x ${item.name}`;
            let details = [];
            if (item.selectedSize && item.selectedSize !== 'único' && item.selectedSize !== 'inteira') details.push(`Tamanho: ${item.selectedSize === 'metade' ? 'Metade/Metade' : item.selectedSize}`);
            if (item.stuffedCrust) details.push(`Borda: ${item.stuffedCrust.typeName}${item.stuffedCrust.filling ? ' (' + item.stuffedCrust.filling + ')' : ''}`);
            if (details.length > 0) summaryHtml += ` (${details.join(', ')})`;
            summaryHtml += ` - ${formatPriceLocal(item.unitPrice * item.quantity)}</li>`;
            if (item.notes) summaryHtml += `<li style="font-size:0.85em; padding-left:15px; color:#777;"><em>Obs: ${item.notes}</em></li>`;
        });
        summaryHtml += '</ul>';
        if (checkoutOrderSummaryDiv) checkoutOrderSummaryDiv.innerHTML = summaryHtml;
        
        if (checkoutNeighborhoodSelect) {
            checkoutNeighborhoodSelect.innerHTML = '<option value="" disabled selected>Selecione o bairro...</option>';
            Object.keys(deliveryFeesData).sort().forEach(neighborhood => {
                const option = document.createElement('option');
                option.value = neighborhood;
                option.textContent = neighborhood;
                checkoutNeighborhoodSelect.appendChild(option);
            });
        }
        currentDeliveryFee = 0;
        if (checkoutForm) {
            checkoutForm.reset();
            if (paymentMethodSelect) paymentMethodSelect.value = '';
            if (changeForGroupDiv) changeForGroupDiv.classList.add('hidden');
            if (changeInput) changeInput.value = '';
            if (window.currentCustomerDetails) {
                document.getElementById('checkout-name').value = window.currentCustomerDetails.firstName || '';
                document.getElementById('checkout-lastname').value = window.currentCustomerDetails.lastName || '';
                document.getElementById('checkout-whatsapp').value = window.currentCustomerDetails.whatsapp || '';
                if (window.currentCustomerDetails.address) {
                    document.getElementById('checkout-street').value = window.currentCustomerDetails.address.street || '';
                    document.getElementById('checkout-number').value = window.currentCustomerDetails.address.number || '';
                    const savedNeighborhood = window.currentCustomerDetails.address.neighborhood;
                    if (savedNeighborhood && checkoutNeighborhoodSelect.querySelector(`option[value="${savedNeighborhood}"]`)) {
                        checkoutNeighborhoodSelect.value = savedNeighborhood;
                    }
                    document.getElementById('checkout-complement').value = window.currentCustomerDetails.address.complement || '';
                    document.getElementById('checkout-reference').value = window.currentCustomerDetails.address.reference || '';
                }
            }
        }
        updateCheckoutTotalDisplay(); // Chama a função aqui para inicializar os totais
        if (document.getElementById('checkout-neighborhood').value) {
           document.getElementById('checkout-neighborhood').dispatchEvent(new Event('change', { bubbles: true }));
        }
        checkoutModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    async function handleSubmitOrder(event) {
        if (event) event.preventDefault();
        
        const cartSubtotal = typeof window.getCartSubtotalAmount === 'function' ? window.getCartSubtotalAmount() : 0;
        const minOrderValue = window.appSettings?.storeInfo?.minOrderValue || 0;
        if (minOrderValue > 0 && cartSubtotal < minOrderValue) {
            alert(`O valor mínimo para pedidos é de ${formatPriceLocal(minOrderValue)}. Por favor, adicione mais itens ao seu carrinho para continuar.`);
            return;
        }

        const name = document.getElementById('checkout-name').value.trim();
        const lastname = document.getElementById('checkout-lastname').value.trim();
        let whatsapp = document.getElementById('checkout-whatsapp').value.trim().replace(/\D/g, '');
        const street = document.getElementById('checkout-street').value.trim();
        const number = document.getElementById('checkout-number').value.trim();
        const selectedNeighborhoodValue = checkoutNeighborhoodSelect.value;
        const complement = document.getElementById('checkout-complement').value.trim();
        const reference = document.getElementById('checkout-reference').value.trim();
        const paymentMethod = paymentMethodSelect.value;
        const changeNeededValue = changeInput.value.trim();

        if (!selectedNeighborhoodValue || !name || !lastname || !whatsapp || !street || !number || !paymentMethod) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        let customerData = {
            whatsapp, 
            firstName: name, 
            lastName: lastname,
            email: window.currentCustomerDetails?.email || '',
            address: { street, number, neighborhood: selectedNeighborhoodValue, complement, reference },
            points: window.currentCustomerDetails?.points || 0,
        };
        
        const loyaltyDiscount = window.getAppliedLoyaltyDiscountInfo ? window.getAppliedLoyaltyDiscountInfo() : null;
        const couponDiscount = window.getAppliedCouponInfo ? window.getAppliedCouponInfo() : null;

        let pointsUsed = 0;
        if (loyaltyDiscount && customerData.points >= loyaltyDiscount.pointsUsed) {
            customerData.points -= loyaltyDiscount.pointsUsed;
            pointsUsed = loyaltyDiscount.pointsUsed;
        }
        
        if (couponDiscount && couponDiscount.oneTimeUsePerCustomer) {
            await markCouponAsUsed(couponDiscount.code);
        }
        
        let totalDiscountAmount = 0;
        if (loyaltyDiscount) {
            totalDiscountAmount = loyaltyDiscount.discountAmount;
        } else if (couponDiscount) {
            if (couponDiscount.type === 'free_delivery') {
                totalDiscountAmount = currentDeliveryFee;
            } else if (couponDiscount.type === 'percentage') {
                totalDiscountAmount = cartSubtotal * (couponDiscount.value / 100);
            } else {
                totalDiscountAmount = couponDiscount.value;
            }
        }
        
        const effectiveDeliveryFee = (couponDiscount?.type === 'free_delivery') ? 0 : currentDeliveryFee;
        const finalGrandTotal = cartSubtotal - totalDiscountAmount + effectiveDeliveryFee;
        const pointsEarned = Math.floor(finalGrandTotal / 50);
        customerData.points += pointsEarned;

        await saveCustomerProfile(customerData);

        const orderData = {
            source: "WebApp",
            customer: { 
                id: window.currentCustomerDetails?.id || whatsapp,
                firstName: name, 
                lastName: lastname, 
                whatsapp: whatsapp 
            },
            delivery: { address: `${street}, ${number}`, neighborhood: selectedNeighborhoodValue, complement, reference, fee: currentDeliveryFee },
            payment: { method: paymentMethod, changeFor: changeNeededValue ? parseFloat(changeNeededValue) : null },
            items: window.getCartItems(),
            totals: { subtotal: cartSubtotal, discount: totalDiscountAmount, deliveryFee: currentDeliveryFee, grandTotal: finalGrandTotal },
            loyalty: { pointsUsed, pointsEarned, finalPointsBalance: customerData.points },
            coupon: couponDiscount 
        };

        try {
            const orderId = await saveOrderToFirestore(orderData);
            orderData.orderId = orderId;
        } catch (error) {
            alert(error.message);
            return;
        }

        if(typeof window.clearCartAndUI === 'function') window.clearCartAndUI();
        closeCheckoutModal();

        if (paymentMethod === 'Pix') {
            if (typeof window.openPixInfoModal === 'function') {
                 const pixData = {
                    ...orderData,
                    grandTotal: orderData.totals.grandTotal,
                    formattedGrandTotal: formatPriceLocal(orderData.totals.grandTotal),
                    deliveryAddress: orderData.delivery,
                    cartItems: orderData.items,
                    formatPriceLocal: formatPriceLocal,
                    pointsFeedback: `Você ganhou *${pointsEarned} ponto(s)* e agora possui um total de *${customerData.points} ponto(s)*!`
                };
                window.openPixInfoModal(pixData);
            } else {
                alert("Erro ao carregar o módulo de pagamento Pix.");
                console.error("A função 'openPixInfoModal' não foi encontrada.");
            }
        } else {
            await showOrderSuccessAnimation({ finalPointsBalance: customerData.points });

            let orderText = `*NOVO PEDIDO D'ITALIA PIZZARIA*\n\n` +
                `*CLIENTE:* ${name} ${lastname}\n` +
                `*WHATSAPP:* ${whatsapp}\n\n` +
                `*ENDEREÇO DE ENTREGA:*\n` +
                `${street}, ${number}\n` +
                `Bairro: ${selectedNeighborhoodValue}\n` +
                (complement ? `Complemento: ${complement}\n` : '') +
                (reference ? `Referência: ${reference}\n` : '') +
                `\n-----------------------------------\n` +
                `*ITENS DO PEDIDO:*\n`;

            orderData.items.forEach(item => {
                orderText += `*${item.quantity}x ${item.name}*\n`;
                if(item.notes) orderText += `  Obs: _${item.notes}_\n`;
            });
            
            orderText += `\n-----------------------------------\n` +
                `Subtotal: ${formatPriceLocal(orderData.totals.subtotal)}\n`;
            
            if(orderData.totals.discount > 0) {
                let discountLabel = loyaltyDiscount ? 'Desconto Fidelidade:' : `Desconto (${couponDiscount?.code || 'Entrega Grátis'}):`;
                orderText += `${discountLabel} -${formatPriceLocal(orderData.totals.discount)}\n`;
            }
            
            orderText += `Taxa de Entrega: ${formatPriceLocal(orderData.totals.deliveryFee)}\n` +
                `*TOTAL A PAGAR: ${formatPriceLocal(orderData.totals.grandTotal)}*\n\n` +
                `*FORMA DE PAGAMENTO: ${paymentMethod}*\n`;

            if (paymentMethod === 'Dinheiro' && orderData.payment.changeFor) {
                orderText += `(Levar troco para R$ ${orderData.payment.changeFor.toFixed(2).replace('.',',')})\n`;
            }

            if (orderData.loyalty.pointsEarned > 0) {
                orderText += `\n-----------------------------------\n` +
                `*PONTOS DE FIDELIDADE:*\n` +
                `Você ganhou *${pointsEarned} ponto(s)* e agora possui um total de *${customerData.points} ponto(s)*!`;
            }

            const whatsappUrl = `https://wa.me/${YOUR_RESTAURANT_WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText)}`;
            
            showCustomConfirm(whatsappUrl);
        }
    }

    if (closeCheckoutModalButton) closeCheckoutModalButton.addEventListener('click', closeCheckoutModal);
    if (checkoutModal) checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) closeCheckoutModal(); });
    if (paymentMethodSelect) paymentMethodSelect.addEventListener('change', (e) => { changeForGroupDiv.classList.toggle('hidden', e.target.value !== 'Dinheiro'); });
    if (checkoutNeighborhoodSelect) {
        checkoutNeighborhoodSelect.addEventListener('change', (e) => {
            currentDeliveryFee = deliveryFeesData[e.target.value] || 0;
            updateCheckoutTotalDisplay();
        });
    }
    if (checkoutForm) checkoutForm.addEventListener('submit', handleSubmitOrder);
});
