/* eslint-disable */

// https://github.com/coryasilva/Leaflet.ExtraMarkers/issues/53#issuecomment-643551999
import L from "leaflet";
import * as ExtraMarkers from "leaflet-extra-markers"; // or else TS complains about the L extension
import "@fortawesome/fontawesome-free/css/all.css"; // e.g. using FA icons
import "leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css"; // Do the L extension.
import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline, LayerGroup, CircleMarker } from "react-leaflet";
// import "./Map/Map.css";
// import the LEM css
require("leaflet-extra-markers");
// import { } from "react-leaflet"
import "leaflet-polylineoffset";

import "./App/App.css";


const App = () => {

  const polyline = [[51.51, -0.12], [51.51, -0.1], [51.505, -0.09]];
  const lineWeight = 10;
  const linesOnSegment = ["red", "blue", "green", "yellow"];
  const segmentWidth = linesOnSegment.length * lineWeight ;
  
  return (
    <MapContainer center={polyline[0]} zoom={15} scrollWheelZoom style={{ width: "100wh", height: "100vh" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {linesOnSegment.map((color, i) => (<Polyline
        color={color}
        positions={polyline}
        offset={i*lineWeight - segmentWidth/2 + ((lineWeight) / 2)}
        key={`pl-${i}-${color}}`}
        weight={lineWeight}
        lineCap={"butt"}
      />))}
      <CircleMarker center={polyline[0]} radius={lineWeight*3} opacity={1} color="#000" fillColor="#ccc" fillOpacity={1} weight={4}/>
    </MapContainer>
  );
}

/*
total width = segmentWidth
distance between each line = lineWeight/2

*/
export default App;

const geoJson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "lines": [0, 1]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            2.357919216156006,
            48.87621773324153
          ],
          [
            2.357339859008789,
            48.874834693731664
          ],
          [
            2.362983226776123,
            48.86855408432749
          ],
          [
            2.362382411956787,
            48.86796126699168
          ],
          [
            2.3633265495300293,
            48.86735432768131
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "lines": [2, 3]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            2.351503372192383,
            48.86443950493823
          ],
          [
            2.361609935760498,
            48.866775611250205
          ],
          [
            2.3633265495300293,
            48.86735432768131
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "lines": [1, 2]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            2.369627058506012,
            48.86619159489603
          ],
          [
            2.3724031448364253,
            48.8626397112042
          ],
          [
            2.3728322982788086,
            48.8616233285001
          ],
          [
            2.372767925262451,
            48.86080456075567
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "lines": [0]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            2.3647427558898926,
            48.86653565369396
          ],
          [
            2.3647642135620117,
            48.86630981023694
          ],
          [
            2.3666739463806152,
            48.86314789481612
          ],
          [
            2.3673176765441895,
            48.86066339254944
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "lines": [0, 1, 2, 3]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            2.3633265495300293,
            48.86735432768131
          ],
          [
            2.3647427558898926,
            48.86653565369396
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "lines": [1, 2, 3]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            2.3647427558898926,
            48.86653565369396
          ],
          [
            2.3650002479553223,
            48.86660622956524
          ],
          [
            2.365509867668152,
            48.866987337550164
          ],
          [
            2.369627058506012,
            48.86619159489603
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "lines": [3]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            2.369627058506012,
            48.86619159489603
          ],
          [
            2.372349500656128,
            48.865702850895744
          ]
        ]
      }
    }
  ]
};

var lineWeight = 6;
var lineColors = ['red', '#08f', '#0c0', '#f80'];

// manage overlays in groups to ease superposition order
// var outlines = L.layerGroup();
// var lineBg = L.layerGroup();
var busLines = L.layerGroup();
// var busStops = L.layerGroup();

var ends = [];
function addStop(ll) {
  for (var i = 0, found = false; i < ends.length && !found; i++) {
    found = (ends[i].lat == ll.lat && ends[i].lng == ll.lng);
  }
  if (!found) {
    ends.push(ll);
  }
}

var lineSegment, linesOnSegment, segmentCoords, segmentWidth;
geoJson.features.forEach(function (lineSegment) {
  segmentCoords = L.GeoJSON.coordsToLatLngs(lineSegment.geometry.coordinates, 0);

  linesOnSegment = lineSegment.properties.lines;
  segmentWidth = linesOnSegment.length * (lineWeight + 1);

  // L.polyline(segmentCoords, {
  //   color: '#000',
  //   weight: segmentWidth + 5,
  //   opacity: 1
  // }).addTo(outlines);

  // L.polyline(segmentCoords, {
  //   color: '#fff',
  //   weight: segmentWidth + 3,
  //   opacity: 1
  // }).addTo(lineBg);

  linesOnSegment.map((lineOnSegment) => { })
  for (var j = 0; j < linesOnSegment.length; j++) {
    L.polyline(segmentCoords, {
      color: lineColors[linesOnSegment[j]],
      weight: lineWeight,
      opacity: 1,
      offset: j * (lineWeight + 1) - (segmentWidth / 2) + ((lineWeight + 1) / 2)
    }).addTo(busLines);
  }

  addStop(segmentCoords[0]);
  addStop(segmentCoords[segmentCoords.length - 1]);
});

// ends.forEach(function (endCoords) {
//   L.circleMarker(endCoords, {
//     color: '#000',
//     fillColor: '#ccc',
//     fillOpacity: 1,
//     radius: 10,
//     weight: 4,
//     opacity: 1
//   }).addTo(busStops);
// });

// outlines.addTo(map);
// lineBg.addTo(map);
// busLines.addTo(map);
// busStops.addTo(map);

