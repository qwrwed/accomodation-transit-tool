/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import Graph from "graphology";
import { reverse } from "graphology-operators";
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
import { objectKeysToList } from "../utils";

const defaultSigmaContainerStyle = { height: "500px", width: "100%" };

export const mergeGraph = (inputGraph: Graph, outputGraph: Graph) => {
  if (typeof inputGraph !== "undefined") {
    inputGraph.forEachNode((node, attributes) => {
      outputGraph.mergeNode(node, attributes);
    });
    inputGraph.forEachEdge((edge, attributes, fromNode, toNode) => {
      outputGraph.mergeEdge(fromNode, toNode, attributes);
    });
  }
};

export const mergeGraphList = (graphList: Graph[]) => {
  const outputGraph = new Graph();
  for (const graph of graphList) {
    mergeGraph(graph, outputGraph);
  }
  return outputGraph;
};

export const mergeGraphObject = (graphObject: Record<string, Graph>) => {
  const outputGraph = new Graph();
  for (const graph of Object.values(graphObject)) {
    mergeGraph(graph, outputGraph);
  }
  return outputGraph;
};

const GraphFunction = ({
  graph,
  resetOnChange = true,
}: {
  graph: Graph;
  resetOnChange?: boolean;
}) => {
  const sigma = useSigma();
  const sigmaGraph = sigma.getGraph();
  if (resetOnChange) sigmaGraph.clear();
  mergeGraph(graph, sigmaGraph);
  return null;
};

export const GraphComponent = ({
  graph,
  style,
}: {
  graph: Graph;
  style: Record<string, any>;
}) => (
  <SigmaContainer style={{ ...defaultSigmaContainerStyle, ...style }}>
    <GraphFunction graph={graph} />
  </SigmaContainer>
);

export const getLineGraphFromLine = async ({
  lineId,
  direction,
  branchDataKey = "stationId",
}: {
  lineId: LineId;
  direction: Direction;
  branchDataKey?: string;
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

export const getLineGraphObjectFromLineIdList = async (
  lineIdList: LineId[],
  directionList: Direction[] = ["outbound"],
  reverseGraph = false,
) => {
  const lineGraphObject: Record<LineId, Graph> = {};
  for (const lineId of lineIdList) {
    for (const direction of directionList) {
      let lineGraph = await getLineGraphFromLine({ lineId, direction });
      if (reverseGraph) lineGraph = reverse(lineGraph);
      lineGraphObject[lineId] = lineGraph;
    }
  }
  return lineGraphObject;
};

export const getLineGraphListFromLineIdList = async (
  lineIdList: LineId[],
  directionList: Direction[] = ["outbound"],
) =>
  Object.values(
    await getLineGraphObjectFromLineIdList(lineIdList, directionList),
  );

export const setGraphListFromChosenModes = async (
  chosenModes: any,
  graphListSetter: any,
  directionList: Direction[] = ["outbound"],
) => {
  const modesList = objectKeysToList(chosenModes);
  if (modesList.length === 0) return;
  const lineGraphList = await getLineGraphListFromLineIdList(
    (await getLinesFromModes(modesList)).map(({ id }: { id: any }) => id),
    directionList,
    // "stationId",
  );
  graphListSetter(lineGraphList);
};
