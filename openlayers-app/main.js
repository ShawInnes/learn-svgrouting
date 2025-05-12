import './style.css';
import {Map, View} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from "ol/source/Vector";
import proj4 from "proj4";
import {register} from 'ol/proj/proj4'; // Import register function
import Projection from 'ol/proj/Projection';
import VectorLayer from "ol/layer/Vector";
import {FullScreen, ZoomSlider, ZoomToExtent} from "ol/control";
import {floorsGeoJson} from "./data/floors";
import {obstaclesGeoJson} from "./data/obstacles";
import {desksGeoJson} from "./data/desks";
import {roomsGeoJson} from "./data/rooms";
import {Text, Fill, Stroke, Style} from "ol/style";

let proj4String = `+proj=tmerc +lat_0=-115 +lon_0=102 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs`;

proj4.defs("EPSG:9999", proj4String);

// Register the Proj4 projection with OpenLayers
register(proj4);

// Create a new OpenLayers Projection using the registered EPSG code
const customProjection = new Projection({
    code: 'EPSG:9999', units: 'm', extent: [-488, -518, 594, 285]
});


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
    }), style: {
        'stroke-color': 'black', 'stroke-width': 4, 'fill-color': 'rgba(28,164,248,0.2)',
    },
});

const obstaclesLayer = new VectorLayer({
    source: new VectorSource({
        features: transformGeoJSON(obstaclesGeoJson),
    }), style: {
        'fill-color': 'rgba(168,168,168,0.57)',
    },
})

const roomsLayer = new VectorLayer({
    source: new VectorSource({
        features: transformGeoJSON(roomsGeoJson),
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
        features: transformGeoJSON(desksGeoJson),
    }), style: {
        'fill-color': 'rgba(236,11,88,0.43)',
    },
})

const map = new Map({
    target: 'map',
    controls: [new FullScreen({}), new ZoomSlider({}), new ZoomToExtent({}),],
    layers: [floorsLayer, obstaclesLayer, roomsLayer, desksLayer,],
    view: new View({
        projection: customProjection, center: [102, 115], zoom: 2, minZoom: 1, maxZoom: 5
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
