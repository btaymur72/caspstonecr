// Global variables
let map;
let markers = [];
const API_URL = 'http://localhost:3000/api';

// Code to run when page loads
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    setupEventListeners();
    fetchPatents(); // Fetch data from API
});

// Initialize the map
function initMap() {
    // Dünya görünümüyle başla
    map = L.map('patent-map', {
        center: [20.0, 0.0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: true,
        worldCopyJump: true // Dünya haritasının sınırlarından geçerken daha iyi performans
    });
    
    // Daha detaylı ve canlı harita katmanı
    const mainLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Uydu görüntüsü için alternatif katman
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    });
    
    // Harita katmanı seçeneklerini ekle
    const baseMaps = {
        "Standart Harita": mainLayer,
        "Uydu Görüntüsü": satelliteLayer
    };
    
    // Katman kontrol paneli ekle
    L.control.layers(baseMaps, null, {position: 'topright'}).addTo(map);
    
    // Ölçek çubuğu ekle
    L.control.scale({
        imperial: false,
        position: 'bottomleft'
    }).addTo(map);
}

// Set up event listeners
function setupEventListeners() {
    // Click event for search button
    document.getElementById('search-btn').addEventListener('click', function() {
        searchPatents();
    });
    
    // Enter tuşu ile arama yapabilme
    document.querySelectorAll('.search-form input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchPatents();
            }
        });
    });
    
    // Click event for patent detail close button
    document.querySelector('.close-btn').addEventListener('click', function() {
        document.getElementById('patent-details').style.display = 'none';
    });
}

// Fetch all patents from API
async function fetchPatents() {
    try {
        const response = await fetch(`${API_URL}/patents`);
        if (!response.ok) {
            throw new Error('API did not respond');
        }
        
        const patents = await response.json();
        displayResults(patents);
        patents.forEach(patent => addMarkerToMap(patent));
        
        // Tüm patentleri haritaya sığdır
        if (patents.length > 0) {
            fitMapToBounds();
        }
    } catch (error) {
        console.error('Error fetching patent data:', error);
        // Use sample data in case of error
        displayResults(sampleData);
        sampleData.forEach(patent => addMarkerToMap(patent));
        fitMapToBounds();
    }
}

// Patent search function
async function searchPatents() {
    // Get form values
    const patentNo = document.getElementById('patent-no').value;
    const keywords = document.getElementById('keywords').value;
    const applicant = document.getElementById('applicant').value;
    const region = document.getElementById('region').value;
    const status = document.getElementById('status').value;
    
    // Search parameters
    const params = new URLSearchParams();
    if (patentNo) params.append('patentNo', patentNo);
    if (keywords) params.append('keywords', keywords);
    if (applicant) params.append('applicant', applicant);
    if (region) params.append('region', region);
    if (status) params.append('status', status);
    
    try {
        const response = await fetch(`${API_URL}/patents/search?${params.toString()}`);
        if (!response.ok) {
            throw new Error('API did not respond');
        }
        
        const patents = await response.json();
        displayResults(patents);
        
        // Update the map
        clearMarkers();
        patents.forEach(patent => addMarkerToMap(patent));
        
        // Bulunan sonuçları haritaya sığdır
        if (patents.length > 0) {
            fitMapToBounds();
        }
        
    } catch (error) {
        console.error('Error while searching:', error);
        // Filter sample data if API is not available
        const filters = { patentNo, keywords, applicant, region, status };
        filterSampleData(filters);
    }
}

// Haritayı mevcut işaretlere göre ayarla
function fitMapToBounds() {
    if (markers.length > 0) {
        const markerGroup = L.featureGroup(markers);
        map.fitBounds(markerGroup.getBounds(), {
            padding: [50, 50],
            maxZoom: 12,
            animate: true,
            duration: 0.5
        });
    }
}

