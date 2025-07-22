// DENTRO DE sw.js (VERSÃO FINAL CORRIGIDA)

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDMaD6Z3CDxdkyzQXHpV3b0QBWr--xQTso",
    authDomain: "app-ditalia.firebaseapp.com",
    projectId: "app-ditalia",
    storageBucket: "app-ditalia.firebasestorage.app",
    messagingSenderId: "122567535166",
    appId: "1:122567535166:web:19de7b8925042027063f6f",
    measurementId: "G-5QW3MVGYME"
};

console.log("[sw.js] Service Worker está sendo inicializado com a seguinte configuração:", firebaseConfig);

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/img/icons/icon.png' // Corrigido para corresponder ao que será cacheado
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'ditalia-pizzaria-cache-v287'; // Mudei a versão mais uma vez
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
