/* eslint-disable */
import React, { useState } from "react";
// import Button from "react-bootstrap/Button";
import Button from "@mui/material/Button";

import InputAdornment from "@mui/material/InputAdornment";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import Input from "@mui/material/Input";

import CheckBoxList from "../CheckBoxList";
import "bootstrap/dist/css/bootstrap.min.css";

// import logo from './logo.svg';
import logo from "../../tfl_roundel_no_text.svg";
import "./App.css";
import {
  objectToList,
  getDistanceFromLatLonInKm,
  getUniqueListBy,
  kvArrayToObject,
} from "../../utils";

const postcodes = require("node-postcodes.io");

const TFL_API_URL_ROOT = "https://api.tfl.gov.uk";
// https://blog.tfl.gov.uk/2015/10/08/unified-api-part-2-lot-location-of-things/

const NAPTAN_STOPTYPES_LABELS = {
  NaptanMetroStation: "Underground/Overground",
  NaptanRailStation: "National Rail",
  NaptanBusCoachStation: "Bus Stations",
  NaptanPublicBusCoachTram: "Bus/Tram Stops",
  NaptanFerryPort: "River Transport",
};
const NAPTAN_STOPTYPES_DEFAULT = {
  NaptanMetroStation: true,
  NaptanRailStation: true,
  NaptanBusCoachStation: true,
  NaptanPublicBusCoachTram: true,
  NaptanFerryPort: true,
};

// unused modes: ["cable-car","cycle","cycle-hire","interchange-keep-sitting","interchange-secure","replacement-bus","river-tour","taxi", "walking"]
const NAPTAN_MODES = {
  NaptanMetroStation: ["dlr", "overground", "tube"],
  NaptanRailStation: ["national-rail", "tflrail"],
  NaptanBusCoachStation: ["bus", "coach"],
  NaptanPublicBusCoachTram: ["bus", "coach", "tram"],
  NaptanFerryPort: ["river-bus"],
};

const getLatLonFromPostCode = async (postcode) => {
  const {
    result: { latitude, longitude },
  } = await postcodes.lookup(postcode);
  return { lat: latitude, lon: longitude };
};

const getTFLApiKey = () => {
  return process.env.REACT_APP_TFL_KEY;
};

const makeTFLGetRequest = async (route, otherParams) => {
  const appKey = getTFLApiKey();
  let params = appKey
    ? { app_key: appKey, ...otherParams }
    : { ...otherParams };
  params = new URLSearchParams(params).toString();
  const response = await fetch(`${TFL_API_URL_ROOT}${route}?${params}`);
  return await response.json();
};

const getNaptanTypes = async () => {
  return await makeGetRequest("/StopPoint/Meta/StopTypes");
};

const getStoppointDataCategories = async () =>
  makeTFLGetRequest("/StopPoint/Meta/categories");

const getTransportModes = async () => makeTFLGetRequest("/Line/Meta/Modes");

const getStopPointsByRadius = async (stopTypes, latLong, radius) => {
  const { lat, lon } = latLong;
  const params = {
    stopTypes: stopTypes.join(),
    lat,
    lon,
    radius,
    returnLines: true,
  };
  return makeTFLGetRequest("/StopPoint", params);
};

const filterStopPointsByLineData = (stopPoints) =>
  stopPoints.filter((stopPoint) => stopPoint.lines.length > 0);

const filterStopPointsByTopLevel = async (stopPoints, key = "id") => {
  let res = await Promise.all(
    stopPoints.map(async (stopPoint) =>
      makeTFLGetRequest(`/StopPoint/${stopPoint[key]}`)
    )
  );
  return getUniqueListBy(res, key);
};

