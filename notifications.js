// DENTRO DE notifications.js (VERSÃO COMPLETA DE DEPURAÇÃO)

// Função principal que inicia o processo de permissão
async function requestNotificationPermission() {
    console.log('Requesting notification permission...');
    
    // Pede a permissão ao usuário
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
        console.log('Notification permission granted.');
        // Se a permissão for concedida, pega o token
        await getAndSaveToken();
    } else {
        console.log('Unable to get permission to notify.');
        alert('Você não permitiu as notificações. Se mudar de ideia, pode alterar nas configurações do seu navegador.');
    }
}

// Função que pega o token do Firebase e salva no Firestore
async function getAndSaveToken() {
    console.log("PASSO 1: Iniciando getAndSaveToken.");
    if (!window.firebaseMessaging || !window.currentCustomerDetails) {
        console.error('ERRO FATAL: Firebase Messaging ou dados do cliente não estão disponíveis no momento da chamada.');
        return;
    }
    
    console.log("PASSO 2: Instâncias do Firebase e do cliente OK.");
    const { getToken, messagingInstance } = window.firebaseMessaging;
    const { doc, updateDoc, arrayUnion } = window.firebaseFirestore;
    const db = window.db;

    try {
        const vapidKey = 'BEu5mwSdY7ci-Tl8lUJcrq12Ct1w62_2ywucGfPq0FanERTxEUk7wB9PK37dxxles-9jpbN2nsrv3S2xnzelqYU';
        console.log("PASSO 3: Usando Vapid Key: ", vapidKey);
        
        console.log("PASSO 4: Aguardando o Service Worker ficar pronto (navigator.serviceWorker.ready)...");
        const swRegistration = await navigator.serviceWorker.ready;
        console.log("PASSO 5: Service Worker está pronto!", swRegistration);

        console.log("PASSO 6: Chamando getToken() do Firebase...");
        const fcmToken = await getToken(messagingInstance, { 
            vapidKey: vapidKey,
            serviceWorkerRegistration: swRegistration
        });
        
        console.log("PASSO 7: Chamada para getToken() concluída. O resultado do token é:", fcmToken);

        if (fcmToken) {
            console.log('PASSO 8: Token recebido com sucesso! Salvando no Firestore...');
            
            const customerId = window.currentCustomerDetails.id;
            const customerDocRef = doc(db, "customer", customerId);

            await updateDoc(customerDocRef, {
                notificationTokens: arrayUnion(fcmToken)
            });
            
            console.log("PASSO 9: Token salvo no Firestore com sucesso.");
            alert('Notificações ativadas com sucesso!');
            document.getElementById('notification-button-area').innerHTML = '<p style="color:var(--green-status); font-weight:bold;">Notificações ativadas!</p>';
            
        } else {
            console.log('PASSO 8 (FALHA): O token retornado pelo Firebase é nulo ou vazio. O processo para aqui.');
            alert('Não foi possível obter o token de notificação. Verifique as configurações de permissão do seu navegador.');
        }
    } catch (err) {
        console.error('ERRO FATAL no bloco try/catch. A execução falhou em algum ponto.', err);
        alert('Ocorreu um erro inesperado ao ativar as notificações.');
    }
}
