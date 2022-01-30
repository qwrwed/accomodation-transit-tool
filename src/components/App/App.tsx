/* eslint-disable object-curly-newline */
/* eslint-disable max-len */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
// /* eslint-disable */
import React, { ChangeEvent, useState } from "react";
// import React, { useState } from "react";
// import Button from "react-bootstrap/Button";

import Graph from "graphology";
import { dfsFromNode } from "graphology-traversal/dfs";
import subgraph from "graphology-operators/subgraph";

import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import TfL from "tfl-api-wrapper/dist/lib/interfaces/tfl";

import {
  NAPTAN_STOPTYPES,
  DEFAULT_POSTCODE,
  DEFAULT_RADIUS,
  LINE_COLORS,
  MODES_DEFAULT,
  MODES_LABELS,
} from "../../constants";

import CheckBoxList from "../CheckBoxList";
import "bootstrap/dist/css/bootstrap.min.css";

// import logo from './logo.svg';
import logo from "../../tfl_roundel_no_text.svg";
import "./App.css";
import { objectKeysToList, setNestedObject } from "../../utils";
import Map from "../Map/Map";

import {
  getLatLonFromPostCode,
  getStopPointsByRadius,
  filterStopPoints,
} from "../../api";

import {
  getLineGraphObjectFromLineIdList,
  GraphComponent,
  mergeGraphObject,
  mergeGraph,
} from "../Graphs";

// const stopPointInstance = new StopPoint(getTFLApiKey());

const mergeStopPoint = (
  graph: Graph,
  stopPoint: TfL["MatchedStop"],
  lineName: string,
) => {
  const branchDataKey = "stationId";
  graph.mergeNode(stopPoint[branchDataKey], {
    ...stopPoint,
    x: stopPoint.lon,
    y: stopPoint.lat,
    label: stopPoint.name,
    color: LINE_COLORS[lineName],
  });
};

