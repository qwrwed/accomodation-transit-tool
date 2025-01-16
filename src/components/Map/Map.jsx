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

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
  // Polyline,
  CircleMarker,
} from "react-leaflet";
import Graph from "graphology";
import Polyline from "./ArrowheadsPolyline";

import "./Map.css";

import "leaflet-polylineoffset";
// import * as ExtraMarkers from "leaflet-extra-markers"; // or else TS complains about the L extension
import "@fortawesome/fontawesome-free/css/all.css"; // e.g. using FA icons
import "leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css"; // Do the L extension.

import { getLineModeColor, getModeDashes } from "../../constants";
import {
  lineModeDictionary,
  // getStopPointsInfo,
  getPostCodeFromLatLon,
} from "../../api/api";

import {
  OnthemarketLink,
  OpenrentLink,
  postcode_to_outcode,
  RightmoveLink,
  ZooplaLink,
} from "../../api/properties";
import { getPropertyByKeyArray } from "../../utils";
import { isFacing } from "../../utils2";

// import the LEM css
require("leaflet-extra-markers");

const TileLayerDefault = ({ attribution }) => (
  <TileLayer
    attribution={
      // eslint-disable-next-line prettier/prettier
    `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | ${attribution}`
    }
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
);

const TileLayerCustom = ({ styleId = "jawg_streets", attribution }) => (
  <TileLayer
    attribution={
      // eslint-disable-next-line prettier/prettier
      `<a href="https://www.jawg.io" target="_blank">&copy; Jawg</a> - <a href="https://www.openstreetmap.org" target="_blank">&copy; OpenStreetMap</a>&nbsp;contributors${attribution}`
    }
    url={`https://tile.jawg.io/${styleId}/{z}/{x}/{y}{r}.png?access-token=${process.env.REACT_APP_JAWG_KEY}`}
  />
);

export const MapTileLayer = () => {
  const [useCustomMap, setUseCustomMap] = useState(undefined);
  if (!process.env.REACT_APP_JAWG_KEY) {
    return <TileLayerDefault />;
  }
  const styleId = process.env.REACT_APP_JAWG_STYLE_ID || "jawg-streets";
  const attribution = "";
  useEffect(() => {
    (async () => {
      const response = await fetch(
        `https://tile.jawg.io/${styleId}/13/4093/2723@2x.png?access-token=${process.env.REACT_APP_JAWG_KEY}`,
      );
      setUseCustomMap(!!response.ok);
    })();
  }, []);
  return (
    useCustomMap !== undefined &&
    (useCustomMap ? (
      <TileLayerCustom styleId={styleId} attribution={attribution} />
    ) : (
      <TileLayerDefault attribution={attribution} />
    ))
  );
};

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

