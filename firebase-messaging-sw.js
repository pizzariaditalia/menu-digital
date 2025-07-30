// Arquivo: firebase-messaging-sw.js - VERSÃO FINAL E CORRIGIDA

// Importa os scripts necessários do Firebase (versão compatível para Service Workers)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

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

// Inicializa o Firebase no Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handler para quando a notificação é recebida com o site em segundo plano
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Mensagem recebida em segundo plano: ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/img/icons/icon-192x192.png' // Use um caminho absoluto a partir da raiz do site
    };

    // Exibe a notificação
    self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'ditalia-pizzaria-cache-v310'; // Mudei a versão mais uma vez
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/scripts.js',
  '/menu.js',
  '/cart.js',
  '/productModal.js',
  '/checkout.js',
  '/loyalty.js',
  '/notifications.js',
  '/pixPayment.js',
  '/img/logos/logo.png',
  '/img/icons/icon.png' // <<< CORREÇÃO APLICADA AQUI
];

self.addEventListener('install', (event) => {
  console.log('[sw.js] Evento de instalação disparado (v73).');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[sw.js] Cache aberto, adicionando URLs ao cache.');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch((error) => {
        console.error('[sw.js] Falha ao adicionar arquivos ao cache durante a instalação:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[sw.js] Evento de ativação disparado (v73).');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[sw.js] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
