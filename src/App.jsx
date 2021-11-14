/* eslint-disable react/button-has-type */
/* eslint-disable react/jsx-filename-extension */

import React, { useState } from "react";

// import logo from './logo.svg';
import logo from "./tfl_roundel_no_text.svg";

import "./App.css";

const postcodes = require("node-postcodes.io")

const TFL_API_URL_ROOT = "https://api.tfl.gov.uk"
// https://blog.tfl.gov.uk/2015/10/08/unified-api-part-2-lot-location-of-things/
const NAPTAN_STOPTYPES_DEFAULT = [
  // "NaptanMetroStation", // underground, overground
  // "NaptanRailStation", // national rail
  "NaptanBusCoachStation", // major bus stations
  "NaptanPublicBusCoachTram", // minor bus stations
  // "NaptanFerryPort",
]

const postcodeToLatLong = async (postcode) => {
  const response = await postcodes.lookup(postcode)
  const { result } = response
  const { latitude, longitude } = result
  return { lat: latitude, lon: longitude }
}

const makeGetRequest = async (route, otherParams) => {
  const appId = process.env.REACT_APP_TFL_APP_ID
  const appKey = process.env.REACT_APP_TFL_PRIMARY_KEYs
  const appParams = appId && appKey ? { appId, appKey } : {}
  const params = new URLSearchParams({ ...appParams, ...otherParams }).toString();
  console.log(params)
  const response = await fetch(`${TFL_API_URL_ROOT}${route}?${params}`);
  return response.json()
}

// const getNaptanTypes = async () => {
//   return await makeGetRequest("/StopPoint/Meta/StopTypes")
// }

const getStoppointDataCategories = async () => makeGetRequest("/StopPoint/Meta/categories")

const getStopPointsByRadius = async (stopTypes, latLong, radius) => {
  const { lat, lon } = latLong
  const params = {
    stopTypes: stopTypes.join(), lat, lon, radius, returnLines: true,
  }
  return makeGetRequest("/StopPoint", params)
}

const filterStopPointsByLineData = (stopPoints) => (
  stopPoints.filter((stopPoint) => stopPoint.lines.length > 0)
)

const App = () => {
  // const defaultPostcode = "SE1 6TG" // example location in API docs
  const defaultPostcode = "SE1 9SG" // london bridge bus station
  const defaultRadius = 300

  const [info, setInfo] = useState("Waiting for search...")
  const [postcode, setPostcode] = useState(defaultPostcode)
  const [radius, setRadius] = useState(defaultRadius)

  const handleButtonClick = async () => {
    const stopTypes = NAPTAN_STOPTYPES_DEFAULT
    setInfo(`Getting latitude/longitude of postcode ${postcode}...`)
    const latLong = await postcodeToLatLong(postcode)
    setInfo(`Searching for stops within ${radius} metres of ${postcode} (${JSON.stringify(latLong)})...`)
    // setData(JSON.stringify(latLong))
    // console.log(process.env.REACT_APP_APP_ID)
    // console.log(process.env.REACT_APP_PRIMARY_KEY)
    // console.log(await getNaptanTypes())
    console.log(await getStoppointDataCategories())
    const result = await getStopPointsByRadius(stopTypes, latLong, radius)
    const resultLatLong = result.centrePoint
    // console.log(result)
    let { stopPoints } = result
    // console.log(stopPoints)
    if (stopPoints.length === 0) {
      setInfo(`No stops found within ${radius} metres of postcode ${postcode}`)
      return
    }

    console.log(stopPoints)
    stopPoints = filterStopPointsByLineData(stopPoints)
    console.log(stopPoints)

    const summary = stopPoints.map(({ commonName, distance }) => (
      { commonName, distance: Math.round(distance) }
    ))
    const summaryText = summary.map(({ commonName, distance }) => (`${commonName} (${distance}m)`))
    // console.log(commonNames)
    setInfo(`Stops within ${radius} metres of postcode ${postcode} (${resultLatLong}): ${summaryText.join(", ")}`)
  }
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          transit-tool
        </p>
        {/* {postcode} */}
        <input value={postcode} onInput={(e) => setPostcode(e.target.value)} />
        <input value={radius} onInput={(e) => setRadius(e.target.value)} />
        <button onClick={handleButtonClick}>Get Data</button>
        <p>
          {info}
        </p>
        {/* <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a> */}
      </header>
    </div>
  );
}

export default App;
