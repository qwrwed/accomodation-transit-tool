/* eslint-disable */

// https://github.com/coryasilva/Leaflet.ExtraMarkers/issues/53#issuecomment-643551999
import L from "leaflet";
import * as ExtraMarkers from "leaflet-extra-markers"; // or else TS complains about the L extension
import "@fortawesome/fontawesome-free/css/all.css"; // e.g. using FA icons
import "leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css"; // Do the L extension.
import React from "react";
import {MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline} from "react-leaflet";
import "./Map.css";
// import the LEM css
require("leaflet-extra-markers");
// import { } from "react-leaflet"

const originMarker = L.ExtraMarkers.icon({
  icon: "fa-building",
  markerColor: "blue",
  shape: "square",
  prefix: "fa",
});
const stopPointIcon = (icon) => L.ExtraMarkers.icon({
  icon,
  markerColor: "red",
  shape: "square",
  prefix: "fa",
});

const getIconName = (modes) => {
  const modesList = new Set(modes);
  if (modesList.has("tube") || modesList.has("dlr") || modesList.has("overground") || modesList.has("tram")) {
    return "fa-subway";
  } if (modesList.has("national-rail" || modesList.has("tfl-rail"))) {
    return "fa-train";
  } if (modesList.has("river-bus")) {
    return "fa-ship";
  } if (modesList.has("bus")) {
    return "fa-bus";
  }
  return "fa-bus"; // default
};

const SetView = ({ latLong }) => {
  const map = useMap();
  map.setView(latLong, map.getZoom(), {animate: true,});
  return null;
};

// useEffect(() => {
//   console.log("postcodeInfo UPDATED");
// }, [postcodeInfo]);

const Map = ({ originInfo, nearbyStopPoints }) => {
  const data = [
    {
      from_lat: "51.518",
      from_long: "-0.082",
      id: "132512",
      to_lat: "12.92732",
      to_long: "77.63575",
    },
    {
      from_lat: "51.718",
      from_long: "-0.382",
      id: "132513",
      to_lat: "12.92768",
      to_long: "77.62664",
    }
  ]
  return (
  <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {originInfo && (
      <>
        <Marker position={originInfo.latLong} icon={originMarker}>
          <Popup>
            {originInfo.postcode}
            {" "}
            <br />
            {" "}
            {JSON.stringify(originInfo.latLong)}
          </Popup>
        </Marker>
        <SetView latLong={originInfo.latLong} />
        <Circle center={originInfo.latLong} radius={originInfo.radius} />
      </>
    )}
    {nearbyStopPoints.map((stopPoint) => (
      <Marker
        position={[stopPoint.lat, stopPoint.lon]}
        key={stopPoint.naptanId}
        icon={stopPointIcon(getIconName(stopPoint.modes))}
      >
        <Popup>
          {stopPoint.commonName}
          <br />
          Lines:
          {" "}
          {stopPoint.lines.map(({ name }) => name).join(", ")}
        </Popup>
      </Marker>
    ))}
    {/* {data.map(({id, from_lat, from_long, to_lat, to_long}) => {
      return <Polyline key={id} positions={[
        [from_lat, from_long], [to_lat, to_long],
      ]} color={'red'} />
    })} */}
  </MapContainer>
)};
export default Map;
