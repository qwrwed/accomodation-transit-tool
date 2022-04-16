/* eslint-disable react/no-array-index-key */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
// /* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable */

// https://github.com/coryasilva/Leaflet.ExtraMarkers/issues/53#issuecomment-643551999
import L from "leaflet";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
  Polyline,
  CircleMarker,
} from "react-leaflet";
import "./Map.css";

import "leaflet-polylineoffset";
import Graph from "graphology";
import * as ExtraMarkers from "leaflet-extra-markers"; // or else TS complains about the L extension
import "@fortawesome/fontawesome-free/css/all.css"; // e.g. using FA icons
import "leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css"; // Do the L extension.

import { LINE_COLORS } from "../../constants";
import {
  lineModeDictionary,
  getStopPointsInfo,
  getPostCodeFromLatLon,
} from "../../api";

import { RightmoveLink } from "../../properties";

// import the LEM css
require("leaflet-extra-markers");

const ATTRIBUTION =
  // eslint-disable-next-line prettier/prettier
  "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors";

const originMarker = L.ExtraMarkers.icon({
  icon: "fa-building",
  markerColor: "blue",
  shape: "square",
  prefix: "fa",
});
const stopPointIcon = (icon) =>
  L.ExtraMarkers.icon({
    icon,
    markerColor: "red",
    shape: "square",
    prefix: "fa",
  });

const getIconName = (modes) => {
  const modesList = new Set(modes);
  if (
    modesList.has("tube") ||
    modesList.has("dlr") ||
    modesList.has("overground") ||
    modesList.has("tram")
  ) {
    return "fa-subway";
  }
  if (modesList.has("national-rail" || modesList.has("tfl-rail"))) {
    return "fa-train";
  }
  if (modesList.has("river-bus")) {
    return "fa-ship";
  }
  if (modesList.has("bus")) {
    return "fa-bus";
  }
  return "fa-bus"; // default
};

const SetView = ({ latLong }) => {
  const map = useMap();
  map.setView(latLong, map.getZoom(), { animate: true });
  return null;
};

// useEffect(() => {
//   console.log("postcodeInfo UPDATED");
// }, [postcodeInfo]);
const formatLineModes = (lineModes) => {
  let s = "";
  for (const [mode, lines] of Object.entries(lineModes)) {
    s += `• ${mode} lines:\n`;
    for (const line of lines) {
      s += ` ○ ${line}\n`;
    }
  }
  return s;
};

const MapOriginMarkers = ({ originInfo }) =>
  (originInfo && (
    <>
      <Marker position={originInfo.latLong} icon={originMarker}>
        <Popup>
          {originInfo.postcode} <br /> {JSON.stringify(originInfo.latLong)}
        </Popup>
      </Marker>
      <SetView latLong={originInfo.latLong} />
      <Circle center={originInfo.latLong} radius={originInfo.radius} />
    </>
  )) ||
  null;

const MapNearbyStopPointMarkers = ({ nearbyStopPoints }) =>
  nearbyStopPoints.map((stopPoint) => (
    <Marker
      position={[stopPoint.lat, stopPoint.lon]}
      key={stopPoint.naptanId}
      icon={stopPointIcon(getIconName(stopPoint.modes))}
    >
      <Popup>
        {stopPoint.commonName}
        <br />
        Lines: {stopPoint.lines.map(({ name }) => name).join(", ")}
      </Popup>
    </Marker>
  ));

const MapLines = ({ mapLineSegments }) =>
  (mapLineSegments &&
    mapLineSegments.map((seg, i) => {
      const lineWeight = 10;
      const segmentWidth = seg.lineIds.length * lineWeight;
      return (
        <React.Fragment key={`pl-seg_${i}`}>
          {seg.lineIds.map((lineId, j) => (
            <Polyline
              color={LINE_COLORS[lineId]}
              positions={seg.lineCoords}
              offset={j * lineWeight - segmentWidth / 2 + lineWeight / 2}
              key={`pl-seg_${i}-line_${j}_${lineId}`}
              weight={lineWeight}
              // lineCap={"butt"}
            />
          ))}
        </React.Fragment>
      );
    })) ||
  null;

