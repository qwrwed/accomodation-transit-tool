import React, { useRef, useEffect } from "react";
import { Polyline } from "react-leaflet";
import "leaflet-arrowheads";

const ArrowheadsPolyline = ({ arrowheads, ...props }) => {
  const polylineRef = useRef();

  useEffect(() => {
    const polyline = polylineRef.current;
    if (arrowheads && polyline) {
      polyline.arrowheads(arrowheads);
      polyline._update();
    }

    return () => {
      if (arrowheads && polyline) {
        polyline.deleteArrowheads();
        polyline.remove();
      }
    };
  }, [arrowheads]);

  return <Polyline ref={polylineRef} {...props} />;
};

export default ArrowheadsPolyline;
