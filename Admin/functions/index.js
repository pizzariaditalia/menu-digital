// Arquivo: functions/index.js - VERSÃO 100% COMPLETA E FINAL

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { CloudTasksClient } = require("@google-cloud/tasks");

// Inicializa o Firebase Admin SDK uma única vez
admin.initializeApp();

// =====================================================================
// --- FUNÇÃO DE CRIAR USUÁRIO DO PAINEL ---
// =====================================================================
exports.createPanelUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar autenticado para executar esta ação.");
  }
  const adminDoc = await admin.firestore().collection("panel_users").doc(request.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Você não tem permissão de administrador para executar esta ação.");
  }
  const { email, password, name, role } = request.data;
  let newUserRecord;
  try {
    newUserRecord = await admin.auth().createUser({ email, password, displayName: name });
  } catch (error) {
    logger.error("Erro ao criar usuário na Autenticação:", error);
    throw new HttpsError("internal", "Erro ao criar o login do usuário.");
  }
  try {
    await admin.firestore().collection("panel_users").doc(newUserRecord.uid).set({ name, email, role });
  } catch (error) {
    logger.error("Erro ao salvar usuário no Firestore:", error);
    await admin.auth().deleteUser(newUserRecord.uid);
    throw new HttpsError("internal", "Erro ao salvar os dados do usuário.");
  }
  return { message: `Usuário ${name} criado com sucesso com o cargo de ${role}!`, uid: newUserRecord.uid };
});


// =====================================================================
// --- FUNÇÃO DE NOTIFICAÇÃO EM MASSA (PUSH) ---
// =====================================================================
exports.sendbroadcastnotification = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'A requisição deve ser autenticada por um usuário logado.');
    }
    const adminDoc = await admin.firestore().collection("panel_users").doc(request.auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        throw new HttpsError('permission-denied', 'Apenas administradores podem executar esta ação.');
    }
    const { title, body } = request.data;
    if (!title || !body) {
        throw new HttpsError('invalid-argument', 'O título e o corpo da mensagem são obrigatórios.');
    }
    try {
        const customersSnapshot = await admin.firestore().collection("customer").get();
        const allTokens = [];
        customersSnapshot.forEach(doc => {
            const tokens = doc.data().notificationTokens;
            if (tokens && Array.isArray(tokens) && tokens.length > 0) {
                allTokens.push(...tokens);
            }
        });
        if (allTokens.length === 0) {
            return { success: true, message: "Nenhum cliente para notificar." };
        }
        const uniqueTokens = [...new Set(allTokens)];
        const message = {
            notification: { title, body },
            webpush: {
                notification: { icon: 'https://www.pizzaditalia.com.br/img/icons/icon.png' },
                fcm_options: { link: 'https://www.pizzaditalia.com.br' }
            },
            tokens: uniqueTokens,
        };
        const response = await admin.messaging().sendEachForMulticast(message);
        logger.info(`Notificações enviadas com sucesso: ${response.successCount} de ${uniqueTokens.length}`);
        if (response.failureCount > 0) {
            logger.warn(`Falha ao enviar para ${response.failureCount} tokens.`);
        }
        return { success: true, message: `Notificação enviada para ${response.successCount} dispositivos.` };
    } catch (error) {
        logger.error("Erro interno durante o envio em massa:", error);
        throw new HttpsError('internal', 'Ocorreu um erro no servidor ao enviar as notificações.');
    }
});


// =====================================================================
// --- FUNÇÃO PARA NOTIFICAR O ENTREGADOR (COM LOGS DETALHADOS) ---
// =====================================================================
exports.onDeliveryAssigned = onDocumentUpdated("pedidos/{orderId}", async (event) => {
    const orderId = event.params.orderId;
    logger.info(`[INÍCIO] Verificando atribuição para o pedido ${orderId}`);

    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    const oldDriverId = beforeData.delivery?.assignedTo?.id;
    const newDriverId = afterData.delivery?.assignedTo?.id;

    if (newDriverId && oldDriverId !== newDriverId) {
        logger.info(`--> Pedido ${orderId} foi atribuído ao entregador ID: ${newDriverId}`);
        try {
            // LOG ADICIONADO: Avisa que vai buscar o documento do entregador
            logger.info(`--> Buscando documento em 'delivery_people/${newDriverId}'...`);
            const driverDoc = await admin.firestore().collection("delivery_people").doc(newDriverId).get();

            if (!driverDoc.exists) {
                logger.warn(`[FALHA] Documento do entregador 'delivery_people/${newDriverId}' não foi encontrado.`);
                return;
            }

            const driverData = driverDoc.data();
            // LOG ADICIONADO: Mostra os dados encontrados
            logger.info("--> Documento do entregador encontrado:", driverData);

            const tokens = driverData.notificationTokens;
            if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
                logger.warn(`[FALHA] O entregador ${newDriverId} não possui tokens de notificação válidos.`);
                return;
            }

            // LOG ADICIONADO: Mostra os tokens que serão usados
            logger.info(`--> Tokens encontrados para envio: ${JSON.stringify(tokens)}`);

            const customerName = afterData.customer?.firstName || 'Cliente';
            const message = {
                notification: {
                    title: "Nova Entrega para Você! 🛵",
                    body: `Pedido para ${customerName} no bairro ${afterData.delivery?.neighborhood || ''}. Toque para ver os detalhes.`,
                },
                tokens: tokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            // LOG MELHORADO: Mostra o resultado do envio
            logger.info(`[SUCESSO] Envio para FCM concluído. Sucessos: ${response.successCount}, Falhas: ${response.failureCount}`);

        } catch (error) {
            // LOG DE ERRO MELHORADO: Captura qualquer erro no processo
            logger.error(`[ERRO GERAL] Erro ao processar notificação para o entregador ${newDriverId}:`, error);
        }
    } else {
        logger.info(`[FIN] Nenhuma nova atribuição para o pedido ${orderId}.`);
    }
});


