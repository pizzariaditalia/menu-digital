// auth-entregador.js - VERSÃO COMPLETA E CORRIGIDA COM LOGIN AUTOMÁTICO

// Importa as funções necessárias, incluindo onAuthStateChanged
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDMaD6Z3CDxdkyzQXHpV3b0QBWr--xQTso",
  authDomain: "app-ditalia.firebaseapp.com",
  projectId: "app-ditalia",
  storageBucket: "app-ditalia.firebasestorage.app",
  messagingSenderId: "122567535166",
  appId: "1:122567535166:web:19de7b8925042027063f6f",
  measurementId: "G-5QW3MVGYME"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- LÓGICA PRINCIPAL: Verificador de Sessão Ativa ---
window.onload = () => {
    const loginContainer = document.querySelector('.login-container');
    const loadingContainer = document.getElementById('loading-auth-state');

    // Este listener verifica se o usuário já está logado assim que a página carrega
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 1. USUÁRIO JÁ ESTÁ LOGADO!
            console.log("Sessão ativa encontrada para:", user.email, "Redirecionando...");
            
            // Mostra uma mensagem de "carregando"
            if(loginContainer) loginContainer.style.display = 'none';
            if(loadingContainer) loadingContainer.style.display = 'flex';
            
            // Redireciona para a página principal do app
            window.location.href = 'app-entregador.html';
        } else {
            // 2. NINGUÉM ESTÁ LOGADO
            console.log("Nenhuma sessão ativa. Exibindo tela de login.");

            // Garante que o formulário de login esteja visível e o "carregando" escondido
            if(loginContainer) loginContainer.style.display = 'block';
            if(loadingContainer) loadingContainer.style.display = 'none';

            // Configura o botão de login para aguardar o clique
            setupLoginButton();
        }
    });
};


// --- Função que configura o botão de login ---
function setupLoginButton() {
    const loginButton = document.getElementById('google-login-button');
    const errorMessage = document.getElementById('error-message');

    if (!loginButton) return;

    // Adiciona o listener de clique apenas se o usuário não estiver logado
    loginButton.addEventListener('click', async () => {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        errorMessage.textContent = '';

        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Verifica se o email do usuário logado está na lista de entregadores
            const q = query(collection(db, "delivery_people"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Se não encontrou o email, não é um entregador autorizado
                errorMessage.textContent = "Acesso negado. Este e-mail não está cadastrado.";
                await signOut(auth); // Desloga o usuário imediatamente
            } else {
                // E-mail autorizado! Pega o ID do documento do entregador
                const driverDoc = querySnapshot.docs[0];
                const driverId = driverDoc.id;

                // Salva o UID do Google no perfil do entregador
                const driverRef = doc(db, "delivery_people", driverId);
                await updateDoc(driverRef, { googleUid: user.uid });

                console.log(`Entregador ${user.displayName} autorizado e logado.`);
                // O redirecionamento para 'app-entregador.html' será feito automaticamente
                // pelo listener 'onAuthStateChanged' que detectará a mudança de estado.
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