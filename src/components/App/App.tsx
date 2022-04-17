/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
/* eslint-disable func-names */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable object-curly-newline */
/* eslint-disable max-len */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
// /* eslint-disable */
// @ts-nocheck
import React, { ChangeEvent, useState, useEffect } from "react";
// import React, { useState } from "react";
// import Button from "react-bootstrap/Button";
import toast, { Toaster } from "react-hot-toast";

import Graph from "graphology";
import { dfsFromNode } from "graphology-traversal/dfs";
import subgraph from "graphology-operators/subgraph";
import reverse from "graphology-operators/reverse";

import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import "bootstrap/dist/css/bootstrap.min.css";
import {
  NAPTAN_STOPTYPES,
  DEFAULT_POSTCODE,
  DEFAULT_RADIUS,
  LINE_COLORS,
  GRAPH_NODE_SIZE_POI,
} from "../../constants";

// import logo from './logo.svg';
import logo from "../../tfl_roundel_no_text.svg";
import "./App.css";
import { mapArrayOfKeysToObject, setNestedObject } from "../../utils";
import Map from "../Map/Map";

import {
  getLatLonFromPostCode,
  getStopPointsByRadius,
  filterStopPoints,
  lineModeDictionary,
} from "../../api";

import {
  getLineGraphObjectFromLineIdList,
  GraphComponent,
  mergeGraphObject,
  mergeGraph,
  makeLineGraphUndirected,
} from "../Graphs";

import { components as StopPointComponents } from "../../types/StopPoint";
import { components as LineComponents } from "../../types/Line";
import ModeCheckList from "../ModeCheckList";

// type LineModeGroup = StopPointComponents["schemas"]["Tfl-8"];
type StopPoint = StopPointComponents["schemas"]["Tfl-11"];
type MatchedStop = LineComponents["schemas"]["Tfl-20"];

