// Arquivo: firebase-init.js - VERSÃO FINAL E CORRIGIDA

// Importa tudo o que o painel vai precisar do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, orderBy, onSnapshot, deleteDoc, writeBatch, serverTimestamp, Timestamp, limit, arrayUnion, arrayRemove, increment, documentId, addDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDMaD6Z3CDxdkyzQXHpV3b0QBWr--xQTso",
    authDomain: "app-ditalia.firebaseapp.com",
    projectId: "app-ditalia",
    storageBucket: "app-ditalia.firebasestorage.app",
    messagingSenderId: "122567535166",
    appId: "1:122567535166:web:19de7b8925042027063f6f",
    measurementId: "G-5QW3MVGYME"
};

// Inicializa o Firebase App
const app = initializeApp(firebaseConfig);

// Disponibiliza os serviços essenciais globalmente na 'window'
window.auth = getAuth(app);
window.db = getFirestore(app);

// ================== AQUI ESTÁ A CORREÇÃO ==================
// Cria o objeto 'firebaseFunctions' que o comunicados.js espera,
// contendo tanto a instância quanto a função para chamar.
const functions = getFunctions(app, 'us-central1');
window.firebaseFunctions = {
    functions: functions,
    httpsCallable: httpsCallable
};
// =========================================================

// Disponibiliza as funções do Firestore globalmente
window.firebaseFirestore = { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, orderBy, onSnapshot, deleteDoc, writeBatch, serverTimestamp, Timestamp, limit, arrayUnion, arrayRemove, increment, documentId, addDoc, runTransaction };

// A lógica de autenticação e inicialização do painel (permanece a mesma)
onAuthStateChanged(window.auth, async (user) => {
    if (user) {
        const userDocRef = doc(window.db, "panel_users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userRole = 'guest';
        if (userDocSnap.exists()) {
            userRole = userDocSnap.data().role;
        }
        console.log(`Usuário autenticado com o cargo: ${userRole}`);

        if (typeof startAdminPanel === 'function') {
            startAdminPanel(userRole);
        }
        
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                signOut(window.auth).then(() => { window.location.href = 'login.html'; });
            });
        }
    } else {
        window.location.href = 'login.html';
    }
});