// Add marker to map
function addMarkerToMap(patent) {
    // Get coordinates
    let lat = patent.latitude;
    let lng = patent.longitude;
    
    // Use default values if coordinates are missing
    if (!lat || !lng) {
        // Sample coordinates by region (temporary solution)
        switch(patent.geographicRegion) {
            case 'TURKEY':
                lat = 39.0 + (Math.random() - 0.5) * 3;
                lng = 35.0 + (Math.random() - 0.5) * 5;
                break;
            case 'USA':
                lat = 37.0 + (Math.random() - 0.5) * 5;
                lng = -95.0 + (Math.random() - 0.5) * 10;
                break;
            case 'EU':
                lat = 50.0 + (Math.random() - 0.5) * 5;
                lng = 10.0 + (Math.random() - 0.5) * 10;
                break;
            case 'ASIA':
                lat = 34.0 + (Math.random() - 0.5) * 10;
                lng = 100.0 + (Math.random() - 0.5) * 20;
                break;
            default:
                lat = 39.0 + (Math.random() - 0.5) * 20;
                lng = 35.0 + (Math.random() - 0.5) * 40;
        }
    }
    
    // Patent statüsüne göre renk belirle
    let markerColor = '#4a69bd'; // Varsayılan mavi
    if (patent.patentStatus) {
        if (patent.patentStatus.toLowerCase() === 'active') {
            markerColor = '#2ecc71'; // Yeşil - aktif patent
        } else if (patent.patentStatus.toLowerCase() === 'inactive') {
            markerColor = '#e74c3c'; // Kırmızı - inaktif patent
        }
    }
    
    // Patent bölgesine göre işaretçi boyutu ayarla (öne çıkarmak için)
    let size = 16;
    let borderWidth = 2;
    
    if (patent.geographicRegion === 'TURKEY') {
        size = 20; // Daha büyük işaretçi
        borderWidth = 3;
    }
    
    // Özel marker icon oluştur
    const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color:${markerColor}; width:${size-2*borderWidth}px; height:${size-2*borderWidth}px; border-radius:50%; border:${borderWidth}px solid white; box-shadow:0 0 8px ${markerColor};"></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -size/2]
    });
    
    // Create marker with custom icon
    const marker = L.marker([lat, lng], {icon: markerIcon}).addTo(map);
    
    // Prepare popup content
    const popupContent = `
        <div class="patent-popup">
            <h3>${patent.patentNo}</h3>
            <p>${patent.applicant || 'Unknown Applicant'}</p>
            <p class="region-tag">${patent.geographicRegion || 'Unknown Region'}</p>
            <a href="#" class="details-link" onclick="showPatentDetails('${patent.patentNo}'); return false;">View Details</a>
        </div>
    `;
    
    // Add popup
    marker.bindPopup(popupContent);
    
    // Mouse over event to highlight marker
    marker.on('mouseover', function() {
        this.openPopup();
    });
    
    // Add marker to global list
    markers.push(marker);
}

// Clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Show patent details
async function showPatentDetails(patentNo) {
    try {
        // Fetch patent details from API
        const response = await fetch(`${API_URL}/patents/no/${patentNo}`);
        if (!response.ok) {
            throw new Error('Patent not found');
        }
        
        const patent = await response.json();
        displayPatentDetails(patent);
    } catch (error) {
        console.error('Error getting patent details:', error);
        // Get from sample data if API is not available
        const patent = sampleData.find(p => p.patentNo === patentNo);
        if (patent) {
            displayPatentDetails(patent);
        } else {
            alert('Patent not found!');
        }
    }
}

// Display patent details
function displayPatentDetails(patent) {
    // Prepare details content
    const detailsContent = `
        <div class="detail-row">
            <span class="detail-label">Patent No:</span> ${patent.patentNo}
        </div>
        <div class="detail-row">
            <span class="detail-label">Keywords:</span> ${patent.keywords || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">Abstract:</span> ${patent.abstract || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">Application Date:</span> ${patent.applicationDate || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">Publication Date:</span> ${patent.publicationDate || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">Applicant:</span> ${patent.applicant || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">IPC:</span> ${patent.ipc || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">CPC:</span> ${patent.cpc || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">Claims:</span> ${patent.claims || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">Geographic Region:</span> ${patent.geographicRegion || '-'}
        </div>
        <div class="detail-row">
            <span class="detail-label">Patent Status:</span> ${patent.patentStatus || '-'}
        </div>
    `;
    
    // Add content to details panel and show
    document.querySelector('.details-content').innerHTML = detailsContent;
    document.getElementById('patent-details').style.display = 'block';
    
    // Haritada patente yakınlaş
    if (patent.latitude && patent.longitude) {
        map.setView([patent.latitude, patent.longitude], 8, {
            animate: true,
            duration: 1
        });
        
        // İlgili işaretçiyi bul ve vurgula
        markers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (markerLatLng.lat === patent.latitude && markerLatLng.lng === patent.longitude) {
                marker.openPopup();
            }
        });
    }
}

