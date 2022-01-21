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


import { pantonePalette } from "../../colors"

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
  roundAccurately,
  objectFilter,
  setIntersection,
  setDifference
} from "../../utils";
import Map from "../Map/Map"
const postcodes = require("node-postcodes.io");


const TFL_API_URL_ROOT = "https://api.tfl.gov.uk";
// https://blog.tfl.gov.uk/2015/10/08/unified-api-part-2-lot-location-of-things/

const NAPTAN_STOPTYPES = [
  "NaptanMetroStation",
  "NaptanRailStation",
  "NaptanBusCoachStation",
  "NaptanPublicBusCoachTram",
  "NaptanFerryPort",
]

// only scheduled modes
export let MODES_INFO = {
  "bus": {
    label: "London Buses",
    color: pantonePalette["485"],
    selectedByDefault: false,
    icon: "fa-bus"
  },
  "cable-car": { hidden: true },
  "coach": {
    label: "Victoria Coach Station",
    color: pantonePalette["130"],
    hidden: true,
  },
  "dlr": {
    label: "Docklands Light Railway",
    color: pantonePalette["326"],
    selectedByDefault: true,
    icon: "fa-subway",
  },
  "national-rail": {
    label: "National Rail",
    icon: "fa-train",
  },
  "overground": {
    label: "London Overground",
    color: pantonePalette["158"],
    selectedByDefault: true,
    icon: "fa-subway"
  },
  "replacement-bus": { hidden: false },
  "river-bus": {
    label: "London River Services",
    color: pantonePalette["299"],
    hidden: true,
    icon: "fa-ship"
  },
  "river-tour": { hidden: true },
  "tflrail": { 
    hidden: true,
    icon: "fa-train",
  },
  "tram": {
    label: "London Tramlink",
    color: pantonePalette["368"],
    icon: "fa-subway"
  },
  "tube": {
    label: "London Underground",
    color: pantonePalette["158"],
    selectedByDefault: true,
    icon: "fa-subway"
  }
}
MODES_INFO = objectFilter(MODES_INFO, (({ hidden }) => (!hidden)))
const MODES_LABELS = objectMap(MODES_INFO, ({ label }) => label)
const MODES_DEFAULT = objectMap(MODES_INFO, ({ selectedByDefault }) => selectedByDefault || false)

const getLatLonFromPostCode = async (postcode) => {
  let { result: res } = await postcodes.lookup(postcode);
  res = objectMap(res, (v => roundAccurately(v, 3)))
  return { lat: res.latitude, lon: res.longitude };
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
  // console.log(`GET ${TFL_API_URL_ROOT}${route}?${params}`)
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

const getTransportModes = async () => {
  let res = await makeTFLGetRequest("/Line/Meta/Modes")
  res = res.filter(mode => mode.isScheduledService)
  res = Object.values(objectMap(res, v => v.modeName))
  return res
}

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
  const res = await makeTFLGetRequest("/StopPoint", params);
  if (typeof (res) !== "undefined")
    return res.stopPoints
  return []
};

const filterStopPointsByModes = (stopPoints, chosenModesSet) =>
  stopPoints.filter(({ modes }) => setIntersection(new Set(modes), chosenModesSet).size > 0)

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

// get all branches
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

