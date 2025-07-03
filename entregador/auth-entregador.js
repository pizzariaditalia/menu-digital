// auth-entregador.js - VERSÃO COM LOGIN GOOGLE E VERIFICAÇÃO

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDMaD6Z3CDxdkyzQXHpV3b0QBWr--xQTso",
    authDomain: "app-ditalia.firebaseapp.com",
    projectId: "app-ditalia",
    storageBucket: "app-ditalia.firebasestorage.app",
    messagingSenderId: "122567535166",
    appId: "1:122567535166:web:19de7b8925042027063f6f",
    measurementId: "G-5QW3MVGYME"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.onload = () => {
    const loginButton = document.getElementById('google-login-button');
    const errorMessage = document.getElementById('error-message');

    if (!loginButton) return;

    loginButton.addEventListener('click', async () => {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        errorMessage.textContent = '';

        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Passo crucial: Verifica se o email do usuário logado está na lista de entregadores
            const q = query(collection(db, "delivery_people"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Se não encontrou o email, não é um entregador autorizado
                errorMessage.textContent = "Acesso negado. Este e-mail não está cadastrado.";
                await signOut(auth); // Desloga o usuário imediatamente
            } else {
                // E-mail autorizado! Pega o ID do documento do entregador (que é o WhatsApp)
                const driverDoc = querySnapshot.docs[0];
                const driverId = driverDoc.id;

                // Opcional, mas recomendado: Salva o UID do Google no perfil do entregador
                // Isso nos permitirá usar regras de segurança mais fortes no futuro
                const driverRef = doc(db, "delivery_people", driverId);
                await updateDoc(driverRef, { googleUid: user.uid });

                console.log(`Entregador ${user.displayName} autorizado e logado.`);
                window.location.href = 'app-entregador.html'; // Redireciona para o app
            }

        } catch (error) {
            console.error("Erro no login com Google:", error);
            errorMessage.textContent = "Ocorreu um erro durante o login.";
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fab fa-google"></i> Entrar com Google';
        }
    });
};