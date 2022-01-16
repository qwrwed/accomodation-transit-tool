/* eslint-disable */
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "./Map.css";
import { useMap } from "react-leaflet"

const  SetView = ({ latLong }) => {
  const map = useMap()
  map.setView(latLong, map.getZoom(), {
    animate: true
  })
  return null
}

const Map = ({ postcodeInfo }) => {
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
        <Marker position={postcodeInfo.latLong}>
          <Popup>
            {postcodeInfo.postcode} <br /> {JSON.stringify(postcodeInfo.latLong)}
          </Popup>
        </Marker>
        <SetView latLong={postcodeInfo.latLong} />
      </>}
    </MapContainer>
  );
};

export default Map;
