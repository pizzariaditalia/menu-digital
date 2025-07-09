// sw-entregador.js - VERSÃO COMPLETA COM NOTIFICAÇÕES MELHORADAS

// 1. Importando as bibliotecas do Firebase para o Service Worker
// É necessário usar a versão 'compat' para Service Workers
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// 2. Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDMaD6Z3CDxdkyzQXHpV3b0QBWr--xQTso",
  authDomain: "app-ditalia.firebaseapp.com",
  projectId: "app-ditalia",
  storageBucket: "app-ditalia.firebasestorage.app",
  messagingSenderId: "122567535166",
  appId: "1:122567535166:web:19de7b8925042027063f6f",
  measurementId: "G-5QW3MVGYME"
};

// 3. Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. Lógica para receber a notificação em segundo plano
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW Entregador] Mensagem recebida em segundo plano: ', payload);

  const notificationTitle = payload.notification.title;

  // ALTERADO: Adicionamos as opções de vibração e som
  const notificationOptions = {
    body: payload.notification.body,
    icon: '../img/logos/logo-entregador.png',
    vibrate: [200, 100, 200, 100, 200], // Vibra, pausa, vibra...
    sound: '../audio/notification-entrega.mp3', // Tenta usar o som customizado
    tag: 'nova-entrega-ditalia' // Agrupa notificações para não sobrecarregar
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// 5. Lógica de Cache do PWA (Sua lógica original, com a versão do cache atualizada)
const CACHE_NAME = 'ditalia-entregador-cache-v95'; // Versão incrementada
const URLS_TO_CACHE = [
  './',
  './login.html',
  './app-entregador.html',
  './style-entregador.css',
  './auth-entregador.js',
  './app-entregador.js',
  './manifest-entregador.json',
  '../img/logos/logo-entregador.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => {
      console.log('[SW Entregador] Cache aberto, adicionando arquivos...');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('firestore.googleapis.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
    .then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW Entregador] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});