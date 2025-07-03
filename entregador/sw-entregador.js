// sw-entregador.js

const CACHE_NAME = 'ditalia-entregador-cache-11';
const URLS_TO_CACHE = [
  './',
  './login.html',
  './app-entregador.html',
  './style-entregador.css',
  './auth-entregador.js',
  './app-entregador.js',
  './manifest-entregador.json',
  '../img/logos/logo-entregador.png', // Logo usado na tela de login
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css' // Ícones
];

// Evento de instalação: abre o cache e armazena os arquivos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => {
      console.log('[SW Entregador] Cache aberto, adicionando arquivos...');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Evento de fetch: serve os arquivos do cache primeiro, se disponíveis
self.addEventListener('fetch', (event) => {
  // Ignora requisições para o Firestore para não interferir
  if (event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
    .then((response) => {
      // Se o recurso for encontrado no cache, retorna ele.
      // Senão, faz a requisição à rede.
      return response || fetch(event.request);
    })
  );
});

// Evento de ativação: limpa caches antigos para manter tudo atualizado
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Se o cache não estiver na lista de permissões, delete-o
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW Entregador] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});