// =====================================================================
// --- FUNÇÕES DE STATUS DE PEDIDO E AVALIAÇÃO ---
// =====================================================================
exports.onorderstatuschange = onDocumentUpdated("pedidos/{orderId}", async (event) => {
    logger.info(`Iniciando onorderstatuschange para o pedido ${event.params.orderId}`);
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    if (beforeData.status === afterData.status) return;

    const customerId = afterData.customer?.id;
    const customerFirstName = afterData.customer?.firstName || "cliente";
    let notificationTitle = "", notificationBody = "";

    if (afterData.status === "Em Preparo") {
        notificationTitle = "Seu pedido foi confirmado! ✅";
        notificationBody = `Olá, ${customerFirstName}! Seu pedido já está sendo preparado com muito carinho.`;
    } else if (afterData.status === "Saiu para Entrega") {
        notificationTitle = "Sua pizza está a caminho! 🛵";
        notificationBody = `Boas notícias, ${customerFirstName}! Seu pedido acabou de sair para entrega.`;
    }
    if (notificationTitle) {
        await sendNotificationToCustomer(customerId, notificationTitle, notificationBody);
    }
    if (afterData.status === "Entregue" || afterData.status === "Finalizado") {
        await scheduleReviewNotificationTask(customerId, event.params.orderId);
    }
});

exports.sendreviewnotification = onRequest({ cors: true }, async (req, res) => {
    if (req.get('X-CloudTasks-QueueName') === undefined) {
      return res.status(403).send("Acesso não permitido.");
    }
    const { customerId } = req.body;
    if (!customerId) {
        return res.status(400).send("ID do cliente não fornecido.");
    }
    const title = "Como foi sua experiência? ⭐";
    const body = `Olá! Esperamos que tenha gostado do seu pedido. Que tal nos deixar uma avaliação?`;
    await sendNotificationToCustomer(customerId, title, body);
    return res.status(200).send("Notificação de avaliação processada.");
});


// --- FUNÇÕES AUXILIARES (HELPERS) ---
async function sendNotificationToCustomer(customerId, title, body) {
    if (!customerId) return;
    const customerDoc = await admin.firestore().collection("customer").doc(customerId).get();
    if (!customerDoc.exists() || !customerDoc.data().notificationTokens || customerDoc.data().notificationTokens.length === 0) {
        logger.warn(`Cliente ${customerId} não encontrado ou sem tokens.`);
        return;
    }
    const notificationTokens = customerDoc.data().notificationTokens;
    const message = {
        notification: { title, body, icon: "https://www.pizzaditalia.com.br/img/icons/icon.png" },
        webpush: { fcm_options: { link: "https://www.pizzaditalia.com.br" } },
        tokens: notificationTokens,
    };
    await admin.messaging().sendEachForMulticast(message);
}

async function scheduleReviewNotificationTask(customerId, orderId) {
    try {
        const project = process.env.GCLOUD_PROJECT;
        const location = "us-central1";
        const queue = "review-notifications";
        const tasksClient = new CloudTasksClient();
        const queuePath = tasksClient.queuePath(project, location, queue);
        const url = `https://${location}-${project}.cloudfunctions.net/sendreviewnotification`;
        const payload = { customerId, orderId };
        const twoHoursInSeconds = 2 * 60 * 60;
        const task = {
            httpRequest: {
                httpMethod: "POST",
                url,
                body: Buffer.from(JSON.stringify(payload)).toString("base64"),
                headers: { "Content-Type": "application/json" },
            },
            scheduleTime: { seconds: Date.now() / 1000 + twoHoursInSeconds },
        };
        await tasksClient.createTask({ parent: queuePath, task });
        logger.info(`Tarefa de avaliação agendada para o pedido ${orderId}.`);
    } catch (error) {
        logger.error("ERRO AO AGENDAR TAREFA DE AVALIAÇÃO:", error);
    }
}