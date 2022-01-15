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
  objectMap,
  getDescendants,
} from "../../utils";

const postcodes = require("node-postcodes.io");

const TFL_API_URL_ROOT = "https://api.tfl.gov.uk";
// https://blog.tfl.gov.uk/2015/10/08/unified-api-part-2-lot-location-of-things/

const NAPTAN_STOPTYPES_INFO = {
  NaptanMetroStation: {
    label: "Underground/Overground",
    modes: ["dlr", "overground", "tube"],
    defaultValue: true,
  },
  NaptanRailStation: {
    label: "National Rail",
    modes: ["national-rail", "tflrail"],
    defaultValue: false,
  },
  NaptanBusCoachStation: {
    label: "Bus Stations",
    modes: ["bus", "coach"],
    defaultValue: true,
  },
  NaptanPublicBusCoachTram: {
    label: "Bus/Tram Stops",
    modes: ["bus", "coach", "tram"],
    defaultValue: true,
  },
  NaptanFerryPort: {
    label: "River Transport",
    modes: ["river-bus"],
    defaultValue: true,
  },
};

// unused modes: ["cable-car","cycle","cycle-hire","interchange-keep-sitting","interchange-secure","replacement-bus","river-tour","taxi", "walking"]

const NAPTAN_STOPTYPES_LABELS = objectMap(NAPTAN_STOPTYPES_INFO, ({ label }) => label)
const NAPTAN_STOPTYPES_DEFAULT = objectMap(NAPTAN_STOPTYPES_INFO, ({ defaultValue }) => defaultValue)
const NAPTAN_MODES = objectMap(NAPTAN_STOPTYPES_INFO, ({ modes }) => modes)

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
  if (response.ok) {
    return await response.json();
  } else {
    const { exceptionType, httpStatusCode, httpStatus, message } = await response.json()
    console.error(`${exceptionType}: ${httpStatusCode} (${httpStatus})\n${message} (from ${TFL_API_URL_ROOT}${route})`)
  }
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
    //useStopPointHierarchy: true,
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

const getBranchData = async (stopLineData) => {
  let branchData = {}
  for (const modeName in stopLineData) {
    branchData[modeName] = branchData[modeName] || {}
    for (const line in stopLineData[modeName]) {
      const res = await makeTFLGetRequest(`/Line/${line}/Route/Sequence/all`)
      if (typeof (res) !== "undefined") {
        branchData[modeName][line] = {}
        // branchData[modeName][line].inbound = res.stopPointSequences.filter(({direction}) => direction == "inbound")
        // branchData[modeName][line].outbound = res.stopPointSequences.filter(({direction}) => direction == "outbound")
        //console.log(res.stopPointSequences)
        for (const direction of ["inbound", "outbound"]) {
          branchData[modeName][line][direction] = {}
          for (let branchWithId of res.stopPointSequences) {
            //console.log(line, branchWithId.direction, direction)
            if (!(branchWithId.direction === direction))
              continue
            const { branchId, ...branch } = branchWithId
            branchData[modeName][line][direction][branchId] = branch
          }
        }
      }
    }
  }
  return branchData
}