// only keep branches with nearby stopPoints
const filterBranchData = (branchData, stopLineData) => {
  // TODO: only show stations ahead of identified station on branch?
  let allLines = new Set()
  let filteredLines = new Set()
  let nearbyBranchData = {}
  for (const lineMode in branchData) {
    // console.log(lineMode)
    for (const line in branchData[lineMode]) {
      allLines.add(line)
      // console.log(lineMode, line)
      for (const direction of ["inbound", "outbound"]) {
        // console.log(lineMode, line, direction)
        let branchesInDirection = branchData[lineMode][line][direction]
        let availableBranchIds = new Set()
        let checkedBranchIds = new Set()
        // console.log(branchesInDirection)
        for (const branchId in branchesInDirection) {
          // console.log(lineMode, line, direction, branchId)
          const stationIdsOnBranch = new Set(branchData[lineMode][line][direction][branchId].stopPoint.map(({ topMostParentId }) => topMostParentId))
          // console.log(stationIdsOnBranch)
          for (const { naptanId } of stopLineData[lineMode][line]) {
            // console.log(lineMode, line, direction, branchId, naptanId)
            if (stationIdsOnBranch.has(naptanId)) {
              // console.log(`${naptanId} is in branch ${branchId} of ${lineMode} ${line} (${direction})`)
              availableBranchIds.add(branchId)
              filteredLines.add(line)
              break
            }
          }
          if (!(availableBranchIds.has(branchId)))
            continue
          // get connected branches ahead
          // console.log(`Checking for branches accessible from ${branchId}`)
          // console.log(branchData[lineMode][line][direction])
          if (checkedBranchIds.has(branchId))
            continue
          checkedBranchIds.add(branchId)
          let branchesAheadIds = getDescendants(branchesInDirection, "nextBranchIds", new Set([branchId]))
          nearbyBranchData[lineMode] = nearbyBranchData[lineMode] || {}
          nearbyBranchData[lineMode][line] = nearbyBranchData[lineMode][line] || {}
          nearbyBranchData[lineMode][line][direction] = nearbyBranchData[lineMode][line][direction] || {}
          // console.log(branchesAheadIds)
          for (const id of branchesAheadIds) {
            nearbyBranchData[lineMode][line][direction][id] = branchesInDirection[id]
            const branchStopPoints = branchesInDirection[id].stopPoint
            // console.log(`${id}: ${branchStopPoints[0].name} -> ${branchStopPoints[branchStopPoints.length - 1].name}`)
          }
        }
      }
    }
  }
  let missingLines = [...setDifference(allLines, filteredLines)]
  return [nearbyBranchData, missingLines]
}
const App = () => {
  // const defaultPostcode = "SE1 6TG" // example location in API docs
  const defaultPostcode = "SE1 9SG"; // london bridge bus station
  // const defaultPostcode = "SW1A 2JR" // westminster tube station
  const defaultRadius = 300;

  const [info, setInfo] = useState("Waiting for search...");
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [radius, setRadius] = useState(defaultRadius);
  const [chosenModes, setChosenModes] = useState(MODES_DEFAULT);
  
  // map data
  const [postcodeInfo, setPostcodeInfo] = useState();
  const [nearbyStopPoints, setNearbyStopPoints] = useState([])

  const handleRadiusChange = (e) => {
    // https://stackoverflow.com/a/43177957
    const onlyInts = e.target.value.replace(/[^0-9]/g, "");
    setRadius(+onlyInts);
  };

  const handleButtonClick = async () => {
    // convert key:bool pairs to list of selected keys
    // console.log(JSON.stringify(await getTransportModes()))

    // convert postcode to latitude, longitude
    setInfo(`Getting latitude/longitude of postcode ${postcode}...`);
    let latLong = await getLatLonFromPostCode(postcode);
    setPostcodeInfo({ postcode, latLong: [latLong.lat, latLong.lon] })

    // get list of stopPoints within radius
    setInfo(
      `Searching for stops within ${radius} metres of ${postcode} (${JSON.stringify(
        latLong
      )})...`
    );
    let stopPoints = await getStopPointsByRadius(
      NAPTAN_STOPTYPES,
      latLong,
      radius
    );


    // check for no result
    if (stopPoints === undefined || stopPoints.length === 0) {
      setInfo(`No stops found within ${radius} metres of postcode ${postcode}`);
      return;
    }

    let chosenModesSet = new Set(objectToList(chosenModes))
    // console.log(chosenModesSet);

    // remove stopPoints with no line data for chosen modes
    console.log(stopPoints)
    stopPoints = filterStopPointsByModes(stopPoints, chosenModesSet)
    console.log(stopPoints)
    stopPoints = filterStopPointsByLineData(stopPoints);
    console.log(stopPoints);

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
    setNearbyStopPoints(stopPoints)
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
    setInfo(`Stops within ${radius} metres of postcode ${postcode} (${JSON.stringify(latLong)}): ${summaryText.join(", ")}`);

    let stopLineData = {}
    for (const stopPoint of stopPoints) {
      for (const { modeName, lineIdentifier } of stopPoint.lineModeGroups) {
        if (!chosenModesSet.has(modeName))
          continue
        stopLineData[modeName] = stopLineData[modeName] || {}
        for (const line of lineIdentifier) {
          stopLineData[modeName][line] = stopLineData[modeName][line] || new Set()
          stopLineData[modeName][line].add(stopPoint)
        }
      }
    }
    return
    console.log(stopLineData)
    let branchData = await getBranchData(stopLineData)
    console.log(branchData)
    let [nearbyBranchData, missingLines] = filterBranchData(branchData, stopLineData)
    if (missingLines.length > 0)
      console.error(`WARNING: Could not find route data for lines ${JSON.stringify(missingLines)}. This is likely a problem with the TFL API.`)
    console.log(nearbyBranchData)
    return
    let reachableStops = {};
    let linesRequested = new Set()
    stopPoints.forEach(({ commonName, stationNaptan, lineModeGroups }) => {
      for (const { modeName, lineIdentifier } of lineModeGroups) {
        if (!chosenModesSet.has(modeName))
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
          listState={chosenModes}
          setListState={setChosenModes}
          listLabels={MODES_LABELS}
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
              error={radius === 0}
            />
          </div>
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={handleButtonClick}
              disabled={radius === 0}
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
        <Map
          postcodeInfo={postcodeInfo}
          nearbyStopPoints={nearbyStopPoints}
        />
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