const SetView = ({ latLon }) => {
  const map = useMap();
  map.setView(latLon, map.getZoom(), { animate: true });
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
      <Marker position={originInfo.latLon} icon={originMarker}>
        <Popup>
          {originInfo.postcode} <br /> {JSON.stringify(originInfo.latLon)}
        </Popup>
      </Marker>
      <SetView latLon={originInfo.latLon} />
      <Circle center={originInfo.latLon} radius={originInfo.radius} />
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

const repointLineCoords = (origin, lineCoords, point_away = true) =>
  isFacing(origin, ...lineCoords) === point_away
    ? [...lineCoords].reverse()
    : [...lineCoords];

export const MapLines = ({ mapLineSegments, originInfo }) =>
  (mapLineSegments &&
    mapLineSegments.map(({ lineModeInfo, lineCoords }, i) => {
      const lineWeight = 10;
      const segmentWidth = lineModeInfo.length * lineWeight;
      const lineModeInfoSorted = lineModeInfo.toSorted((a, b) =>
        a.lineId.localeCompare(b.lineId),
      );
      // const lineModeInfoSorted = [
      //   {
      //     "lineId": "district",
      //     "lineName": "District",
      //     "modeId": "tube",
      //     "modeName": "London Underground"
      //   },
      //   {
      //     "lineId": "hammersmith-city",
      //     "lineName": "Hammersmith & City",
      //     "modeId": "tube",
      //     "modeName": "London Underground"
      //   }
      // ]
      // if (lineModeInfo.length > 1){
      //   console.warn(`Segment ${i}: Before sorting`, lineModeInfo.map(({lineId}) => lineId));
      //   console.warn(`Segment ${i}: After sorting`, lineModeInfoSorted.map(({lineId}) => lineId));
      // }
      // const offsets = getGlobalOffsets(lineModeInfoSorted);
      const fragment_key = `pl-seg_${i}`;
      // const slope = calculateSlope(lineCoords);
      // const offsetDirection = slope >= 0 ? 1 : -1;
      // const lineCoordsSorted = calculateSlope(lineCoords) > 0 ?  lineCoords.toReversed() : lineCoords
      // const modifiedCoords = ensureCorrectDirection(lineCoords);
      const modifiedCoords = repointLineCoords(originInfo.latLon, lineCoords);
      // // if (lineModeInfo.length > 1){
      // //   console.warn(`Fragment ${fragment_key}, lines ${lineModeInfoSorted.map(({lineId}) => lineId)}, lineCoords ${lineCoords}`);
      // // }
      // const direction = determineDirection(lineCoords);
      // const offsetDirection2 = direction === "left-to-right" ? 1 : -1;
      return (
        <React.Fragment key={fragment_key}>
          {lineModeInfoSorted.map(({ lineId, modeId }, j) => {
            // const fixedOffset = (j * lineWeight - segmentWidth / 2 + lineWeight / 2) * offsetDirection;
            // const fixedOffset = getConsistentOffset(j, lineModeInfoSorted.length, lineWeight, segmentWidth);
            // const fixedOffset = offsets[lineId];
            return (
              <Polyline
                color={getLineModeColor(lineId, modeId)}
                dashArray={getModeDashes(modeId)}
                opacity={0.75}
                positions={modifiedCoords}
                // positions={lineCoords}
                // positions={lineCoordsSorted}
                // offset={(j * lineWeight - segmentWidth / 2 + lineWeight / 2) * offsetDirection}
                offset={j * lineWeight - segmentWidth / 2 + lineWeight / 2}
                // offset={fixedOffset}
                key={`pl-seg_${i}-line_${j}_${lineId}`}
                weight={lineWeight}
                // lineCap={"butt"}
                // arrowheads
              />
            );
          })}

          {/* <Marker
            position={lineCoords[lineCoords.length - 1]} // End of the polyline
            icon={L.divIcon({
              className: "arrow-icon",
              html: "<svg height="10" width="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill="red" /></svg>", // Arrowhead SVG
            })}
          /> */}
        </React.Fragment>
      );
    })) ||
  null;

// Function to ensure lineCoords are always pointing in the correct direction
const ensureCorrectDirection = (coords) => {
  if (coords.length < 2) return coords; // No direction to calculate

  const [start, end] = [coords[0], coords[coords.length - 1]];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  // Calculate the angle of the line in degrees
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Check if the line needs to be reversed
  // Criteria: Reverse lines that are pointing generally "southwards"
  if (angle > 90 && angle <= 270) {
    return [...coords].reverse(); // Reverse the direction
  }
  return coords; // Keep the original direction
};

function modifyLineDirection(lineCoords) {
  if (lineCoords.length < 2) return [...lineCoords]; // If there's only one point, return a copy

  const [start, end] = lineCoords;
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];

  // Make a copy of lineCoords
  const modifiedCoords = [...lineCoords];

  // If the line is pointing Southeast (down-right diagonal), reverse it
  if (deltaX > 0 && deltaY > 0) {
    modifiedCoords.reverse(); // Reverse the copy
  }

  // If the line is pointing Southwest (down-left diagonal), reverse it
  if (deltaX < 0 && deltaY > 0) {
    modifiedCoords.reverse(); // Reverse the copy
  }

  // No changes for Northeast or Northwest directions
  // These lines are left unchanged, so just return the copied version without modification
  return modifiedCoords;
}

