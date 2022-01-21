/* eslint-disable */

// https://github.com/coryasilva/Leaflet.ExtraMarkers/issues/53#issuecomment-643551999
import L from 'leaflet'
import * as ExtraMarkers from 'leaflet-extra-markers'; // or else TS complains about the L extension
import '@fortawesome/fontawesome-free/css/all.css';  //e.g. using FA icons
import 'leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css'; //import the LEM css
require( 'leaflet-extra-markers'); //Do the L extension.
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "./Map.css";
import { MODES_INFO } from '../App/App';
// import { } from "react-leaflet"

const originMarker = L.ExtraMarkers.icon({
  icon: 'fa-building',
  markerColor: 'blue',
  shape: 'square',
  prefix: 'fa'
});
const stopPointIcon = (icon) => L.ExtraMarkers.icon({
  icon,
  markerColor: 'red',
  shape: 'square',
  prefix: 'fa'
});

const getIconName = (modes) => {
  const modesList = new Set(modes)
  if (modesList.has("tube") || modesList.has("dlr") || modesList.has("overground") || modesList.has("tram")){
    return "fa-subway"
  } else if (modesList.has("national-rail" || modesList.has("tfl-rail"))){
    return "fa-train"
  } else if (modesList.has("river-bus")){
    return "fa-ship"
  } else if (modesList.has("bus")){
    return "fa-bus"
  }
}

const SetView = ({ latLong }) => {
  const map = useMap()
  map.setView(latLong, map.getZoom(), {
    animate: true
  })
  return null
}

const Map = ({ postcodeInfo, nearbyStopPoints }) => {
  // useEffect(() => {
  //   console.log("postcodeInfo UPDATED");
  //   console.log(postcodeInfo);
  // }, [postcodeInfo]);


  return (
    <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {postcodeInfo && <>
        <Marker position={postcodeInfo.latLong} icon={originMarker}>
          <Popup>
            {postcodeInfo.postcode} <br /> {JSON.stringify(postcodeInfo.latLong)}
          </Popup>
        </Marker>
        <SetView latLong={postcodeInfo.latLong} />
      </>}
      {nearbyStopPoints.map((stopPoint) => <Marker
        position={[stopPoint.lat, stopPoint.lon]}
        key={stopPoint.naptanId}
        icon={stopPointIcon(getIconName(stopPoint.modes))}
        //icon={stopPointMarker(stop)}
      // icon={<DivIcon></DivIcon>}
      >
        <Popup>
          {stopPoint.commonName}
        </Popup>
      </Marker>)}
    </MapContainer>
  );
};

export default Map;