const mergeStopPoint = (
  graph: Graph,
  stopPoint: MatchedStop,
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

const withToast = (fn: any, info: any, show = true) =>
  async function (...args: any[]) {
    const promise = fn(...args);
    if (show) {
      toast.promise(promise, {
        loading: info,
        success: info,
        error: info,
      });
    }
    return promise;
  };

const App = () => {
  const [info, setInfo] = useState("Waiting for search...");
  const [isBusy, setBusy] = useState(true);

  // const [formData["destination-postcode"], setPostcode] = useState(DEFAULT_POSTCODE);
  // const [formData["destination-radius"], setRadius] = useState(DEFAULT_RADIUS);

  const [displayedGraph, setDisplayedGraph] = useState(new Graph());
  // const [reverseGraph, setReverseGraph] = useState(true);
  // const reverseGraph = false;

  // map data
  const [originInfo, setOriginInfo] =
    useState<{ postcode: string; latLong: LatLon; radius: number }>();
  const [nearbyStopPoints, setNearbyStopPoints] = useState<StopPoint[]>([]);
  const [graphSerialized, setGraphSerialized] = useState<any>();

  const [getModeCheckList, setModeCheckList] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    "destination-postcode": DEFAULT_POSTCODE,
    "destination-radius": DEFAULT_RADIUS,
  });

  useEffect(() => {
    // (async () => {
    // })();
    const urlParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlParams);
    setFormData({ ...formData, ...params });
    setBusy(false);
  }, []);

  const handleFormChange = (e, value = null) => {
    setFormData({
      ...formData,
      [e.target.name]: value !== null ? value : e.target.value,
    });
  };

  const handleRadiusChange = (e) => {
    // const handleRadiusChange = (e) => {
    // https://stackoverflow.com/a/43177957
    const onlyInts = e.target.value.replace(/[^0-9]/g, "");
    setRadius(+onlyInts);
    handleFormChange(e, onlyInts);
    // setFormData({ ...formData, [e.target.name]: onlyInts });
  };

  const handleButtonClick = async (e) => {
    e.preventDefault();
    const form = e.target;
    const _formData = new FormData(form);
    const queryString = new URLSearchParams(formData).toString();
    window.history.pushState({}, "", `?${queryString}`);
    // return;

    let _info;
    const toastId = "toast";

    // convert postcode to latitude, longitude
    _info = `Getting latitude/longitude of postcode ${formData["destination-postcode"]}...`;
    setInfo(_info);
    toast.loading(_info, { id: toastId });
    const latLong = await getLatLonFromPostCode(
      formData["destination-postcode"],
    );
    if (latLong) {
      toast.success(_info, { id: toastId });
    } else {
      _info = `Postcode "${formData["destination-postcode"]}" not found`;
      setInfo(_info);
      toast.error(_info, { id: toastId });
      return;
    }

    setOriginInfo({
      postcode: formData["destination-postcode"],
      latLong,
      radius: formData["destination-radius"],
    });

    // get list of stopPoints within radius
    _info = `Searching for stops within ${
      formData["destination-radius"]
    } metres of ${formData["destination-postcode"]} (${JSON.stringify(
      latLong,
    )})...`;
    setInfo(_info);
    toast.loading(_info, { id: toastId });
    let stopPoints = await getStopPointsByRadius(
      NAPTAN_STOPTYPES,
      latLong,
      formData["destination-radius"],
    );
    toast.success(_info, { id: toastId });
    // console.log(JSON.parse(JSON.stringify({ stopPoints })));

    // check for no result
    if (stopPoints.length === 0) {
      setInfo(
        `No stops found within ${formData["destination-radius"]} metres of postcode ${formData["destination-postcode"]}`,
      );
      return;
    }

    const chosenModesSet = new Set(getModeCheckList);
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
      `Stops within ${formData["destination-radius"]} metres of postcode ${
        formData["destination-postcode"]
      } (${JSON.stringify(latLong)}): ${summaryText.join(", ")}`,
    );

    _info = "Plotting map...";
    toast.loading(_info, { id: toastId });
    // organise the nearby stopPoints by mode and line; {mode: {line: [stopPoint]}}
    const nearbyLineIdList: string[] = [];
    const nearbyStopPointsOnLines: Record<
      ModeId,
      Record<LineId, StopPoint[]>
    > = {};
    for (const stopPoint of stopPoints) {
      for (const { modeName, lineIdentifier } of stopPoint.lineModeGroups) {
        if (chosenModesSet.has(modeName)) {
          for (const line of lineIdentifier) {
            if (
              typeof nearbyStopPointsOnLines?.[modeName]?.[line] === "undefined"
            ) {
              setNestedObject(nearbyStopPointsOnLines, [modeName, line], []);
              nearbyLineIdList.push(line);
            }
            nearbyStopPointsOnLines[modeName][line].push(stopPoint);
          }
        }
      }
    }
    const multi = true;
    // const directions: Direction[] = ["outbound"];
    // const directions: Direction[] = ["inbound"];
    const directions: Direction[] = ["inbound", "outbound"];

    let finalGraphOutward = new Graph({ multi });
    let finalGraphInward = new Graph({ multi });

    for (const reverseGraph of [true, false]) {
      // for (const reverseGraph of [false]) {
      const finalGraphDirections: Record<string, Graph> =
        mapArrayOfKeysToObject(directions, () => new Graph({ multi }));

      for (const direction of directions) {
        const lineGraphObjectInDirection =
          await getLineGraphObjectFromLineIdList(
            nearbyLineIdList,
            [direction],
            reverseGraph,
            false,
          );

        finalGraphDirections[direction] = new Graph({ multi });

        for (const modeName in nearbyStopPointsOnLines) {
          for (const lineId in nearbyStopPointsOnLines[modeName]) {
            const stopPointsReachableFromNearbyStopPointsOnLineGraph =
              new Graph({ multi });
            const graphDirectionLine = lineGraphObjectInDirection[lineId];
            for (const stopPoint of nearbyStopPointsOnLines[modeName][lineId]) {
              // console.log(
              //   `Graphing line "${lineName}" stop "${stopPoint.commonName}" (${stopPoint.stationNaptan}) in direction "${direction}" (reverseGraph=${reverseGraph})`,
              // );
              if (graphDirectionLine.hasNode(stopPoint.stationNaptan)) {
                dfsFromNode(
                  graphDirectionLine,
                  stopPoint.stationNaptan,
                  (node, attr) => {
                    mergeStopPoint(
                      stopPointsReachableFromNearbyStopPointsOnLineGraph,
                      attr as MatchedStop,
                      lineId,
                    );
                  },
                );
              } else {
                // console.log("Not found");
              }
            }
            // let sub = graphDirectionLine;
            // sub = makeLineGraphUndirected(sub);
            const sub = subgraph(
              graphDirectionLine,
              stopPointsReachableFromNearbyStopPointsOnLineGraph.nodes(),
            );
            // for (const stopPoint of nearbyStopPointsOnLines[modeName][
            //   lineId
            // ]) {
            //   sub.mergeNode(stopPoint.stationNaptan, {
            //     size: GRAPH_NODE_SIZE_POI,
            //   });
            // }
            mergeGraph(sub, finalGraphDirections[direction]);
          }
        }
      }
      let finalGraphMerged = mergeGraphObject(finalGraphDirections);
      if (reverseGraph) {
        finalGraphMerged = reverse(finalGraphMerged);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        finalGraphInward = finalGraphMerged;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        finalGraphOutward = finalGraphMerged;
      }
    }
    const _displayedGraph = finalGraphOutward;

    setDisplayedGraph(_displayedGraph.copy()); // changes input for some reason, so pass a copy
    setGraphSerialized(makeLineGraphUndirected(_displayedGraph).export());
    toast.success(_info, { id: toastId });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Escape") {
      if (e.key === "Enter") {
        const { form } = e.target;
        const index = [...form].indexOf(e.target);
        for (let i = index + 1; i < form.length; i++) {
          const element = form.elements[i];
          if (element.localName === "input") {
            element.focus();
            break;
          }
        }
        e.preventDefault();
      } else {
        e.target.blur();
      }
    }
  };

  // const handleFormUpdate = (e) => {};
  if (isBusy) return null;
  return (
    <Container maxWidth="md" className="App">
      <Paper>
        <img src={logo} className="App-logo" alt="logo" />
        <Typography variant="h4" component="h1" gutterBottom>
          transit-tool
        </Typography>
        <ModeCheckList
          stateGetter={getModeCheckList}
          stateSetter={setModeCheckList}
        />
        <Paper
          elevation={3}
          component="form"
          onSubmit={handleButtonClick}
          sx={{ "& .MuiTextField-root": { m: 1, width: "25ch" } }}
          // noValidate
          // autoComplete="off"
        >
          <Typography variant="h5">Destination</Typography>
          <div>
            <TextField
              id="input-destination-postcode"
              name="destination-postcode"
              label="Destination Postcode"
              variant="outlined"
              defaultValue={formData["destination-postcode"]}
              onBlur={handleFormChange}
              onKeyDown={handleKeyDown}
              error={!formData["destination-postcode"]}
            />
          </div>
          <div>
            <TextField
              id="input-destination-radius"
              name="destination-radius"
              label="Destination Search Radius"
              variant="outlined"
              value={formData["destination-radius"]}
              onChange={handleRadiusChange}
              onKeyDown={handleKeyDown}
              InputProps={{
                endAdornment: <InputAdornment position="end">m</InputAdornment>,
              }}
              error={formData["destination-radius"] <= 0}
            />
          </div>
          <div>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              // onClick={handleButtonClick}
              disabled={
                formData["destination-radius"] <= 0 ||
                !formData["destination-postcode"]
              }
            >
              Get Data
            </Button>
          </div>
        </Paper>

        <p>{info}</p>
        <Map
          originInfo={originInfo}
          nearbyStopPoints={nearbyStopPoints}
          graphSerialized={graphSerialized}
        />
        {/* <GraphComponent graph={displayedGraph} style={{}} /> */}
        <p>Powered by TfL Open Data</p>
        <p>
          Contains OS data © Crown copyright and database rights (2016) and
          Geomni UK Map data © and database rights (2019)
        </p>
      </Paper>
      <Toaster />
    </Container>
  );
};

export default App;