const MapStation = ({ station }) => {
  const [postcode, setPostcode] = useState("");
  useEffect(() => {
    (async () => {
      const _postcode = await station.postcode;
      if (!_postcode) {
        console.error(
          `Could not get postcode for station ${station.label} (${station.coords}).`,
        );
        setPostcode("[unknown postcode], ");
      } else {
        setPostcode(`${_postcode}, `);
      }
    })();
  }, []);
  return (
    <CircleMarker
      center={station.coords}
      radius={10}
      color="#000"
      fillColor="#ccc"
      fillOpacity={0.5}
      opacity={0.5}
      weight={4}
      eventHandlers={{
        click: async () => {
          // console.log(station);
        },
      }}
    >
      <Popup>
        <div style={{ whiteSpace: "pre" }}>
          {station.label}
          <br />
          {postcode}Zone {station.zone}
          <br />
          {formatLineModes(station.lineModes)}
          <br />
          <RightmoveLink postcode={postcode} />
        </div>
      </Popup>
    </CircleMarker>
  );
};

const MapStations = ({ stations }) =>
  (stations &&
    stations.map((station) => (
      <MapStation station={station} key={station.label} />
    ))) ||
  null;

const Map = ({ originInfo, nearbyStopPoints, graphSerialized }) => {
  const [mapLineSegments, setMapLineSegments] = useState();
  const [stations, setStations] = useState();

  useEffect(() => {
    (async () => {
      if (!graphSerialized) return;
      const _displayedGraph = new Graph({ multi: true });
      _displayedGraph.import(graphSerialized);
      const _mapLineSegments = {};
      _displayedGraph.forEachEdge((edge, { lineId }, fromNode, toNode) => {
        const fromTo = [fromNode, toNode].sort().toString();
        const { lat: fromLat, lon: fromLon } =
          _displayedGraph.getNodeAttributes(fromNode);
        const { lat: toLat, lon: toLon } =
          _displayedGraph.getNodeAttributes(toNode);
        if (!(fromTo in _mapLineSegments)) {
          _mapLineSegments[fromTo] = {
            lineCoords: [
              [fromLat, fromLon],
              [toLat, toLon],
            ],
            lineIds: [],
          };
        }
        _mapLineSegments[fromTo].lineIds.push(lineId);
      });
      setMapLineSegments(Object.values(_mapLineSegments));
      const lmd = await lineModeDictionary;
      const _stations = [];
      _displayedGraph.forEachNode((key, attributes) => {
        const { lat, lon, lines, ...rest } = attributes;
        const latLon = [lat, lon];
        const postcode = getPostCodeFromLatLon(latLon);
        const lineModes = {};
        let modeName;
        let lineName;
        for (const { id } of lines) {
          if (!(id in lmd)) {
            modeName = "[unknown mode]";
            lineName = id;
            const info = `TFL did not return mode info for line "${id}" at station ${attributes.name}`;
            console.error(info);
            // toast.error(info, { id: info });
          } else {
            ({ modeName, lineName } = lmd[id]);
          }
          if (!(modeName in lineModes)) {
            lineModes[modeName] = [];
          }
          lineModes[modeName].push(lineName);
        }
        _stations.push({ coords: latLon, postcode, lines, ...rest, lineModes });
      });
      setStations(_stations);
    })();
  }, [graphSerialized]);

  return (
    <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom>
      <TileLayer
        attribution={ATTRIBUTION}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* <MapNearbyStopPointMarkers nearbyStopPoints={nearbyStopPoints} /> */}
      <MapLines mapLineSegments={mapLineSegments} />
      <MapStations stations={stations} />
      <MapOriginMarkers originInfo={originInfo} />
    </MapContainer>
  );
};
export default Map;
