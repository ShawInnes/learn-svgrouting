import './style.css';
import {Map, View} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from "ol/source/Vector";
import proj4 from "proj4";
import {register} from 'ol/proj/proj4'; // Import register function
import Projection from 'ol/proj/Projection';
import VectorLayer from "ol/layer/Vector";
import {FullScreen, ZoomSlider, ZoomToExtent} from "ol/control";
import {Text, Fill, Stroke, Style} from "ol/style";

let proj4String = `+proj=tmerc +lat_0=-115 +lon_0=102 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs`;

proj4.defs("EPSG:9999", proj4String);

// Register the Proj4 projection with OpenLayers
register(proj4);

// Create a new OpenLayers Projection using the registered EPSG code
const customProjection = new Projection({
    code: 'EPSG:9999', units: 'm', extent: [-292.21, -731.34, 495.18, 2195.93]
});

const floorsGeoJSON = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [-288.85025, 715.28851],
                    [-288.28872, 508.3628],
                    [-184.59113, 508.3523],
                    [-184.40819, 505.58538],
                    [-66.455675, 506.00076],
                    [-66.307975, 320.12905],
                    [-184.60089, 320.03998],
                    [-184.69689, 316.213473],
                    [-288.37448, 316.341127],
                    [-288.38348, 111.294],
                    [493.44423, 111.3105],
                    [493.87327, 319.90696],
                    [455.48528, 319.782131],
                    [389.47221, 319.728461],
                    [389.62439, 320.948205],
                    [268.02046, 321.037395],
                    [267.67202, 410.08273],
                    [232.72363, 409.74473],
                    [233.26202, 518.13548],
                    [269.27267, 518.30905],
                    [269.11137, 505.38981],
                    [389.91919, 505.14305],
                    [390.0852, 509.79278],
                    [494.06652, 509.84658],
                    [493.97922, 715.32836],
                    [-288.85025, 715.28851]
                ]]
            },
            properties: {
                name: "5"
            }
        }
    ]
};

const floorsLayer = new VectorLayer({
    source: new VectorSource({
        url: 'http://0.0.0.0:8000/api/geojson/floors',
        format: new GeoJSON({
            dataProjection: 'EPSG:9999',
            featureProjection: 'EPSG:9999'
        }),
        // features: (new GeoJSON()).readFeatures(floorsGeoJSON, {
        //     dataProjection: 'EPSG:9999',
        //     featureProjection: 'EPSG:9999'
        // }),
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
    }), style: function (feature, resolution) {
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
    }), style: {
        'fill-color': 'rgba(236,11,88,0.43)',
    },
})

const map = new Map({
    target: 'map',
    controls: [new FullScreen({}), new ZoomSlider({}), new ZoomToExtent({}),],
    layers: [
        floorsLayer,
        // obstaclesLayer,
        // roomsLayer,
        // desksLayer
    ],
    view: new View({
        projection: customProjection, center: [0, 700], zoom: 2, minZoom: 1, maxZoom: 5
    }),
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
