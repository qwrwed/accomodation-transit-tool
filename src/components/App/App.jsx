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

import { MODES_INFO_ALL, TFL_API_URL_ROOT, NAPTAN_STOPTYPES, DEFAULT_POSTCODE, DEFAULT_RADIUS,  }  from "../../constants"

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
  setDifference,
  setNestedObject,
} from "../../utils";
import Map from "../Map/Map"
const postcodes = require("node-postcodes.io");

let MODES_INFO = objectFilter(MODES_INFO_ALL, (({ hidden }) => (!hidden)))
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
  return await makeTFLGetRequest("/StopPoint/Meta/StopTypes");
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

const filterStopPoints = async (stopPoints, chosenModesSet, topLevelKey, origin) => {
  // remove stopPoints with no line data
  stopPoints = stopPoints.filter(({ lines }) => lines.length > 0);

  // remove stopPoints that don't serve the chosen modes
  if (typeof (chosenModesSet) !== "undefined")
    stopPoints = stopPoints.filter(({ modes }) => setIntersection(new Set(modes), chosenModesSet).size > 0)

  // remove duplicate stopPoints
  if (typeof (topLevelKey) === "undefined") {
    return stopPoints
  } else {
    stopPoints = await Promise.all(
      stopPoints.map(async (stopPoint) =>
        makeTFLGetRequest(`/StopPoint/${stopPoint[topLevelKey]}`)
      )
    )
    stopPoints = stopPoints.map(
      stopPoint => { return { ...stopPoint, distance: !origin ? undefined : getDistanceFromLatLonInKm(origin, [stopPoint.lat, stopPoint.lon]) } }
    )
    return getUniqueListBy(stopPoints, topLevelKey)
  }
}

// get all branches
const getBranchData = async (stopPointsOnLines) => {
  let branchData = {}
  for (const modeName in stopPointsOnLines) {
    for (const line in stopPointsOnLines[modeName]) {
      const receivedRouteSequence = await makeTFLGetRequest(`/Line/${line}/Route/Sequence/all`)
      if (typeof (receivedRouteSequence) !== "undefined") {
        // console.log(res.stopPointSequences)
        for (const direction of ["inbound", "outbound"]) {
          for (const branchWithId of receivedRouteSequence.stopPointSequences) {
            if (!(branchWithId.direction === direction))
              continue
            //const branchIdUnique = `${line}-${branchWithId.branchId}`
            //console.log("found", branchIdUnique, branchWithId.direction)
            const { branchId, ...branch } = branchWithId
            setNestedObject(branchData, [modeName, line, direction, branchId], branch)
          }
        }
      }
    }
  }
  return branchData
}

