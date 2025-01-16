import React from "react";
import { Polyline } from "react-leaflet";
import "leaflet-arrowheads";

export default class ArrowheadsPolyline extends React.Component {
  componentDidMount() {
    const { arrowheads } = this.props;
    const polyline = this.polylineRef;
    if (arrowheads) {
      polyline.arrowheads(arrowheads);
      polyline._update();
    }
  }

  componentWillUnmount() {
    const { arrowheads } = this.props;
    if (arrowheads) {
      const polyline = this.polylineRef;
      polyline.deleteArrowheads();
      polyline.remove();
    }
  }

  render() {
    return (
      <Polyline
        {...this.props}
        ref={(polylineRef) => {
          this.polylineRef = polylineRef;
        }}
      />
    );
  }
}