// Display search results
function displayResults(patents) {
    const resultsContainer = document.getElementById('results-container');
    
    if (!patents || patents.length === 0) {
        resultsContainer.innerHTML = '<p>No results found.</p>';
        return;
    }
    
    let html = '';
    
    patents.forEach(patent => {
        html += `
            <div class="patent-item" onclick="showPatentDetails('${patent.patentNo}')">
                <strong>${patent.patentNo}</strong> - ${patent.applicant || ''}<br>
                <small>${patent.keywords || ''}</small>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
}

// Filter sample data (when API is not available)
function filterSampleData(filters) {
    let filtered = [...sampleData];
    
    // Patent number filter
    if (filters.patentNo) {
        filtered = filtered.filter(p => p.patentNo.toLowerCase().includes(filters.patentNo.toLowerCase()));
    }
    
    // Keywords filter
    if (filters.keywords) {
        filtered = filtered.filter(p => p.keywords.toLowerCase().includes(filters.keywords.toLowerCase()));
    }
    
    // Applicant filter
    if (filters.applicant) {
        filtered = filtered.filter(p => p.applicant.toLowerCase().includes(filters.applicant.toLowerCase()));
    }
    
    // Region filter
    if (filters.region) {
        filtered = filtered.filter(p => p.geographicRegion === filters.region);
    }
    
    // Status filter
    if (filters.status) {
        filtered = filtered.filter(p => p.patentStatus === filters.status);
    }
    
    // Show results
    displayResults(filtered);
    
    // Update map
    clearMarkers();
    filtered.forEach(patent => addMarkerToMap(patent));
    
    // Sonuçları haritaya sığdır
    if (filtered.length > 0) {
        fitMapToBounds();
    }
}

// Add showPatentDetails function to global page context (for popup calls)
window.showPatentDetails = showPatentDetails;

// Sample data (used when API is not available)
const sampleData = [
    {
        patentNo: "TR2020/12345",
        keywords: "energy, storage, battery",
        abstract: "This invention relates to a new battery technology for high-capacity energy storage systems.",
        applicationDate: "15.05.2020",
        publicationDate: "22.11.2020",
        applicant: "ASELSAN A.Ş.",
        ipc: "H01M 10/0525",
        cpc: "H01M 10/0525",
        claims: "1. Lithium ion battery system...\n2. Energy storage unit...",
        geographicRegion: "TURKEY",
        patentStatus: "active",
        latitude: 39.908058,
        longitude: 32.773644
    },
    {
        patentNo: "TR2019/54321",
        keywords: "artificial intelligence, machine learning, optimization",
        abstract: "This invention is a system that optimizes energy consumption using machine learning algorithms.",
        applicationDate: "10.03.2019",
        publicationDate: "18.09.2019",
        applicant: "Turkish Aeronautical Association University",
        ipc: "G06N 20/00",
        cpc: "G06N 20/00",
        claims: "1. An energy management system using neural networks...\n2. Machine learning assisted...",
        geographicRegion: "TURKEY",
        patentStatus: "active",
        latitude: 39.925018,
        longitude: 32.836956
    },
    {
        patentNo: "US2021/987654",
        keywords: "semiconductor, manufacturing, nanolithography",
        abstract: "A novel method for producing semiconductor devices using advanced nanolithography techniques.",
        applicationDate: "05.01.2021",
        publicationDate: "12.07.2021",
        applicant: "Intel Corporation",
        ipc: "H01L 21/027",
        cpc: "H01L 21/0274",
        claims: "1. A method for semiconductor device manufacturing...\n2. The lithography system comprising...",
        geographicRegion: "USA",
        patentStatus: "active",
        latitude: 37.368828,
        longitude: -122.036350
    },
    {
        patentNo: "EP2020/111222",
        keywords: "renewable energy, solar cell, photovoltaic",
        abstract: "An improved photovoltaic cell design with higher efficiency for solar energy conversion.",
        applicationDate: "22.04.2020",
        publicationDate: "30.10.2020",
        applicant: "Siemens AG",
        ipc: "H01L 31/04",
        cpc: "H01L 31/042",
        claims: "1. A photovoltaic cell comprising...\n2. A solar panel system using the cell of claim 1...",
        geographicRegion: "EU",
        patentStatus: "active",
        latitude: 48.137154,
        longitude: 11.576124
    },
    {
        patentNo: "CN2022/112233",
        keywords: "electric vehicle, battery management, thermal control",
        abstract: "A battery management system with advanced thermal control for electric vehicles.",
        applicationDate: "17.01.2022",
        publicationDate: "25.07.2022",
        applicant: "BYD Company Limited",
        ipc: "H01M 10/60",
        cpc: "H01M 10/613",
        claims: "1. A battery thermal management system...\n2. The cooling system of claim 1...",
        geographicRegion: "ASIA",
        patentStatus: "active",
        latitude: 22.543096,
        longitude: 114.057865
    }
]; 