// stopLineData:
//   object has modes;
//     mode has lines;
//       line has set of stopPoints
// only keep branches with nearby stopPoints
const filterBranchData = (branchData, stopPointsOnLines, branchDataKey = "id", stopLineDataKey = "id", toOrFromLocalStopPoints = "to") => {
  if (!["to", "from"].includes(toOrFromLocalStopPoints))
    throw new Error(`toOrFromLocalStopPoints must be "to" or "from"`)
  // TODO: only show stations ahead of identified station on branch?
  let allLines = []
  let filteredLines = []
  let nearbyBranchData = {}
  for (const lineMode in branchData) {
    // console.log(lineMode)
    for (const line in branchData[lineMode]) {
      allLines.push(line)
      // console.log(lineMode, line)
      for (const direction of ["inbound", "outbound"]) {
        // console.log(lineMode, line, direction)
        let branchesInDirection = branchData[lineMode][line][direction]
        // let availableBranchIds = new Set()
        let availableBranchIds = []
        let availableBranches = {}
        // let checkedBranchIds = new Set()
        let checkedBranchIds = []
        // console.log(branchesInDirection)
        for (const branchId in branchesInDirection) {
          // console.log(lineMode, line, direction, branchId)
          const stopPointsOnBranch = branchesInDirection[branchId].stopPoint
          const stopPointsOnLine = stopPointsOnLines[lineMode][line]
          const stationIdsOnBranch = stopPointsOnBranch.map((sp) => sp[branchDataKey])
          // console.log(stationIdsOnBranch)
          // console.log(stopPointsOnBranch[0], stopPointsOnBranch[stopPointsOnBranch.length - 1])
          // console.log(stopPointsOnBranch)
          // console.log(stopPointsOnLine)
          for (const sp of stopPointsOnLines[lineMode][line]) {
            const stopPointChosenId = sp[stopLineDataKey]
            const indexOnBranch = stationIdsOnBranch.indexOf(stopPointChosenId)
            // console.log(lineMode, line, direction, branchId, id)
            if (indexOnBranch > -1) {
              console.log(`${stopPointChosenId} (${sp.commonName}) on ${line}-${branchId} (${direction}) at ${indexOnBranch}`)
              if (!availableBranchIds.includes(branchId)) {
                console.log("Branch not yet added!")
                availableBranchIds.push(branchId)
                availableBranches[branchId] = { ...branchesInDirection[branchId], startOrEndIndex: indexOnBranch }
                filteredLines.push(line)
              } else {
                console.log("Branch already added!")
                switch (toOrFromLocalStopPoints) {
                  case "to":   { availableBranches[branchId].startOrEndIndex = Math.max(indexOnBranch, availableBranches[branchId].startOrEndIndex); break}
                  case "from": { availableBranches[branchId].startOrEndIndex = Math.min(indexOnBranch, availableBranches[branchId].startOrEndIndex); break}
                }
              }
            }
          }

          if (!(availableBranchIds.includes(branchId)))
            continue
          // get connected branches ahead
          console.log(`Checking for branches accessible from ${line}-${branchId} (${direction})`)
          console.log(JSON.parse(JSON.stringify({branchesInDirection})))
          console.log(JSON.parse(JSON.stringify({availableBranchIds})))
          console.log(JSON.parse(JSON.stringify({availableBranches})))
          if (checkedBranchIds.includes(branchId))
            continue
          checkedBranchIds.push(branchId)
          let branchesAheadIds = getDescendants(branchesInDirection, "nextBranchIds", new Set([branchId]))
          console.log({branchesAheadIds})
          // console.log(branchesAheadIds)
          for (const id of branchesAheadIds) {
            setNestedObject(nearbyBranchData, [lineMode, line, direction, id], branchesInDirection[id])
            //nearbyBranchData[lineMode][line][direction][id] = branchesInDirection[id]
            const branchStopPoints = branchesInDirection[id].stopPoint
            // console.log(`${id}: ${branchStopPoints[0].name} -> ${branchStopPoints[branchStopPoints.length - 1].name}`)
          }
        }
        // console.log(availableBranches)
      }
    }
  }
  let missingLines = [...setDifference(new Set(allLines), new Set(filteredLines))]
  return [nearbyBranchData, missingLines]
}
const App = () => {

  const [info, setInfo] = useState("Waiting for search...");
  const [postcode, setPostcode] = useState(DEFAULT_POSTCODE);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
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
    setInfo(`Searching for stops within ${radius} metres of ${postcode} (${JSON.stringify(latLong)})...`);
    let stopPoints = await getStopPointsByRadius(NAPTAN_STOPTYPES, latLong, radius);
    console.log(JSON.parse(JSON.stringify({stopPoints})))

    // check for no result
    if (stopPoints === undefined || stopPoints.length === 0) {
      setInfo(`No stops found within ${radius} metres of postcode ${postcode}`);
      return;
    }

    let chosenModesSet = new Set(objectToList(chosenModes))
    stopPoints = await filterStopPoints(stopPoints, chosenModesSet, undefined)
    setNearbyStopPoints(stopPoints)
    console.log(JSON.parse(JSON.stringify({stopPoints})))

    const summary = stopPoints.map(
      ({ commonName, distance }) => ({
        commonName,
        distance: typeof (distance) !== "undefined" ? Math.round(distance) : "???",
      })
    );
    summary.sort((a, b) => (a.distance > b.distance ? 1 : -1));
    const summaryText = summary.map(
      ({ commonName, distance }) => `${commonName} (${distance}m)`
    );
    setInfo(`Stops within ${radius} metres of postcode ${postcode} (${JSON.stringify(latLong)}): ${summaryText.join(", ")}`);

    let stopPointsOnLines = {}
    for (const stopPoint of stopPoints) {
      for (const { modeName, lineIdentifier } of stopPoint.lineModeGroups) {
        if (!chosenModesSet.has(modeName))
          continue
        for (const line of lineIdentifier) {
          if (typeof(stopPointsOnLines?.[modeName]?.[line]) === "undefined")
            setNestedObject(stopPointsOnLines, [modeName, line], [])
          stopPointsOnLines[modeName][line].push(stopPoint)
        }
      }
    }
    console.log(JSON.parse(JSON.stringify({stopPointsOnLines})))

    let branchData = await getBranchData(stopPointsOnLines)
    console.log(JSON.parse(JSON.stringify({branchData})))

    let [nearbyBranchData, missingLines] = filterBranchData(branchData, stopPointsOnLines, "stationId", "stationNaptan")
    if (missingLines.length > 0)
      console.error(`WARNING: Could not find route data for lines ${JSON.stringify(missingLines)}. This is likely a problem with the TFL API.`)
    console.log(JSON.parse(JSON.stringify({nearbyBranchData})))
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
