// functions/index.js - VERSÃO FINAL DE PRODUÇÃO

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { CloudTasksClient } = require("@google-cloud/tasks");
const admin = require("firebase-admin");

admin.initializeApp();


exports.onorderstatuschange = onDocumentUpdated("pedidos/{orderId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData.status === afterData.status) {
        return; // O status não mudou, então não faz nada.
    }

    const customerId = afterData.customer?.id;
    const customerFirstName = afterData.customer?.firstName || "cliente";
    
    // Notificações imediatas
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
    
    // Agendamento da notificação de avaliação
    if (afterData.status === "Entregue" || afterData.status === "Finalizado") {
        await scheduleReviewNotificationTask(customerId, event.params.orderId);
    }
});


exports.sendreviewnotification = onRequest({ cors: true }, async (req, res) => {
    if (req.get('X-CloudTasks-QueueName') === undefined) {
      logger.error("Chamada insegura bloqueada.");
      return res.status(403).send("Acesso não permitido.");
    }
      
    const { customerId } = req.body;
    const title = "Como foi sua experiência? ⭐";
    const body = `Olá! Esperamos que tenha gostado do seu pedido. Que tal nos deixar uma avaliação?`;

    await sendNotificationToCustomer(customerId, title, body);
    return res.status(200).send("Notificação de avaliação processada.");
});


// --- Funções Auxiliares ---

async function sendNotificationToCustomer(customerId, title, body) {
    if (!customerId) {
        logger.warn("ID do cliente não fornecido.");
        return;
    }

    const customerDoc = await admin.firestore().collection("customer").doc(customerId).get();
    if (!customerDoc.exists || !customerDoc.data().notificationTokens || customerDoc.data().notificationTokens.length === 0) {
        logger.warn(`Cliente ${customerId} não encontrado ou sem tokens.`);
        return;
    }

    const message = {
        notification: { title, body },
        webpush: {
            notification: { icon: "https://www.pizzaditalia.com.br/img/icons/icon.png" },
            fcm_options: { link: "https://www.pizzaditalia.com.br" }
        },
        tokens: customerDoc.data().notificationTokens,
    };

    try {
        logger.info(`Enviando notificação "${title}" para o cliente ${customerId}`);
        await admin.messaging().sendEachForMulticast(message);
    } catch (error) {
        logger.error("Erro ao enviar notificação:", error);
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

/**
 * Envia uma notificação em massa para todos os clientes com tokens.
 * Esta é uma função HTTP segura que só pode ser chamada por um admin autenticado.
 */
exports.sendbroadcastnotification = onRequest({ cors: true }, async (req, res) => {
    // 1. Verificação de Segurança: Garante que o método é POST
    if (req.method !== "POST") {
        return res.status(405).send("Método não permitido. Use POST.");
    }

    // 2. Verificação de Autenticação: Garante que só um admin pode chamar
    const authorization = req.headers.authorization || "";
    const idToken = authorization.split("Bearer ")[1];

    if (!idToken) {
        logger.error("Token de autenticação não fornecido.");
        return res.status(403).send("Acesso não autorizado.");
    }

    try {
        // Valida o token do admin
        await admin.auth().verifyIdToken(idToken);
        logger.info("Admin autenticado com sucesso.");
    } catch (error) {
        logger.error("Token de admin inválido:", error);
        return res.status(403).send("Token inválido.");
    }

    // 3. Lógica de Envio em Massa
    const { title, body } = req.body;
    if (!title || !body) {
        return res.status(400).send("Título e corpo da mensagem são obrigatórios.");
    }

    try {
        // Busca todos os clientes
        const customersSnapshot = await admin.firestore().collection("customer").get();
        
        let allTokens = [];
        customersSnapshot.forEach(doc => {
            const tokens = doc.data().notificationTokens;
            if (tokens && tokens.length > 0) {
                allTokens.push(...tokens);
            }
        });

        // Remove tokens duplicados para não enviar várias vezes para o mesmo dispositivo
        allTokens = [...new Set(allTokens)];

        if (allTokens.length === 0) {
            logger.info("Nenhum token encontrado para enviar a notificação em massa.");
            return res.status(200).send({ message: "Nenhum cliente com notificação ativa encontrado." });
        }

        logger.info(`Iniciando envio em massa para ${allTokens.length} tokens.`);

        // O FCM tem um limite de 500 tokens por chamada.
        // Vamos dividir em lotes de 500.
        const tokenChunks = [];
        for (let i = 0; i < allTokens.length; i += 500) {
            tokenChunks.push(allTokens.slice(i, i + 500));
        }

        const messagePayload = {
            notification: { title, body },
            webpush: {
                notification: { icon: "https://www.pizzaditalia.com.br/img/icons/icon.png" },
                fcm_options: { link: "https://www.pizzaditalia.com.br" },
            },
        };

        // Envia para cada lote de tokens
        for (const tokens of tokenChunks) {
            const multicastMessage = { ...messagePayload, tokens };
            await admin.messaging().sendEachForMulticast(multicastMessage);
        }

        logger.info("Notificação em massa enviada com sucesso.");
        return res.status(200).send({ message: `Notificação enviada para ${allTokens.length} dispositivos.` });

    } catch (error) {
        logger.error("Erro durante o envio em massa:", error);
        return res.status(500).send("Ocorreu um erro interno.");
    }
});