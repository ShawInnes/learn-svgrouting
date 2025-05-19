import './style.css';
import {Map, View} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from "ol/source/Vector";
import proj4 from "proj4";
import {register} from 'ol/proj/proj4'; // Import register function
import Projection from 'ol/proj/Projection';
import VectorLayer from "ol/layer/Vector";
import {FullScreen, ZoomSlider, ZoomToExtent} from "ol/control";
import {Text, Fill, Stroke, Style, Circle} from "ol/style";
import {getCenter} from 'ol/extent';

let proj4String = `+proj=tmerc +lat_0=-115 +lon_0=102 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs`;

proj4.defs("EPSG:9999", proj4String);

// Register the Proj4 projection with OpenLayers
register(proj4);

// Create a new OpenLayers Projection using the registered EPSG code
const customProjection = new Projection({
    code: 'EPSG:9999', units: 'm', extent: [-292.21, -731.34, 495.18, 2195.93]
});

const mapView = new View({
    projection: customProjection, center: [0, 700], zoom: 2, minZoom: 1, maxZoom: 5
})

const floorsLayer = new VectorLayer({
    source: new VectorSource({
        url: 'http://0.0.0.0:8000/api/geojson/floors',
        format: new GeoJSON({
            dataProjection: 'EPSG:9999',
            featureProjection: 'EPSG:9999'
        }),
    }), style: {
        'stroke-color': 'black', 'stroke-width': 4, 'fill-color': 'rgba(28,164,248,0.2)',
    },
});

const obstaclesLayer = new VectorLayer({
    source: new VectorSource({
        url: 'http://0.0.0.0:8000/api/geojson/obstacles',
        format: new GeoJSON({
            dataProjection: 'EPSG:9999',
            featureProjection: 'EPSG:9999'
        }),
    }), style: {
        'fill-color': 'rgba(168,168,168,0.57)',
    },
})

const roomsLayer = new VectorLayer({
    source: new VectorSource({
        url: 'http://0.0.0.0:8000/api/geojson/rooms',
        format: new GeoJSON({
            dataProjection: 'EPSG:9999',
            featureProjection: 'EPSG:9999'
        }),
    }),
    style: function (feature, resolution) {
        return new Style({
            fill: new Fill({
                color: 'rgba(255, 165, 0, 0.49)', // Orange color with transparency
            }),
            stroke: new Stroke({
                color: '#ff9900',
                width: 2,
            }),
            text: new Text({
                font: 'Arial',
                declutterMode: 'obstacle',
                text: feature.get('name')
            }),
        });
    }
})

const desksLayer = new VectorLayer({
    source: new VectorSource({
        url: 'http://0.0.0.0:8000/api/geojson/desks',
        format: new GeoJSON({
            dataProjection: 'EPSG:9999',
            featureProjection: 'EPSG:9999'
        }),
    }),
    style: function (feature, resolution) {
        // Base radius that will be adjusted based on resolution
        const baseRadius = 4;
        // Calculate dynamic radius - as resolution increases (zooming out), radius decreases
        const dynamicRadius = baseRadius / resolution;
        // Clamp the radius between reasonable minimum and maximum values
        const radius = Math.min(Math.max(dynamicRadius, 2), 10);

        return new Style({
            image: new Circle({
                fill: new Fill({
                    color: 'rgba(236,11,88,0.43)',
                }),
                stroke: new Stroke({
                    color: '#ff9900',
                    width: 1,
                }),
                radius: radius,
            }),
        });
    }
})

const map = new Map({
    target: 'map',
    controls: [new FullScreen({}), new ZoomSlider({}), new ZoomToExtent({}),],
    layers: [
        floorsLayer,
        obstaclesLayer,
        roomsLayer,
        desksLayer
    ],
    view: mapView,
});


function zoomToFeature(featureName, view) {
    // Search in both rooms and desks layers
    const layers = [roomsLayer, desksLayer];

    for (const layer of layers) {
        const source = layer.getSource();
        const features = source.getFeatures();
        const feature = features.find(f => f.get('name') === featureName);

        if (feature) {
            const geometry = feature.getGeometry();
            const extent = geometry.getExtent();
            const center = getCenter(extent);

            const duration = 2000;
            const zoom = view.getZoom();
            let parts = 2;
            let called = false;

            function callback(complete) {
                --parts;
                if (called) {
                    return;
                }
                if (parts === 0 || !complete) {
                    called = true;
                    // done(complete);
                }
            }

            view.animate(
                {
                    center: center,
                    duration: duration,
                },
                callback,
            );
            view.animate(
                {
                    zoom: zoom - 2,
                    duration: duration / 3,
                },
                {
                    zoom: zoom,
                    duration: duration / 3,
                },
                callback,
            );
            return;
        }
    }
}


const select = document.getElementById('featureSelect');

const populateFeatures = () => {
    const features = [];
    [roomsLayer, desksLayer]
        .forEach(layer => {
            const source = layer.getSource();
            source.getFeatures().forEach(feature => {
                const name = feature.get('name');
                if (name) {
                    console.log(name);
                    features.push(name);
                }
            });
        });

    // Sort features alphabetically
    features.sort();

    // Clear existing options (except the first one)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add new options
    features.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
};

[roomsLayer, desksLayer].forEach(layer => {
    layer.getSource().on('change', () => {
        if (layer.getSource().getState() === 'ready') {
            populateFeatures();
        }
    });
});

// Add click handler for the zoom button
document.getElementById('zoomButton')
    .addEventListener('click', () => {
        const selectedFeature = select.value;
        if (selectedFeature) {
            zoomToFeature(selectedFeature, mapView);
        }
    });

const info = document.getElementById('info');

let currentFeature;
const displayFeatureInfo = function (pixel, target) {
    const feature = target.closest('.ol-control') ? undefined : map.forEachFeatureAtPixel(pixel, function (feature, layer) {
        if (layer === desksLayer || layer === roomsLayer) {
            return feature;
        }
    });

    if (feature) {
        info.style.left = pixel[0] + 10 + 'px';
        info.style.top = pixel[1] + 'px';
        if (feature !== currentFeature) {
            info.style.visibility = 'visible';
            info.innerText = feature.get('name');
        }
    } else {
        info.style.visibility = 'hidden';
    }
    currentFeature = feature;
};

map.on('pointermove', function (evt) {
    if (evt.dragging) {
        info.style.visibility = 'hidden';
        currentFeature = undefined;
        return;
    }
    displayFeatureInfo(evt.pixel, evt.originalEvent.target);
});

map.on('click', function (evt) {
    displayFeatureInfo(evt.pixel, evt.originalEvent.target);
});

map.getTargetElement().addEventListener('pointerleave', function () {
    currentFeature = undefined;
    info.style.visibility = 'hidden';
});
