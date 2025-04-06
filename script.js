const simplifyBtn = document.getElementById('simplifyBtn');
const clearBtn = document.getElementById('clearBtn');
const toleranceInput = document.getElementById('tolerance');
const toleranceValue = document.getElementById('toleranceValue');
const originalPointsElement = document.getElementById('original-points');
const simplifiedPointsElement = document.getElementById('simplified-points');
const reductionElement = document.getElementById('reduction');

let map;
let drawnItems;
let drawControl;
let originalLine = null;
let simplifiedLine = null;
let currentTolerance = parseFloat(toleranceInput.value);

document.addEventListener('DOMContentLoaded', initMap);

toleranceInput.addEventListener('input', function() {
    currentTolerance = parseFloat(this.value);
    toleranceValue.textContent = currentTolerance.toFixed(4);
    
    if (originalLine) {
        simplifyLine();
    }
});

simplifyBtn.addEventListener('click', function() {
    if (!originalLine) {
        alert('Please draw a line first using the drawing tools in the top-left of the map.');
        return;
    }
    
    simplifyLine();
});

clearBtn.addEventListener('click', function() {
    clearAllLines();
    resetStatistics();
});

function initMap() {
    map = L.map('map').setView([51.05, -114.07], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
        draw: {
            polyline: {
                shapeOptions: {
                    color: '#3388ff',
                    weight: 4
                }
            },
            polygon: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems,
            remove: false
        }
    });
    map.addControl(drawControl);

    addLegend();

    map.on('draw:created', function(e) {
        const type = e.layerType;
        const layer = e.layer;
        
        if (type === 'polyline') {
            if (originalLine) {
                drawnItems.removeLayer(originalLine);
            }
            if (simplifiedLine) {
                map.removeLayer(simplifiedLine);
                simplifiedLine = null;
            }
            
            originalLine = layer;
            drawnItems.addLayer(originalLine);
            
            const points = layer.getLatLngs();
            updateOriginalStatistics(points.length);
            
            simplifyLine();
        }
    });

    map.on('draw:edited', function(e) {
        const layers = e.layers;
        
        layers.eachLayer(function(layer) {
            if (layer === originalLine) {
                const points = layer.getLatLngs();
                updateOriginalStatistics(points.length);
                
                simplifyLine();
            }
        });
    });
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 13);
            },
            error => {
                console.log('Error getting location: ' + error.message);
            }
        );
    }
}

function simplifyLine() {
    if (!originalLine) return;
    
    if (simplifiedLine) {
        map.removeLayer(simplifiedLine);
    }
    
    const latLngs = originalLine.getLatLngs();
    const coordinates = latLngs.map(latLng => [latLng.lng, latLng.lat]);
    
    const lineString = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: coordinates
        },
        properties: {}
    };
    
    const simplified = turf.simplify(lineString, {
        tolerance: currentTolerance,
        highQuality: true
    });
    
    const simplifiedCoords = simplified.geometry.coordinates.map(coord => 
        L.latLng(coord[1], coord[0])
    );
    
    simplifiedLine = L.polyline(simplifiedCoords, {
        color: '#ff3300',
        weight: 4,
        dashArray: '5, 10'
    }).addTo(map);
    
    updateSimplifiedStatistics(latLngs.length, simplifiedCoords.length);
}

function clearAllLines() {
    drawnItems.clearLayers();
    
    if (simplifiedLine) {
        map.removeLayer(simplifiedLine);
        simplifiedLine = null;
    }
    
    originalLine = null;
}

function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
            <div><span class="legend-color original-line"></span> Original Line</div>
            <div><span class="legend-color simplified-line"></span> Simplified Line</div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

function updateOriginalStatistics(numPoints) {
    originalPointsElement.textContent = `Original points: ${numPoints}`;
}

function updateSimplifiedStatistics(originalPoints, simplifiedPoints) {
    simplifiedPointsElement.textContent = `Simplified points: ${simplifiedPoints}`;
    
    const reduction = ((originalPoints - simplifiedPoints) / originalPoints * 100).toFixed(1);
    reductionElement.textContent = `Reduction: ${reduction}%`;
}

function resetStatistics() {
    originalPointsElement.textContent = 'Original points: -';
    simplifiedPointsElement.textContent = 'Simplified points: -';
    reductionElement.textContent = 'Reduction: -';
}