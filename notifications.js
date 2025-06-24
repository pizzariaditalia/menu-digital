// DENTRO DE notifications.js (ARQUIVO NOVO)

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
  if (!window.firebaseMessaging || !window.currentCustomerDetails) {
    console.error('Firebase Messaging ou dados do cliente não estão disponíveis.');
    return;
  }

  const {
    getToken,
    messagingInstance
  } = window.firebaseMessaging;
  const {
    doc,
    updateDoc
  } = window.firebaseFirestore;
  const db = window.db;

  try {
    const vapidKey = 'BEu5mwSdY7ci-Tl8lUJcrq12Ct1w62_2ywucGfPq0FanERTxEUk7wB9PK37dxxles-9jpbN2nsrv3S2xnzelqYU';
    const fcmToken = await getToken(messagingInstance, {
      vapidKey: vapidKey
    });

    if (fcmToken) {
      console.log('FCM Token:', fcmToken);

      // Salva o token no documento do cliente no Firestore
      const customerId = window.currentCustomerDetails.id;
      const customerDocRef = doc(db, "customer", customerId);

      await updateDoc(customerDocRef, {
        notificationTokens: window.firebaseFirestore.arrayUnion(fcmToken)
      });

      alert('Notificações ativadas com sucesso!');
      document.getElementById('notification-button-area').innerHTML = '<p style="color:var(--green-status); font-weight:bold;">Notificações ativadas!</p>';

    } else {
      console.log('No registration token available. Request permission to generate one.');
      alert('Não foi possível ativar as notificações. Tente novamente.');
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    alert('Ocorreu um erro ao ativar as notificações.');
  }
}