const filterBranchData = (branchData, stopLineData) => {
  // TODO: only show stations ahead of identified station on branch?
  let nearbyBranchData = {}
  for (const lineMode in branchData) {
    for (const line in branchData[lineMode]) {
      for (const direction of ["inbound", "outbound"]) {
        let branchesInDirection = branchData[lineMode][line][direction]
        let availableBranchIds = new Set()
        let checkedBranchIds = new Set()
        //console.log(branchesInDirection)
        for (const branchId in branchesInDirection) {
          const stationIdsOnBranch = new Set(branchData[lineMode][line][direction][branchId].stopPoint.map(({ topMostParentId }) => topMostParentId))
          for (const { naptanId } of stopLineData[lineMode][line]) {
            if (stationIdsOnBranch.has(naptanId)) {
              //console.log(`${naptanId} is in branch ${branchId} of ${lineMode} ${line} (${direction})`)
              availableBranchIds.add(branchId)
              break
            }
          }
          if (!(availableBranchIds.has(branchId)))
            continue
          //console.log(`Checking for branches accessible from ${branchId}`)
          //console.log(branchData[lineMode][line][direction])
          if (checkedBranchIds.has(branchId))
            continue
          checkedBranchIds.add(branchId)
          let branchesAheadIds = getDescendants(branchesInDirection, "nextBranchIds", new Set([branchId]))
          nearbyBranchData[lineMode] = nearbyBranchData[lineMode] || {}
          nearbyBranchData[lineMode][line] = nearbyBranchData[lineMode][line] || {}
          nearbyBranchData[lineMode][line][direction] = nearbyBranchData[lineMode][line][direction] || {}
          //console.log(branchesAheadIds)
          for (const id of branchesAheadIds) {
            nearbyBranchData[lineMode][line][direction][id] = branchesInDirection[id]
          }
        }
      }
    }
  }
  return nearbyBranchData
}
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
    //console.log(stopPoints);

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

    //console.log(chosenModes);

    //console.log(stopPoints)
    // stopPoints.forEach(({ commonName, stationNaptan, lineModeGroups }) => {
    //   makeTFLGetRequest(`/StopPoint/${stationNaptan}/Route`).then(res => {
    //     console.log(stationNaptan)
    //     console.log(res)
    //     console.log()
    //   })
    // })
    //return
    // remove stopPoints with no line data
    stopPoints = filterStopPointsByLineData(stopPoints);
    //console.log(stopPoints);

    // remove duplicate stopPoints
    // stopPoints = await filterStopPointsByTopLevel(stopPoints, "stationNaptan");

    // id, naptanId refers to a single bus stop; stationNaptan can refer to a cluster of stops (e.g. one on each side of the road)

    // using CanReachOnLine route on each of a cluster of naptanIds...
    // gives same stops as using using CanReachOnLine once on corresponding stationNaptan...
    // albeit with different commonNames/id
    //stopPoints = getUniqueListBy(stopPoints, "stationNaptan");

    //console.log(stopPoints);

    // const tmpModes = (await getTransportModes()).map(({ modeName }) => modeName)
    // console.log(JSON.stringify(tmpModes));
    //const stopPointIDs = stopPoints.map(({ id }) => id);
    //console.log(stopPoints)
    stopPoints = await filterStopPointsByTopLevel(stopPoints);
    console.log(stopPoints)

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
    setInfo(`Stops within ${radius} metres of postcode ${postcode} (${centrePoint}): ${summaryText.join(", ")}`);

    let stopLineData = {}
    for (const stopPoint of stopPoints) {
      for (const { modeName, lineIdentifier } of stopPoint.lineModeGroups) {
        if (!chosenModes.has(modeName))
          continue
        stopLineData[modeName] = stopLineData[modeName] || {}
        for (const line of lineIdentifier) {
          stopLineData[modeName][line] = stopLineData[modeName][line] || new Set()
          stopLineData[modeName][line].add(stopPoint)
        }
      }
    }
    console.log(stopLineData)
    let branchData = await getBranchData(stopLineData)
    console.log(branchData)
    let nearbyBranchData = filterBranchData(branchData, stopLineData)

    console.log(nearbyBranchData)
    return
    let reachableStops = {};
    let linesRequested = new Set()
    stopPoints.forEach(({ commonName, stationNaptan, lineModeGroups }) => {
      for (const { modeName, lineIdentifier } of lineModeGroups) {
        if (!chosenModes.has(modeName))
          continue
        reachableStops[modeName] = reachableStops[modeName] || {}
        for (const line of lineIdentifier) {
          if (linesRequested.has(line))
            continue
          linesRequested.add(line)
          makeTFLGetRequest(`/StopPoint/${stationNaptan}/CanReachOnLine/${line}`)
            .then(res => {
              if (typeof (res) !== "undefined")
                reachableStops[modeName][line] = res
            })
        }
      }
    });
    console.log(reachableStops)
  };

  return (
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