const App = () => {
  const [info, setInfo] = useState("Waiting for search...");
  const [postcode, setPostcode] = useState(DEFAULT_POSTCODE);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [chosenModesList, setChosenModesList] = useState(MODES_DEFAULT);
  const [displayedGraph, setDisplayedGraph] = useState(new Graph());

  // map data
  const [postcodeInfo, setPostcodeInfo] =
    useState<{ postcode: string; latLong: LatLon }>();
  const [nearbyStopPoints, setNearbyStopPoints] = useState<TfL["StopPoint"][]>(
    [],
  );

  const handleRadiusChange = (e: ChangeEvent<HTMLInputElement>) => {
    // const handleRadiusChange = (e) => {
    // https://stackoverflow.com/a/43177957
    const onlyInts = e.target.value.replace(/[^0-9]/g, "");
    setRadius(+onlyInts);
  };

  const handleButtonClick = async () => {
    // convert postcode to latitude, longitude
    setInfo(`Getting latitude/longitude of postcode ${postcode}...`);
    // const latLong: [number, number] = await getLatLonFromPostCode(postcode);
    const latLong = await getLatLonFromPostCode(postcode);
    setPostcodeInfo({ postcode, latLong });

    // get list of stopPoints within radius
    setInfo(
      `Searching for stops within ${radius} metres of ${postcode} (${JSON.stringify(
        latLong,
      )})...`,
    );
    let stopPoints = await getStopPointsByRadius(
      NAPTAN_STOPTYPES,
      latLong,
      radius,
    );

    // console.log(JSON.parse(JSON.stringify({ stopPoints })));

    // check for no result
    if (stopPoints === undefined || stopPoints.length === 0) {
      setInfo(`No stops found within ${radius} metres of postcode ${postcode}`);
      return;
    }

    const chosenModesSet = new Set(objectKeysToList(chosenModesList));
    stopPoints = await filterStopPoints(
      stopPoints,
      chosenModesSet,
      undefined,
      undefined,
    );
    setNearbyStopPoints(stopPoints);

    const summary = stopPoints.map(({ commonName, distance }) => ({
      commonName,
      distance: typeof distance !== "undefined" ? Math.round(distance) : "???",
    }));
    summary.sort((a, b) => (a.distance > b.distance ? 1 : -1));
    const summaryText = summary.map(
      ({ commonName, distance }) => `${commonName} (${distance}m)`,
    );
    setInfo(
      `Stops within ${radius} metres of postcode ${postcode} (${JSON.stringify(
        latLong,
      )}): ${summaryText.join(", ")}`,
    );

    const nearbyLineIdList: string[] = [];
    const stopPointsOnLines: Record<
      ModeId,
      Record<LineId, TfL["StopPoint"][]>
    > = {};
    for (const stopPoint of stopPoints) {
      for (const {
        modeName,
        lineIdentifier,
      } of stopPoint.lineModeGroups as TfL["LineModeGroup"][]) {
        if (chosenModesSet.has(modeName as string)) {
          for (const line of lineIdentifier as string[]) {
            if (typeof stopPointsOnLines?.[modeName!]?.[line] === "undefined") {
              setNestedObject(stopPointsOnLines, [modeName, line], []);
              nearbyLineIdList.push(line);
            }
            stopPointsOnLines[modeName!][line].push(stopPoint);
          }
        }
      }
    }

    const finalGraphDirections: Record<string, Graph> = {};

    // const directions: Direction[] = ["outbound"];
    // const directions: Direction[] = ["inbound"];
    const directions: Direction[] = ["inbound", "outbound"];

    for (const direction of directions) {
      const lineGraphObjectInDirection = await getLineGraphObjectFromLineIdList(
        nearbyLineIdList,
        [direction],
      );
      finalGraphDirections[direction] = new Graph();

      for (const modeName in stopPointsOnLines) {
        for (const lineName in stopPointsOnLines[modeName]) {
          const stopPointsReachableFromNearbyStopPointsOnLineGraph =
            new Graph();
          const graphDirectionLine = lineGraphObjectInDirection[lineName];
          for (const stopPoint of stopPointsOnLines[modeName][lineName]) {
            // console.log(
            //   `Graphing line "${lineName}" stop "${stopPoint.commonName}" (${stopPoint.stationNaptan}) in direction ${direction}`,
            // );
            if (graphDirectionLine.hasNode(stopPoint.stationNaptan)) {
              dfsFromNode(
                graphDirectionLine,
                stopPoint.stationNaptan,
                (node, attr) => {
                  mergeStopPoint(
                    stopPointsReachableFromNearbyStopPointsOnLineGraph,
                    attr,
                    lineName,
                  );
                },
              );
            } else {
              // console.log("Not found");
            }
          }
          const sub = subgraph(
            graphDirectionLine,
            stopPointsReachableFromNearbyStopPointsOnLineGraph.nodes(),
          );
          for (const stopPoint of stopPointsOnLines[modeName][lineName]) {
            sub.mergeNode(stopPoint.stationNaptan, { size: 4 });
          }
          mergeGraph(sub, finalGraphDirections[direction]);
        }
      }
    }
    setDisplayedGraph(mergeGraphObject(finalGraphDirections));
  };

  return (
    <Container maxWidth="md" className="App">
      <Paper>
        <img src={logo} className="App-logo" alt="logo" />
        <Typography variant="h4" component="h1" gutterBottom>
          transit-tool
        </Typography>
        <CheckBoxList
          listState={chosenModesList}
          setListState={setChosenModesList}
          listLabels={MODES_LABELS}
        />
        <Box
          component="form"
          sx={{ "& .MuiTextField-root": { m: 1, width: "25ch" } }}
          noValidate
          autoComplete="off"
        >
          <div>
            <TextField
              variant="outlined"
              label="Postcode"
              value={postcode}
              onInput={(e: ChangeEvent<HTMLInputElement>) =>
                setPostcode(e.target.value)
              }
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
        <Map postcodeInfo={postcodeInfo} nearbyStopPoints={nearbyStopPoints} />
        <GraphComponent graph={displayedGraph} style={{}} />
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
