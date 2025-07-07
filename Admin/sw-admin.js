// Importa as bibliotecas do Firebase
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

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Lógica para receber a notificação em segundo plano
messaging.onBackgroundMessage(function(payload) {
  console.log('[sw-admin.js] Mensagem de novo pedido recebida: ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '../img/icons/iconadm-192x192.png',
    vibrate: [300, 100, 400] // Um padrão de vibração diferente para pedidos
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'ditalia-admin-cache-v200';
const URLS_TO_CACHE = [
  './login.html',
  './auth.js',
  './paineladmin.html',
  './styleadmin.css',
  './styleadmin-2.css',
  './admin.js',
  './pedidos.js',
  './cardapio.js',
  './pdv.js',
  './clientes.js',
  './vendas.js',
  './promocoes.js',
  './config.js',
  './appearance.js',
  '../img/logos/logo.png',
  '../img/icons/icon-192x192.png',
  '../img/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
];

// Evento de instalação: abre o cache e armazena os arquivos do app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => {
      console.log('Cache do Admin aberto');
      // Adiciona todas as URLs ao cache. Se uma falhar, a instalação falha.
      return Promise.all(
        URLS_TO_CACHE.map(url => {
          return cache.add(new Request(url, {
            cache: 'reload'
          })).catch(err => {
            console.warn(`Falha ao adicionar ao cache: ${url}`, err);
          });
        })
      );
    })
  );
});

// Evento de fetch: intercepta as requisições
self.addEventListener('fetch', (event) => {
  // Não aplica o cache para requisições do Firebase
  if (event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
    .then((response) => {
      // Se o recurso for encontrado no cache, retorna ele
      if (response) {
        return response;
      }
      // Senão, faz a requisição à rede
      return fetch(event.request);
    })
  );
});

// Evento de ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo do admin:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});