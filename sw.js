const CACHE_NAME = 'ditalia-pizzaria-cache-v51';
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
  '/pixPayment.js',
  '/img/logos/logo.png',
  '/img/icons/icon-192x192.png',
  '/img/icons/icon-512x512.png'
];

// Evento de instalação: abre o cache e armazena os arquivos do app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Evento de fetch: intercepta as requisições
// Se o recurso estiver no cache, retorna do cache. Senão, busca na rede.
self.addEventListener('fetch', (event) => {
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
