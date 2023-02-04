/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable */
import Graph from "graphology";
import { reverse } from "graphology-operators";
import React from "react";
import toast from "react-hot-toast";
import { SigmaContainer, useSigma } from "react-sigma-v2";
import "react-sigma-v2/lib/react-sigma-v2.css";
import { getLinesFromModes, getRoutesOnLine } from "../api";
import {
  EDGE_TYPE,
  GRAPH_NODE_SIZE,
  LINE_COLORS,
  MODES_INFO_ALL,
} from "../constants";
import { objectKeysToList, objectMap, setUnion } from "../utils";

const defaultSigmaContainerStyle = { height: "500px", width: "100%" };

export const mergeGraph = (inputGraph: Graph, outputGraph: Graph, setAttributes: string[] = []) => {
  if (typeof inputGraph !== "undefined") {
    inputGraph.forEachNode((node, attributes) => {
      for (const setName of setAttributes){
        let currentAttribute = new Set();
        if (outputGraph.hasNode(node)){
          currentAttribute = outputGraph.getNodeAttribute(node, setName) || new Set();
        }
        const incomingAttribute = inputGraph.getNodeAttribute(node, setName) || new Set();
        const newAttribute = setUnion(currentAttribute, incomingAttribute);
        if (newAttribute.size > 0){
          attributes[setName] = newAttribute;
        }
      }
      outputGraph.mergeNode(node, attributes);
    });
    inputGraph.forEachEdge((edge, attributes, fromNode, toNode) => {
      const [resKey, resEdgeAdded, resSrcNodeAdded, resTargetNodeAdded] =
        outputGraph.mergeEdgeWithKey(edge, fromNode, toNode, attributes);
    });
  }
};

export const mergeGraphList = (graphList: Graph[]) => {
  const isMulti = graphList.map(({ multi }) => multi).some((v) => v);
  const outputGraph = new Graph({ multi: isMulti });
  for (const graph of graphList) {
    mergeGraph(graph, outputGraph);
  }
  return outputGraph;
};

export const mergeGraphObject = (graphObject: Record<string, Graph>) => {
  const isMulti = Object.values(objectMap(graphObject, ({ multi }: { multi: boolean }) => multi)).some((v) => v);
  const outputGraph = new Graph({ multi: isMulti });
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
  <SigmaContainer
    initialSettings={{ renderEdgeLabels: true }}
    style={{ ...defaultSigmaContainerStyle, ...style }}
  >
    <GraphFunction graph={graph} />
  </SigmaContainer>
);

export const getLineGraphFromLine = async ({
  lineId,
  direction,
  branchDataKey = "stationId",
  multi = true,
}: {
  lineId: LineId;
  direction: Direction;
  branchDataKey?: string;
  multi?: boolean;
}) => {
  const lineGraph = new Graph({multi});
  const routeSequence = await getRoutesOnLine(lineId);
  const lineName = routeSequence.lineName;
  if (routeSequence === null) return lineGraph;
  if (!routeSequence.stopPointSequences.length){
    const info =`TFL returned no data for line "${lineName}". Data for this line may be missing or incomplete.`
    console.error(info);
    toast.error(info, { id: info })
  }
  const lineColor =
    LINE_COLORS[routeSequence.lineId] ||
    MODES_INFO_ALL[routeSequence.mode].color;
  const { mode: modeName } = routeSequence
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
        const fromTo = [spFrom[branchDataKey], spTo[branchDataKey]]
        // fromTo.sort();
        lineGraph.mergeEdgeWithKey(
          JSON.stringify({lineId, fromTo}),
          // `${lineId}|${fromTo}`,
          fromTo[0],
          fromTo[1],
          {
            lineId,
            modeName,
            type: EDGE_TYPE,
            size: 2,
            color: lineColor,
            label: lineName,
            direction,
          },
        );
      }
    }
  }
  return lineGraph;
};

export const makeLineGraphUndirected = (inputGraph: Graph) => {
  const outputGraph = new Graph({multi: inputGraph.multi})
  inputGraph.forEachNode((node, attributes) => {
    outputGraph.mergeNode(node, attributes);
  });
  inputGraph.forEachEdge((edge, attributes, fromNode, toNode) => {
    const edgeJson = JSON.parse(edge)
    const { fromTo } = edgeJson
    fromTo.sort()
    outputGraph.mergeEdgeWithKey(JSON.stringify(edgeJson), fromTo[0], fromTo[1], attributes);
  });
  return outputGraph;
}

export const getLineGraphObjectFromLineIdList = async (
  lineIdList: LineId[],
  directionList: Direction[] = ["outbound"],
  reverseGraph = false,
  multi = true,
) => {
  const lineGraphObject: Record<LineId, Graph> = {};
  for (const lineId of lineIdList) {
    for (const direction of directionList) {
      let lineGraph = await getLineGraphFromLine({ lineId, direction, multi });
      if (reverseGraph) lineGraph = reverse(lineGraph);
      // console.log(JSON.parse(JSON.stringify(lineGraph)));
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
