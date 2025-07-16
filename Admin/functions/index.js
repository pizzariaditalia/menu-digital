// functions/index.js - VERSÃO FINAL, COMPLETA E VERIFICADA

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { CloudTasksClient } = require("@google-cloud/tasks");

admin.initializeApp();


// --- FUNÇÃO DE NOTIFICAÇÃO DE STATUS DO PEDIDO ---
exports.onorderstatuschange = onDocumentUpdated("pedidos/{orderId}", async (event) => {
    logger.info(`Iniciando onorderstatuschange para o pedido ${event.params.orderId}`);

    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData.status === afterData.status) {
        logger.info("Status não mudou.");
        return;
    }

    const customerId = afterData.customer?.id;
    const customerFirstName = afterData.customer?.firstName || "cliente";

    let notificationTitle = "";
    let notificationBody = "";

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


// --- FUNÇÃO AGENDADA PARA PEDIR AVALIAÇÃO ---
exports.sendreviewnotification = onRequest({ cors: true }, async (req, res) => {
    if (req.get('X-CloudTasks-QueueName') === undefined) {
      logger.error("Chamada insegura detectada e bloqueada.");
      return res.status(403).send("Acesso não permitido.");
    }
      
    const { customerId } = req.body;
    if (!customerId) {
        logger.error("ID do cliente não fornecido no corpo da requisição.");
        return res.status(400).send("ID do cliente não fornecido.");
    }

    const title = "Como foi sua experiência? ⭐";
    const body = `Olá! Esperamos que tenha gostado do seu pedido. Que tal nos deixar uma avaliação?`;
    
    await sendNotificationToCustomer(customerId, title, body);
    
    return res.status(200).send("Notificação de avaliação processada.");
});


// --- FUNÇÃO PARA ENVIAR NOTIFICAÇÕES EM MASSA (VERSÃO onCall CORRIGIDA) ---
exports.sendbroadcastnotification = functions.https.onCall(async (data, context) => {
    // 1. Verifica se o usuário que está chamando a função é um administrador.
    const adminEmails = [
        'brunotendr@gmail.com',
        'eloy.soares@gmail.com',
        'rosianecpv@gmail.com',
        'coisaspequenas1@gmail.com',
        'alvesdossantosw16@gmail.com',
        'santiagoresende889@gmail.com'
    ];

    if (!context.auth || !adminEmails.includes(context.auth.token.email)) {
        logger.error("Chamada não autorizada por um administrador.", { email: context.auth.token.email });
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem executar esta ação.');
    }

    // 2. Pega o título e o corpo da mensagem diretamente do primeiro argumento 'data'
    const { title, body } = data;
    if (!title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'O título e o corpo da mensagem são obrigatórios.');
    }

    try {
        const db = admin.firestore();
        const customersSnapshot = await db.collection("customer").get();
        
        const allTokens = [];
        customersSnapshot.forEach(doc => {
            const tokens = doc.data().notificationTokens;
            if (tokens && Array.isArray(tokens) && tokens.length > 0) {
                allTokens.push(...tokens);
            }
        });

        if (allTokens.length === 0) {
            logger.info("Nenhum token encontrado para enviar notificações.");
            return { success: true, message: "Nenhum cliente para notificar." };
        }
        
        const uniqueTokens = [...new Set(allTokens)];
        logger.info(`Enviando notificação para ${uniqueTokens.length} tokens únicos.`);

        const message = {
            notification: { title, body, icon: "https://www.pizzaditalia.com.br/img/icons/icon.png" },
            webpush: { fcm_options: { link: "https://www.pizzaditalia.com.br" } },
            tokens: uniqueTokens,
        };

        const messaging = admin.messaging();
        // CORREÇÃO FINAL: Usando o método correto 'sendEachForMulticast'
        const response = await messaging.sendEachForMulticast(message);
        
        logger.info(`Notificações enviadas com sucesso: ${response.successCount} de ${uniqueTokens.length}`);
        
        if (response.failureCount > 0) {
            logger.warn(`Falha ao enviar para ${response.failureCount} tokens.`);
        }

        return { success: true, message: `Notificação enviada para ${response.successCount} dispositivos.` };

    } catch (error) {
        logger.error("Erro interno detalhado durante o envio em massa:", error);
        throw new functions.https.HttpsError('internal', 'Ocorreu um erro interno no servidor ao tentar enviar as notificações.');
    }
});


// --- FUNÇÕES AUXILIARES (HELPERS) ---
async function sendNotificationToCustomer(customerId, title, body) {
    if (!customerId) {
        logger.warn("ID do cliente não fornecido para envio de notificação.");
        return;
    }
    const customerDoc = await admin.firestore().collection("customer").doc(customerId).get();
    if (!customerDoc.exists || !customerDoc.data().notificationTokens || customerDoc.data().notificationTokens.length === 0) {
        logger.warn(`Cliente ${customerId} não encontrado ou sem tokens.`);
        return;
    }
    const notificationTokens = customerDoc.data().notificationTokens;
    const message = {
        notification: {
            title: title,
            body: body,
            icon: "https://www.pizzaditalia.com.br/img/icons/icon.png"
        },
        webpush: {
            fcm_options: {
                link: "https://www.pizzaditalia.com.br"
            }
        },
        tokens: notificationTokens,
    };
    try {
        logger.info(`Enviando notificação "${title}" para o cliente ${customerId}`);
        await admin.messaging().sendEachForMulticast(message);
    } catch (error) {
        logger.error("Erro ao enviar notificação para", customerId, error);
    }
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