function calculateSlope(lineCoords) {
  if (lineCoords.length < 2) return 0; // No slope if there's only one point

  const [start, end] = lineCoords;
  const deltaX = end[0] - start[0];
  const deltaY = end[end.length - 1] - start[start.length - 1];

  return deltaY / deltaX; // Return the slope
}

function determineDirection(lineCoords) {
  if (lineCoords.length < 2) return "left-to-right"; // No direction if there's only one point

  const [start, end] = lineCoords;
  const deltaX = end[0] - start[0];

  // If deltaX is positive, the polyline is going from left to right
  // If deltaX is negative, it's going from right to left
  return deltaX > 0 ? "left-to-right" : "right-to-left";
}

function getConsistentOffset(lineIndex, totalLines, lineWeight, segmentWidth) {
  // Ensure no gaps by spacing lines evenly
  const totalSpacing = lineWeight * totalLines; // Total space for all lines
  const startOffset = -totalSpacing / 2 + lineWeight / 2; // Starting point for the first line

  // Calculate the offset for this specific line
  return startOffset + lineIndex * lineWeight;
}

// Calculate global offsets for each lineId across all segments
function getGlobalOffsets(sortedLines) {
  const lineOffsets = {};
  const lineWeight = 10;

  // Calculate the offset for each lineId
  sortedLines.forEach((line, index) => {
    if (!lineOffsets[line.lineId]) {
      // Assign an offset based on line index
      lineOffsets[line.lineId] = index * lineWeight;
    }
  });

  return lineOffsets;
}

const MapStation = ({ station }) => {
  const [postcode, setPostcode] = useState(null);
  useEffect(() => {
    (async () => {
      const _postcode = await station.postcode;
      if (!_postcode) {
        console.error(
          `Could not get postcode for station ${station.label} (${station.coords}).`,
        );
      } else {
        setPostcode(_postcode);
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
      pane="markerPane"
    >
      <Popup>
        <div style={{ whiteSpace: "pre" }}>
          {station.label}
          <br />
          {(postcode && `${postcode}, `) || "[Unknown postcode], "}
          Zone {station.zone}
          <br />
          {formatLineModes(station.lineModes)}
          <RightmoveLink
            station_name={station.label}
            outcode={postcode_to_outcode(postcode)}
          />
          <ZooplaLink postcode={postcode} />
          <OpenrentLink postcode={postcode} />
          <OnthemarketLink postcode={postcode} />
        </div>
      </Popup>
    </CircleMarker>
  );
};

const MapStations = ({ stations }) =>
  (stations &&
    stations.map((station) => (
      <MapStation
        station={station}
        key={getPropertyByKeyArray(station, ["stationId", "topMostParentId"])}
      />
    ))) ||
  null;

const Map = ({ originInfo, nearbyStopPoints, graphSerialized }) => {
  const [mapLineSegments, setMapLineSegments] = useState();
  const [stations, setStations] = useState();

  useEffect(() => {
    (async () => {
      if (!graphSerialized) return;
      const lmd = await lineModeDictionary;

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
            ].toSorted(),
            lineModeInfo: [],
          };
        }
        _mapLineSegments[fromTo].lineModeInfo.push(lmd[lineId]);
      });
      setMapLineSegments(Object.values(_mapLineSegments));

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
      <MapTileLayer />
      {/* <MapNearbyStopPointMarkers nearbyStopPoints={nearbyStopPoints} /> */}
      <MapLines mapLineSegments={mapLineSegments} originInfo={originInfo} />
      <MapStations stations={stations} />
      <MapOriginMarkers originInfo={originInfo} />
    </MapContainer>
  );
};
export default Map;
