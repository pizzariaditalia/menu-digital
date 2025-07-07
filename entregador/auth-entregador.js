// auth-entregador.js - VERSÃO FINAL E ROBUSTA

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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

// Listener que verifica se o usuário já está logado ao abrir a página
onAuthStateChanged(auth, (user) => {
    const loginContainer = document.querySelector('.login-container');
    const loadingContainer = document.getElementById('loading-auth-state'); // Assumindo que você tem o loader

    if (user) {
        // Usuário já tem uma sessão ativa, redireciona para o app
        if(loginContainer) loginContainer.style.display = 'none';
        if(loadingContainer) loadingContainer.style.display = 'flex';
        window.location.href = 'app-entregador.html';
    } else {
        // Não há sessão, mostra o botão de login
        if(loginContainer) loginContainer.style.display = 'block';
        if(loadingContainer) loadingContainer.style.display = 'none';
        setupLoginButton();
    }
});

function setupLoginButton() {
    const loginButton = document.getElementById('google-login-button');
    const errorMessage = document.getElementById('error-message');

    if (!loginButton || loginButton.dataset.listener) return;
    loginButton.dataset.listener = 'true';

    loginButton.addEventListener('click', async () => {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        errorMessage.textContent = '';
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // LÓGICA DE VERIFICAÇÃO ROBUSTA
            // 1. Tenta encontrar pelo googleUid (para usuários que já logaram antes)
            let q = query(collection(db, "delivery_people"), where("googleUid", "==", user.uid));
            let querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // 2. Se não encontrou, tenta encontrar pelo e-mail (para o primeiro login)
                console.log("Não encontrou por UID, tentando por e-mail...");
                q = query(collection(db, "delivery_people"), where("email", "==", user.email));
                querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    // 3. Se não encontrou de nenhuma forma, o acesso é negado.
                    errorMessage.textContent = "Acesso negado. Seu e-mail não está na lista de entregadores.";
                    await signOut(auth);
                } else {
                    // Encontrou por e-mail (primeiro login)!
                    const driverDoc = querySnapshot.docs[0];
                    const driverRef = doc(db, "delivery_people", driverDoc.id);
                    await updateDoc(driverRef, { googleUid: user.uid });
                    console.log(`Primeiro login de ${user.displayName}. UID salvo.`);
                    // O onAuthStateChanged vai cuidar do redirecionamento
                }
            } else {
                // Encontrou por UID (usuário retornando), tudo certo.
                console.log(`Entregador ${user.displayName} retornando.`);
                // O onAuthStateChanged vai cuidar do redirecionamento
            }
        } catch (error) {
            console.error("Erro no login com Google:", error);
            errorMessage.textContent = "Ocorreu um erro durante o login.";
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fab fa-google"></i> Entrar com Google';
        }
    });
}