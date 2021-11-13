//import logo from './logo.svg';
import logo from './tfl_roundel_no_text.svg';

import './App.css';
import { useState } from "react";
const postcodes = require('node-postcodes.io')
const TFL_API_URL_ROOT = "https://api.tfl.gov.uk"
// https://blog.tfl.gov.uk/2015/10/08/unified-api-part-2-lot-location-of-things/
const NAPTAN_STOPTYPES_DEFAULT = [
  "NaptanMetroStation",
  "NaptanRailStation",
  //"NaptanBusCoachStation",
  //"NaptanPublicBusCoachTram",
  //"NaptanFerryPort",
]

const postcodeToLatLong = async (postcode) => {
  const response = await postcodes.lookup(postcode)
  const { result } = response
  const { latitude, longitude } = result
  return { lat:latitude, lon:longitude }
}

const makeGetRequest = async(route, otherParams) => {
  const app_id = process.env.REACT_APP_TFL_APP_ID
  const app_key = process.env.REACT_APP_TFL_PRIMARY_KEY
  //const appParams = app_id & app_key ? `?app_id=${process.env.REACT_APP_APP_ID}&app_key=${process.env.REACT_APP_PRIMARY_KEY}&` : "?"
  let app_params = app_id && app_key ? {app_id, app_key} : {}
  const params = new URLSearchParams({...app_params, ...otherParams}).toString();
  //console.log(params)
  const response = await fetch(`${TFL_API_URL_ROOT}${route}?${params}`);
  return await response.json()
}

// const getNaptanTypes = async () => {
//   return await makeGetRequest("/StopPoint/Meta/StopTypes")
// }

const getStopPointsByRadius = async (stopTypes, latLong, radius) => {
  const { lat, lon } = latLong
  let params = {stopTypes: stopTypes.join(), lat, lon, radius}
  return await makeGetRequest("/StopPoint", params)
}

function App() {
  const [info, setInfo] = useState("Waiting for search...")
  const [postcode, setPostcode] = useState("SE1 6TG")
  const [radius, setRadius] = useState(200)

  const handleButtonClick = async () => {
    const stopTypes = NAPTAN_STOPTYPES_DEFAULT
    setInfo(`Getting latitude/longitude of postcode ${postcode}...`)
    const latLong = await postcodeToLatLong(postcode)
    setInfo(`Searching for stops within ${radius} metres of ${postcode} (${JSON.stringify(latLong)})...`)
    //setData(JSON.stringify(latLong))
    //console.log(process.env.REACT_APP_APP_ID)
    //console.log(process.env.REACT_APP_PRIMARY_KEY)
    //console.log(await getNaptanTypes())

    const result = await getStopPointsByRadius(stopTypes, latLong, radius)
    console.log(result)
    const { stopPoints } = result
    //console.log(stopPoints)
    if (stopPoints.length === 0){
      setInfo(`No stops found within ${radius} metres of postcode ${postcode}`)
      return
    }
    const summary = stopPoints.map(({commonName, distance}) => ({commonName, distance: Math.round(distance)}))
    const summaryText = summary.map(({commonName, distance}) => (`${commonName} (${distance}m)`))
    //console.log(commonNames)
    setInfo(`Stops within ${radius} metres of postcode ${postcode} (${latLong.lat}, ${latLong.lon}): ${summaryText.join(", ")}`)
  }
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          transit-tool
        </p>
        {/* {postcode} */}
        <input value={postcode} onInput={e => setPostcode(e.target.value)}/>
        <input value={radius} onInput={e => setRadius(e.target.value)}/>
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
