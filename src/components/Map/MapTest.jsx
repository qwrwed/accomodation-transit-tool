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

import "./Map.css";

import "leaflet-polylineoffset";
import Graph from "graphology";
import Polyline from "./ArrowheadsPolyline";
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
import { MapLines, MapTileLayer } from "./Map";

const Map = () => {
  const lineModeInfo = [
    {
      lineId: "piccadilly",
      lineName: "Piccadilly",
      modeId: "tube",
      modeName: "London Underground",
    },
    {
      lineId: "district",
      lineName: "District",
      modeId: "tube",
      modeName: "London Underground",
    },
  ];
  const mapLineSegments = [
    {
      lineCoords: [
        [1, 1],
        [1, 0],
      ],
      lineModeInfo,
    },
    {
      lineCoords: [
        [1, 0],
        [0, 0],
      ],
      lineModeInfo,
    },
    {
      lineCoords: [
        [0, 0],
        [0, 1],
      ],
      lineModeInfo,
    },
    {
      lineCoords: [
        [0, 1],
        [-1, 1],
      ],
      lineModeInfo,
    },
    {
      lineCoords: [
        [-1, 1],
        [-1, -1],
      ],
      lineModeInfo,
    },
    {
      lineCoords: [
        [-1, -1],
        [0, -1],
      ],
      lineModeInfo,
    },
  ];

  return (
    <MapContainer center={[0, 0]} zoom={9} scrollWheelZoom>
      <MapTileLayer />
      {/* <MapNearbyStopPointMarkers nearbyStopPoints={nearbyStopPoints} /> */}
      <MapLines mapLineSegments={mapLineSegments} />
    </MapContainer>
  );
};

export default Map;
