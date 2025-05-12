import './style.css';
import {Map, View} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from "ol/source/Vector";
import proj4 from "proj4";
import {register} from 'ol/proj/proj4'; // Import register function
import Projection from 'ol/proj/Projection';
import VectorLayer from "ol/layer/Vector";
import {ZoomSlider, ZoomToExtent} from "ol/control";
import {Fill, Stroke, Style} from "ol/style";
import {floorsGeoJson} from "./data/floors";
import {obstaclesGeoJson} from "./data/obstacles";
import {desksGeoJson} from "./data/desks";
import {roomsGeoJson} from "./data/rooms";

let proj4String = `+proj=tmerc +lat_0=-115 +lon_0=102 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs`;

proj4.defs("EPSG:9999", proj4String);

// Register the Proj4 projection with OpenLayers
register(proj4);

// Create a new OpenLayers Projection using the registered EPSG code
const customProjection = new Projection({
    code: 'EPSG:9999',
    units: 'm',
    extent: [-488, -518, 594, 285]
});


const vectorStyle = [
    new Style({
        stroke: new Stroke({
            color: 'black',
            width: 3,
        }),
        fill: new Fill({
            color: 'rgba(0, 0, 255, 0.1)',
        }),
    }),
];

function reverseYCoordinates(coordinates) {
    return coordinates.map(coordPair => [coordPair[0], -coordPair[1]]);
}

function transformGeoJSON(geoJsonData) {
    const features = new GeoJSON().readFeatures(geoJsonData);
    features.forEach(feature => {
        if (feature.getGeometry().getType() === 'Polygon') {
            const coords = feature.getGeometry().getCoordinates();
            feature.getGeometry().setCoordinates([reverseYCoordinates(coords[0])]);
        }
    });
    return features;
}

const floorsLayer = new VectorLayer({
    source: new VectorSource({
        features: transformGeoJSON(floorsGeoJson),
    }),
    style: vectorStyle
});

const obstaclesLayer = new VectorLayer({
    source: new VectorSource({
        features: transformGeoJSON(obstaclesGeoJson),
    }),
    style: vectorStyle
})

const roomsLayer = new VectorLayer({
    source: new VectorSource({
        features: transformGeoJSON(roomsGeoJson),
    }),
    style: vectorStyle
})

const desksLayer = new VectorLayer({
    source: new VectorSource({
        features: transformGeoJSON(desksGeoJson),
    }),
    style: vectorStyle
})

const map = new Map({
    target: 'map',
    controls: [
        new ZoomSlider({}),
        new ZoomToExtent({})
    ],
    layers: [
        floorsLayer,
        obstaclesLayer,
        roomsLayer,
        desksLayer,
    ],
    view: new View({
        projection: customProjection,
        center: [102, 115],
        zoom: 2,
        minZoom: 1,
        maxZoom: 5
    }),
});

const info = document.getElementById('info');

let currentFeature;
const displayFeatureInfo = function (pixel, target) {
    const feature = target.closest('.ol-control')
        ? undefined
        : map.forEachFeatureAtPixel(pixel, function (feature, layer) {
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
