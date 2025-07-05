// auth-entregador.js - VERSÃO OTIMIZADA COM SPLASH SCREEN

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

// Listener que verifica a sessão assim que a página carrega
onAuthStateChanged(auth, (user) => {
    // Adiciona um pequeno delay para a transição ser mais suave
    setTimeout(() => {
        if (user) {
            // Se tem usuário, vai direto para o app
            window.location.href = 'app-entregador.html';
        } else {
            // Se não tem usuário, esconde a splash e mostra o botão de login
            const splashScreen = document.getElementById('splash-screen-container');
            const loginContainer = document.getElementById('login-container');

            if (splashScreen) splashScreen.classList.add('hidden');
            if (loginContainer) loginContainer.classList.remove('hidden');
            
            // Configura o botão de login para aguardar o clique
            setupLoginButton();
        }
    }, 500); // Meio segundo de delay
});

function setupLoginButton() {
    const loginButton = document.getElementById('google-login-button');
    const errorMessage = document.getElementById('error-message');

    if (!loginButton || loginButton.dataset.listener) return;
    loginButton.dataset.listener = 'true'; // Previne adicionar o listener múltiplas vezes

    loginButton.addEventListener('click', async () => {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const q = query(collection(db, "delivery_people"), where("googleUid", "==", user.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                errorMessage.textContent = "Acesso negado. Este e-mail não está cadastrado.";
                await signOut(auth);
            } else {
                // O onAuthStateChanged vai detectar o login e redirecionar
            }
        } catch (error) {
            console.error("Erro no login com Google:", error);
            errorMessage.textContent = "Ocorreu um erro durante o login.";
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fab fa-google"></i> Entrar com Google';
        }
    });
}