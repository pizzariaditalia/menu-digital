// Arquivo: mapa.js
// Lógica para o mapa de rastreamento em tempo real

let mapSectionInitialized = false;
let map; // Variável para guardar a instância do mapa
let driverMarkers = {}; // Objeto para guardar os marcadores de cada entregador

// Função que será chamada para inicializar a seção do mapa
async function initializeMapSection() {
    if (mapSectionInitialized) return;
    mapSectionInitialized = true;
    console.log("Módulo Mapa.js: Inicializando...");

    // Garante que o container do mapa está visível antes de inicializar
    setTimeout(() => {
        setupMap();
        listenForDriverLocations();
    }, 100); 
}

// Função para configurar o mapa Leaflet
function setupMap() {
    // Verifica se o mapa já foi inicializado para não criar outro
    if (map) {
        map.invalidateSize(); // Ajusta o tamanho do mapa caso a janela tenha mudado
        return;
    }

    const mapContainer = document.getElementById('realtime-map-container');
    if (!mapContainer) return;

    // Coordenadas para centralizar o mapa no Brasil
    const initialCoords = [-14.235, -51.925]; 
    const initialZoom = 4;

    map = L.map(mapContainer).setView(initialCoords, initialZoom);

    // Adiciona a camada de mapa do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Ícone customizado para o entregador
    const driverIcon = L.icon({
        iconUrl: '../img/icons/motinha.png', 
        iconSize: [40, 40], // Tamanho do ícone
        iconAnchor: [20, 40], // Ponto do ícone que corresponde à localização
        popupAnchor: [0, -40] // Ponto onde o popup deve abrir em relação ao ícone
    });
    window.driverIcon = driverIcon; // Torna o ícone acessível globalmente se necessário
}

// Função para ouvir as atualizações de localização do Firestore
function listenForDriverLocations() {
    const { collection, onSnapshot, query, where } = window.firebaseFirestore;

    // Opcional: ouvir apenas os atualizados nos últimos 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); 
    const q = query(collection(window.db, "driver_locations"), where("lastUpdate", ">", fiveMinutesAgo));

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const driverId = change.doc.id;
            const driverData = change.doc.data();

            if (change.type === "removed" || !driverData.lat || !driverData.lng) {
                // Remove o marcador se o entregador ficar offline
                if (driverMarkers[driverId]) {
                    map.removeLayer(driverMarkers[driverId]);
                    delete driverMarkers[driverId];
                }
            } else {
                // Adiciona ou atualiza o marcador
                const newPosition = [driverData.lat, driverData.lng];
                if (driverMarkers[driverId]) {
                    // Se o marcador já existe, apenas move
                    driverMarkers[driverId].setLatLng(newPosition);
                } else {
                    // Se é um novo entregador, cria um novo marcador
                    driverMarkers[driverId] = L.marker(newPosition, { icon: window.driverIcon }).addTo(map);
                }
                // Atualiza o popup com o nome e a hora da atualização
                const updateTime = driverData.lastUpdate?.toDate().toLocaleTimeString('pt-BR') || 'agora';
                driverMarkers[driverId].bindPopup(`<b>${driverData.name}</b><br>Última atualização: ${updateTime}`);
            }
        });
    });
}

// Disponibiliza a função de inicialização globalmente
window.initializeMapSection = initializeMapSection;