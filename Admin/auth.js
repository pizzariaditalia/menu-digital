// Arquivo: auth.js

// Importando os módulos necessários do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Sua configuração do Firebase (a mesma do paineladmin.html)
const firebaseConfig = {
    
    authDomain: "app-ditalia.firebaseapp.com",
    projectId: "app-ditalia",
    storageBucket: "app-ditalia.firebasestorage.app",
    messagingSenderId: "122567535166",
    appId: "1:122567535166:web:19de7b8925042027063f6f",
    measurementId: "G-5QW3MVGYME"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Seleciona os elementos do formulário
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Adiciona o listener de evento para o envio do formulário
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    const email = emailInput.value;
    const password = passwordInput.value;

    // Faz o login com o Firebase Authentication
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Login bem-sucedido!
            console.log('Login realizado com sucesso:', userCredential.user);
            // Redireciona o usuário para o painel de administração
            window.location.href = 'paineladmin.html';
        })
        .catch((error) => {
            // Ocorreu um erro
            console.error('Erro no login:', error.code, error.message);
            errorMessage.style.display = 'block'; // Mostra a mensagem de erro

            // Traduz as mensagens de erro mais comuns
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage.textContent = 'Formato de e-mail inválido.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage.textContent = 'E-mail ou senha incorretos.';
                    break;
                default:
                    errorMessage.textContent = 'Ocorreu um erro ao tentar fazer login.';
            }
        });
});
