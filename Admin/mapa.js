// Arquivo: mapa.js
// Lógica para o mapa de rastreamento em tempo real

let mapSectionInitialized = false;
let map; // Variável para guardar a instância do mapa
let driverMarkers = {}; // Objeto para guardar os marcadores de cada entregador

// Função que será chamada para inicializar a seção do mapa
async function initializeMapSection() {
    // Garante que a inicialização ocorra apenas uma vez
    if (mapSectionInitialized) {
        // Se a seção já foi inicializada, apenas garante que o mapa se ajuste ao container
        if(map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
        return;
    }
    mapSectionInitialized = true;
    console.log("Módulo Mapa.js: Inicializando...");

    // Garante que o container do mapa está visível antes de inicializar o Leaflet
    setTimeout(() => {
        setupMap();
        listenForDriverLocations();
    }, 100);
}

// Função para configurar o mapa Leaflet
function setupMap() {
    // Verifica se o mapa já foi inicializado para não criar outro
    if (map) {
        map.invalidateSize();
        return;
    }

    const mapContainer = document.getElementById('realtime-map-container');
    if (!mapContainer) {
        console.error("Container do mapa #realtime-map-container não encontrado!");
        return;
    }

    // Coordenadas exatas da sua pizzaria
    const pizzariaCoords = [-23.115958446804026, -45.70218834501301];
    const initialZoom = 16; // Zoom um pouco mais próximo

    map = L.map(mapContainer).setView(pizzariaCoords, initialZoom);

    // Adiciona a camada de mapa do OpenStreetMap (gratuito)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Ícone para o entregador
    window.driverIcon = L.icon({
        iconUrl: 'img/icons/motinha.png',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });

    // Ícone para a pizzaria
    const storeIcon = L.icon({
        iconUrl: 'img/logos/logo1.png',
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42]
    });

    // Adiciona o marcador fixo da pizzaria no mapa
    L.marker(pizzariaCoords, { icon: storeIcon })
        .addTo(map)
        .bindPopup("<b>D'Italia Pizzaria</b><br>Nossa base!")
        .openPopup(); // Força o balão a aparecer inicialmente
}

// Função para ouvir as atualizações de localização do Firestore
function listenForDriverLocations() {
    const { collection, onSnapshot, query, where, Timestamp } = window.firebaseFirestore;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const q = query(collection(window.db, "driver_locations"), where("lastUpdate", ">", Timestamp.fromDate(fiveMinutesAgo)));

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const driverId = change.doc.id;
            const driverData = change.doc.data();

            if (change.type === "removed" || !driverData.lat || !driverData.lng) {
                if (driverMarkers[driverId]) {
                    map.removeLayer(driverMarkers[driverId]);
                    delete driverMarkers[driverId];
                }
            } else {
                const newPosition = [driverData.lat, driverData.lng];

                if (driverMarkers[driverId]) {
                    driverMarkers[driverId].setLatLng(newPosition);
                } else {
                    driverMarkers[driverId] = L.marker(newPosition, { icon: window.driverIcon }).addTo(map);
                }
                const updateTime = driverData.lastUpdate?.toDate().toLocaleTimeString('pt-BR') || 'agora';
                driverMarkers[driverId].bindPopup(`<b>${driverData.name}</b><br>Atualizado às: ${updateTime}`);
            }
        });
    });
}

// Disponibiliza a função de inicialização globalmente
window.initializeMapSection = initializeMapSection;