const App = () => {
  // const defaultPostcode = "SE1 6TG" // example location in API docs
  const defaultPostcode = "SE1 9SG"; // london bridge bus station
  const defaultRadius = 300;

  const [info, setInfo] = useState("Waiting for search...");
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [radius, setRadius] = useState(defaultRadius);
  const [chosenStopTypes, setChosenStoptypes] = useState(
    NAPTAN_STOPTYPES_DEFAULT
  );

  const handleRadiusChange = (e) => {
    // https://stackoverflow.com/a/43177957
    const onlyNums = e.target.value.replace(/[^0-9]/g, "");
    setRadius(onlyNums);
  };

  const handleButtonClick = async () => {
    // convert key:bool pairs to list of selected keys
    
    const stopTypes = objectToList(chosenStopTypes);
    
    // convert postcode to latitude, longitude
    setInfo(`Getting latitude/longitude of postcode ${postcode}...`);
    const latLong = await getLatLonFromPostCode(postcode);

    // get list of stopPoints within radius
    setInfo(
      `Searching for stops within ${radius} metres of ${postcode} (${JSON.stringify(
        latLong
      )})...`
    );
    let { stopPoints, centrePoint } = await getStopPointsByRadius(
      stopTypes,
      latLong,
      radius
    );
    console.log(stopPoints);

    // check for no result
    if (stopPoints === undefined || stopPoints.length === 0) {
      setInfo(`No stops found within ${radius} metres of postcode ${postcode}`);
      return;
    }

    // get e.g. ["tube", "national-rail"] from ["NaptanMetroStation", "NaptanRailStation"], dynamically
    //let chosenModes = new Set();
    // stopPoints.forEach(({ modes }) => {modes.forEach(chosenModes.add, chosenModes)});
    //NAPTAN_MODES.forEach(({ modes }) => {modes.forEach(chosenModes.add, chosenModes)});

    // get chosen modes (e.g. ["tube", "national-rail"]) from chosen stopTypes using predetermined dictionary
    
    let chosenModes = new Set(
      Object.entries(NAPTAN_MODES)
        .filter(([k, v]) => stopTypes.includes(k))
        .map(([k, v]) => v)
        .flat()
    );
    
    console.log(chosenModes);
    
    // remove stopPoints with no line data
    stopPoints = filterStopPointsByLineData(stopPoints);
    console.log(stopPoints);

    // remove duplicate stopPoints
    // stopPoints = await filterStopPointsByTopLevel(stopPoints, "stationNaptan");

    // id, naptanId refers to a single bus stop; stationNaptan can refer to a cluster of stops (e.g. one on each side of the road)

    // using CanReachOnLine route on each of a cluster of naptanIds...
    // gives same stops as using using CanReachOnLine once on corresponding stationNaptan...
    // albeit with different commonNames/id
    stopPoints = getUniqueListBy(stopPoints, "stationNaptan");

    console.log(stopPoints);

    // const tmpModes = (await getTransportModes()).map(({ modeName }) => modeName)
    // console.log(JSON.stringify(tmpModes));
    //const stopPointIDs = stopPoints.map(({ id }) => id);
    //getTopLevelStopPointsFromIDs(stopPoints);

    //console.log(stopPointIDs);
    const summary = stopPoints.map(
      ({ commonName, id, stopType, lat, lon }) => ({
        commonName,
        distance: Math.round(
          getDistanceFromLatLonInKm(latLong, { lat, lon }) * 1000
        ),
      })
    );
    summary.sort((a, b) => (a.distance > b.distance ? 1 : -1));

    //console.log(summary);
    const summaryText = summary.map(
      ({ commonName, distance }) => `${commonName} (${distance}m)`
    );
    // console.log(commonNames)
    setInfo(
      `Stops within ${radius} metres of postcode ${postcode} (${centrePoint}): ${summaryText.join(
        ", "
      )}`
    );

    // let   s = (await makeTFLGetRequest(`/StopPoint/490000139S/CanReachOnLine/47`)).map(({ id }) => id);
    // let   r = (await makeTFLGetRequest(`/StopPoint/490000139R/CanReachOnLine/47`)).map(({ id }) => id);
    // let sr1 = (await makeTFLGetRequest(`/StopPoint/490G00139R/CanReachOnLine/47`)).map(({ id }) => id).sort();
    // let sr2 = s.concat(r).sort();
    // //console.log(s)
    // //console.log(r)
    // sr1 = JSON.stringify(sr1)
    // sr2 = JSON.stringify(sr2)
    // console.log(sr1)
    // console.log(sr2);
    // console.log(JSON.stringify(sr1)===JSON.stringify(sr2))

    let count = 0;

    let reachableStops = [];
    stopPoints.forEach(({ commonName, stationNaptan, lineModeGroups }) => {
      //console.log(commonName, stationNaptan, lineModeGroups.map(({ modeName }) => modeName));
      
      lineModeGroups
        .filter(({ modeName }) => chosenModes.has(modeName))
        .forEach(({ modeName, lineIdentifier }) => {
          //console.log(commonName, id, modeName, lineIdentifier)
          lineIdentifier.forEach((line) => {
            //console.log(commonName, id, modeName, line)
            console.log(
              `${commonName}, ${modeName}, ${line}: GET https://api.tfl.gov.uk/StopPoint/${stationNaptan}/CanReachOnLine/${line}`
            );
            let res = makeTFLGetRequest(`/StopPoint/${stationNaptan}/CanReachOnLine/${line}`);
            reachableStops.push(res);
            // console.log(res)
            count += 1;
          });
        });
      // modes.push("AAA");
      // modes
      //   .filter((mode) => chosenModes.has(mode))
      //   .forEach((mode) => {
      //     console.log(id, mode)
      //     console.log(`https://api.tfl.gov.uk/StopPoint/${id}/CanReachOnLine/northern`)
      //   });
    });
    console.log(count);
    reachableStops = await Promise.all(reachableStops); // duplicates not yet removed
    console.log(responses);
  };

  return (
    // <div className="App">
    //   <header className="App-header">
    //     <img src={logo} className="App-logo" alt="logo" />
    //     <p>transit-tool</p>
    //     {/* {postcode} */}
    //     <input value={postcode} onInput={(e) => setPostcode(e.target.value)} />
    //     <input value={radius} onInput={(e) => setRadius(e.target.value)} />
    //     <Input value={radius} onInput={(e) => setRadius(e.target.value)} />
    //     <Button type="button" onClick={handleButtonClick} variant="contained">
    //       Get Data
    //     </Button>
    //     <p>{info}</p>
    //     {/* <a
    //       className="App-link"
    //       href="https://reactjs.org"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       Learn React
    //     </a> */}
    //   </header>
    // </div>
    <Container maxWidth="sm" className="App">
      <Paper>
        <img src={logo} className="App-logo" alt="logo" />
        <Typography variant="h4" component="h1" gutterBottom>
          transit-tool
        </Typography>
        <CheckBoxList
          listState={chosenStopTypes}
          setListState={setChosenStoptypes}
          listLabels={NAPTAN_STOPTYPES_LABELS}
        />
        <Box
          component="form"
          sx={{
            "& .MuiTextField-root": { m: 1, width: "25ch" },
          }}
          noValidate
          autoComplete="off"
        >
          <div>
            <TextField
              variant="outlined"
              label="Postcode"
              value={postcode}
              onInput={(e) => setPostcode(e.target.value)}
            />
          </div>
          <div>
            <TextField
              variant="outlined"
              label="Radius"
              value={radius}
              onInput={handleRadiusChange}
              InputProps={{
                endAdornment: <InputAdornment position="end">m</InputAdornment>,
              }}
            />
          </div>
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={handleButtonClick}
            >
              Get Data
            </Button>
          </div>
        </Box>
        <p>{info}</p>
        <p>
          Disclaimer: This app calculates which stops are reachable FROM the
          postcode you input, not the other way round.
        </p>
        <p>There may be one-way routes this method does not account for.</p>
      </Paper>
    </Container>
  );
};

export default App;

// import Toast from "react-bootstrap/Toast";
// import Container from "react-bootstrap/Container";
// import "./App.css";

// // eslint-disable-next-line react/prop-types
// const ExampleToast = ({ children }) => {
//   const [show, toggleShow] = useState(true);

//   return (
//     <>
//       {!show && (
//         <Button variant="filled" onClick={() => toggleShow(true)}>
//           Show Toast
//         </Button>
//       )}
//       <Toast show={show} onClose={() => toggleShow(false)}>
//         <Toast.Header>
//           <strong className="mr-auto">React-Bootstrap</strong>
//         </Toast.Header>
//         <Toast.Body>{children}</Toast.Body>
//       </Toast>
//     </>
//   );
// };

// const App = () => (
//   <Container className="p-3">
//     <div className="jumbotron">
//       <h1 className="header">Welcome To React-Bootstrap</h1>
//       <ExampleToast>
//         We now have Toasts
//         <span role="img" aria-label="tada">
//           🎉
//         </span>
//       </ExampleToast>
//     </div>
//   </Container>
// );

// export default App;
