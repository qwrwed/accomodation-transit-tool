/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import Graph from "graphology";
import React from "react";
import { SigmaContainer, useSigma } from "react-sigma-v2/lib/esm";
import "react-sigma-v2/lib/react-sigma-v2.css";
import { getLinesFromModes, getRoutesOnLine } from "../api";
import { GRAPH_NODE_SIZE, LINE_COLORS, MODES_INFO_ALL } from "../constants";
import { objectToList } from "../utils";

const defaultSigmaContainerStyle = { height: "500px", width: "100%" };

const BaseGraphFunction = ({ inputGraph, sigmaGraph }) => {
  if (typeof inputGraph !== "undefined") {
    inputGraph.forEachNode((node, attributes) => {
      sigmaGraph.mergeNode(node, attributes);
    });
    inputGraph.forEachEdge((edge, attributes, fromNode, toNode) => {
      sigmaGraph.mergeEdge(fromNode, toNode, attributes);
    });
  }
  return null;
};

const SingleGraphFunction = ({ graph, resetOnChange = true }) => {
  const sigma = useSigma();
  const sigmaGraph = sigma.getGraph();
  if (resetOnChange) sigmaGraph.clear();
  BaseGraphFunction({ inputGraph: graph, sigmaGraph });
  return null;
};

const MultipleGraphFunction = ({ graphs }) => {
  const sigma = useSigma();
  const sigmaGraph = sigma.getGraph();
  sigmaGraph.clear();
  for (const graph of graphs) {
    BaseGraphFunction({ inputGraph: graph, sigmaGraph });
  }
  return null;
};

export const SingleGraph = ({ graph, style }) => (
  <SigmaContainer style={{ ...defaultSigmaContainerStyle, ...style }}>
    <SingleGraphFunction graph={graph} />
  </SigmaContainer>
);

export const MultipleGraph = ({ graphs, style }) => (
  <SigmaContainer style={{ ...defaultSigmaContainerStyle, ...style }}>
    <MultipleGraphFunction graphs={graphs} />
  </SigmaContainer>
);

export const getLineGraphFromLine = async ({
  line,
  direction,
  branchDataKey = "stationId",
}) => {
  const lineColor = LINE_COLORS[line.id] || MODES_INFO_ALL[line.modeName].color;
  const routeSequence = await getRoutesOnLine(line);
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
          type: "line",
          size: 2,
          color: lineColor,
        });
      }
    }
  }
  return lineGraph;
};

export const getLineGraphsFromLineList = async ({
  lineList,
  directionList,
}) => {
  const lineGraphList = [];
  for (const line of lineList) {
    for (const direction of directionList) {
      const lineGraph = await getLineGraphFromLine({ line, direction });
      lineGraphList.push(lineGraph);
    }
  }
  return lineGraphList;
};

export const setGraphListFromChosenModes = async (
  chosenModes,
  graphListSetter
) => {
  const modesList = objectToList(chosenModes);
  if (modesList.length === 0) return;
  const lineGraphList = await getLineGraphsFromLineList({
    lineList: await getLinesFromModes(modesList),
    directionList: ["outbound"],
    branchDataKey: "stationId",
  });
  graphListSetter(lineGraphList);
};
