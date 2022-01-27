/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import Graph from "graphology";
import React from "react";
import { SigmaContainer, useSigma } from "react-sigma-v2/lib/esm";
import "react-sigma-v2/lib/react-sigma-v2.css";
import { getLinesFromModes, getRoutesOnLine } from "../api";
import {
  EDGE_TYPE,
  GRAPH_NODE_SIZE,
  LINE_COLORS,
  MODES_INFO_ALL,
} from "../constants";
import { objectToList } from "../utils";

const defaultSigmaContainerStyle = { height: "500px", width: "100%" };

export const mergeGraph = (inputGraph, outputGraph) => {
  if (typeof inputGraph !== "undefined") {
    inputGraph.forEachNode((node, attributes) => {
      outputGraph.mergeNode(node, attributes);
    });
    inputGraph.forEachEdge((edge, attributes, fromNode, toNode) => {
      outputGraph.mergeEdge(fromNode, toNode, attributes);
    });
  }
};

export const mergeGraphList = (graphList) => {
  const outputGraph = new Graph();
  for (const graph of graphList) {
    mergeGraph(graph, outputGraph);
  }
  return outputGraph;
};

const GraphFunction = ({ graph, resetOnChange = true }) => {
  const sigma = useSigma();
  const sigmaGraph = sigma.getGraph();
  if (resetOnChange) sigmaGraph.clear();
  mergeGraph(graph, sigmaGraph);
  return null;
};

export const GraphComponent = ({ graph, style }) => (
  <SigmaContainer style={{ ...defaultSigmaContainerStyle, ...style }}>
    <GraphFunction graph={graph} />
  </SigmaContainer>
);

export const getLineGraphFromLine = async ({
  lineId,
  direction,
  branchDataKey = "stationId",
}) => {
  const routeSequence = await getRoutesOnLine(lineId);
  const lineColor =
    LINE_COLORS[routeSequence.lineId] ||
    MODES_INFO_ALL[routeSequence.mode].color;
  const lineGraph = new Graph();
  for (const stopPointSequence of routeSequence.stopPointSequences) {
    if (stopPointSequence.direction === direction) {
      const stopPointArray = stopPointSequence.stopPoint;
      for (let i = 0; i < stopPointArray.length - 1; i += 1) {
        const spFrom = stopPointArray[i];
        const spTo = stopPointArray[i + 1];
        if (i === 0) {
          lineGraph.mergeNode(spFrom[branchDataKey], {
            ...spFrom,
            x: spFrom.lon,
            y: spFrom.lat,
            label: spFrom.name,
            color: lineColor,
            size: GRAPH_NODE_SIZE,
          });
        }
        lineGraph.mergeNode(spTo[branchDataKey], {
          ...spTo,
          x: spTo.lon,
          y: spTo.lat,
          label: spTo.name,
          color: lineColor,
          size: GRAPH_NODE_SIZE,
        });
        lineGraph.mergeEdge(spFrom[branchDataKey], spTo[branchDataKey], {
          lineId,
          type: EDGE_TYPE,
          size: 2,
          color: lineColor,
        });
      }
    }
  }
  return lineGraph;
};

export const getLineGraphsFromLineIdList = async (
  lineIdList,
  directionList = ["outbound"]
) => {
  const lineGraphList = [];
  for (const lineId of lineIdList) {
    for (const direction of directionList) {
      const lineGraph = await getLineGraphFromLine({ lineId, direction });
      lineGraphList.push(lineGraph);
    }
  }
  return lineGraphList;
};

export const setGraphListFromChosenModes = async (
  chosenModes,
  graphListSetter,
  directionList = ["outbound"]
) => {
  const modesList = objectToList(chosenModes);
  if (modesList.length === 0) return;
  const lineGraphList = await getLineGraphsFromLineIdList(
    (await getLinesFromModes(modesList)).map(({ id }) => id),
    directionList,
    "stationId"
  );
  graphListSetter(lineGraphList);
};
