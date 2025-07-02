// pixPayment.js - VERSÃO COM A MENSAGEM DO WHATSAPP ATUALIZADA

document.addEventListener('DOMContentLoaded', () => {
    // --- Detalhes do Pix da Loja ---
    const RESTAURANT_PIX_KEY = "bdc5a2d5-6a91-425c-824e-a638901065cf";
    const RESTAURANT_RECIPIENT_NAME = "Eloy Soares Ribeiro Junior";
    const RESTAURANT_RECIPIENT_CPF = "***.320.498-**";
    const RESTAURANT_PIX_INSTITUTION = "PAGSEGURO INTERNET IP S.A.";
    const YOUR_RESTAURANT_WHATSAPP_NUMBER_FOR_PIX = "551292226418";

    const pixInfoModal = document.getElementById('pix-info-modal');
    const pixInfoCloseButton = pixInfoModal ? pixInfoModal.querySelector('.pix-info-close-button') : null;
    const pixPaymentAmountSpan = document.getElementById('pix-payment-amount');
    const pixKeyDisplayInput = document.getElementById('pix-key-display');
    const copyPixKeyButton = document.getElementById('copy-pix-key-button');
    const pixKeyCopiedMessage = document.getElementById('pix-key-copied-message');
    const pixRecipientNameSpan = document.getElementById('pix-recipient-name');
    const pixRecipientCpfSpan = document.getElementById('pix-recipient-cpf');
    const pixRecipientInstitutionSpan = document.getElementById('pix-recipient-institution');
    const proceedWithPixOrderButton = document.getElementById('proceed-with-pix-order-button');

    let currentOrderDataForPix = null;

    if (!pixInfoModal) {
        console.error("PixPayment: Elemento do modal de informações do Pix não encontrado!");
        return;
    }

    if (pixKeyDisplayInput) pixKeyDisplayInput.value = RESTAURANT_PIX_KEY;
    if (pixRecipientNameSpan) pixRecipientNameSpan.textContent = RESTAURANT_RECIPIENT_NAME;
    if (pixRecipientCpfSpan) pixRecipientCpfSpan.textContent = RESTAURANT_RECIPIENT_CPF;
    if (pixRecipientInstitutionSpan) pixRecipientInstitutionSpan.textContent = RESTAURANT_PIX_INSTITUTION;

    window.openPixInfoModal = (orderData) => {
        currentOrderDataForPix = orderData; 
        if(pixPaymentAmountSpan) pixPaymentAmountSpan.textContent = orderData.formattedGrandTotal; 
        if(pixKeyCopiedMessage) pixKeyCopiedMessage.style.display = 'none';
        pixInfoModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    function closePixInfoModal() {
        pixInfoModal.style.display = 'none';
        document.body.style.overflow = '';
        currentOrderDataForPix = null; 
    }

    if(pixInfoCloseButton) pixInfoCloseButton.addEventListener('click', closePixInfoModal);
    pixInfoModal.addEventListener('click', (event) => { if (event.target === pixInfoModal) closePixInfoModal(); });

    if(copyPixKeyButton) {
        copyPixKeyButton.addEventListener('click', () => {
            pixKeyDisplayInput.select();
            pixKeyDisplayInput.setSelectionRange(0, 99999); 
            try {
                document.execCommand('copy');
                if(pixKeyCopiedMessage) {
                    pixKeyCopiedMessage.style.display = 'block';
                    setTimeout(() => { pixKeyCopiedMessage.style.display = 'none'; }, 2000); 
                }
            } catch (err) {
                console.error('Erro ao tentar copiar a chave Pix:', err);
                alert('Não foi possível copiar a chave. Por favor, copie manualmente.');
            }
            window.getSelection().removeAllRanges(); 
        });
    }

    if(proceedWithPixOrderButton) {
        proceedWithPixOrderButton.addEventListener('click', () => {
            if (!currentOrderDataForPix) {
                alert("Erro: Dados do pedido não encontrados.");
                closePixInfoModal();
                return;
            }

            // =========================================================================
            // [ALTERAÇÃO] - MENSAGEM DO WHATSAPP ATUALIZADA (PARA PIX)
            // =========================================================================
            let orderDetailsText = `*NOVO PEDIDO D'ITALIA PIZZARIA*\n\n` +
                `*CLIENTE:* ${currentOrderDataForPix.customer.firstName} ${currentOrderDataForPix.customer.lastName}\n` +
                `*WHATSAPP:* ${currentOrderDataForPix.customer.whatsapp}\n\n` +
                `*ENDEREÇO DE ENTREGA:*\n` +
                `${currentOrderDataForPix.deliveryAddress.address}\n` + // Utiliza o campo de endereço completo
                `Bairro: ${currentOrderDataForPix.deliveryAddress.neighborhood}\n` +
                (currentOrderDataForPix.deliveryAddress.complement ? `Complemento: ${currentOrderDataForPix.deliveryAddress.complement}\n` : '') +
                (currentOrderDataForPix.deliveryAddress.reference ? `Referência: ${currentOrderDataForPix.deliveryAddress.reference}\n` : '') +
                `\n-----------------------------------\n` +
                `*ITENS DO PEDIDO:*\n`;

            currentOrderDataForPix.items.forEach(item => {
                orderDetailsText += `*${item.quantity}x ${item.name}*\n`;
                if(item.notes) orderDetailsText += `  Obs: _${item.notes}_\n`;
            });
            
            orderDetailsText += `\n-----------------------------------\n` +
                `Subtotal: ${currentOrderDataForPix.formatPriceLocal(currentOrderDataForPix.totals.subtotal)}\n`;
            
            if(currentOrderDataForPix.totals.discount > 0) {
                orderDetailsText += `Desconto Fidelidade: -${currentOrderDataForPix.formatPriceLocal(currentOrderDataForPix.totals.discount)}\n`;
            }
            
            orderDetailsText += `Taxa de Entrega: ${currentOrderDataForPix.formatPriceLocal(currentOrderDataForPix.totals.deliveryFee)}\n` +
                `*TOTAL A PAGAR: ${currentOrderDataForPix.formatPriceLocal(currentOrderDataForPix.totals.grandTotal)}*\n\n` +
                `*FORMA DE PAGAMENTO: Pix*\n\n` +
                `*ATENÇÃO: Pagamento via Pix.*\n` +
                `_Por favor, envie o comprovante nesta conversa para confirmar seu pedido._\n`;

            if (currentOrderDataForPix.pointsFeedback) {
                orderDetailsText += `\n-----------------------------------\n` +
                `*PONTOS DE FIDELIDADE:*\n` +
                `${currentOrderDataForPix.pointsFeedback}`;
            }

            const whatsappUrl = `https://wa.me/${YOUR_RESTAURANT_WHATSAPP_NUMBER_FOR_PIX}?text=${encodeURIComponent(orderDetailsText)}`;
            
            window.open(whatsappUrl, '_blank');
            closePixInfoModal(); 

            setTimeout(() => { 
                alert(`Agora, basta enviar esta mensagem no WhatsApp e anexar o comprovante do seu pagamento Pix, ${currentOrderDataForPix.customer.firstName || ''}!`);
            }, 500);
        });
    }
});