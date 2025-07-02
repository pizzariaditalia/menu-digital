// notifications.js - VERSÃO ATUALIZADA PARA LIDAR COM TOKEN PENDENTE

/**
 * Salva o token de notificação no Firestore se o usuário estiver logado,
 * ou no localStorage se não estiver logado.
 * @param {string} fcmToken O token FCM gerado pelo Firebase.
 */
async function getAndSaveToken(fcmToken) {
    if (!fcmToken) {
        console.warn("getAndSaveToken foi chamado sem um token.");
        return;
    }

    const customerId = window.currentCustomerDetails?.id;

    // Se não houver cliente logado, salva o token temporariamente
    if (!customerId) {
        console.log("Usuário não logado. O token será salvo temporariamente no localStorage.");
        localStorage.setItem('pendingFCMToken', fcmToken);
        return;
    }

    // Se o cliente estiver logado, salva o token no Firestore
    console.log(`Salvando token para o cliente logado: ${customerId}...`);
    const { doc, updateDoc, arrayUnion } = window.firebaseFirestore;
    const db = window.db;
    const customerDocRef = doc(db, "customer", customerId);

    try {
        await updateDoc(customerDocRef, {
            notificationTokens: arrayUnion(fcmToken)
        });
        console.log("Token salvo no Firestore com sucesso.");
        // Limpa o token pendente do localStorage se ele existir, pois agora está salvo permanentemente
        localStorage.removeItem('pendingFCMToken');
    } catch (error) {
        console.error("Erro ao salvar token no Firestore:", error);
    }
}

/**
 * Inicia o processo de pedido de permissão de notificação para o usuário.
 */
async function requestNotificationPermission() {
    // Verifica se o navegador suporta a API de Notificação
    if (!('Notification' in window)) {
        alert('Este navegador não suporta notificações.');
        return;
    }

    try {
        // Pede a permissão ao usuário
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Permissão de notificação concedida pelo usuário.');
            
            // Pega as ferramentas do Firebase Messaging
            const { getToken, messagingInstance } = window.firebaseMessaging;
            const vapidKey = 'BEu5mwSdY7ci-Tl8lUJcrq12Ct1w62_2ywucGfPq0FanERTxEUk7wB9PK37dxxles-9jpbN2nsrv3S2xnzelqYU';
            
            // Garante que o Service Worker está pronto
            const swRegistration = await navigator.serviceWorker.ready;

            // Pega o token FCM
            const fcmToken = await getToken(messagingInstance, {
                vapidKey: vapidKey,
                serviceWorkerRegistration: swRegistration
            });

            if (fcmToken) {
                // Chama a função para salvar o token (no Firestore ou localStorage)
                await getAndSaveToken(fcmToken);
                
                // Atualiza a UI e informa o usuário
                const notificationArea = document.getElementById('notification-button-area');
                if (notificationArea) {
                    notificationArea.innerHTML = '<p style="color:var(--green-status); font-weight:bold;">Notificações ativadas!</p>';
                }
                alert('Notificações ativadas com sucesso!');

            } else {
                alert('Não foi possível obter o token de notificação. Tente novamente.');
            }
        } else {
            console.log('Permissão de notificação não concedida pelo usuário.');
        }
    } catch (err) {
        console.error('Ocorreu um erro ao solicitar a permissão de notificação.', err);
    }
}
