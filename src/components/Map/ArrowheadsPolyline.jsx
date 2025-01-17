import React, { useRef, useEffect } from "react";
import { Polyline } from "react-leaflet";
import "leaflet-arrowheads";

const ArrowheadsPolyline = ({ arrowheads, ...props }) => {
  const polylineRef = useRef();

  useEffect(() => {
    const polyline = polylineRef.current;
    if (arrowheads && polyline) {
      polyline.arrowheads(arrowheads);
      // eslint-disable-next-line no-underscore-dangle
      polyline._update();
    }

    return () => {
      if (arrowheads && polyline) {
        polyline.deleteArrowheads();
        polyline.remove();
      }
    };
  }, [arrowheads]);

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Polyline ref={polylineRef} {...props} />;
};

export default ArrowheadsPolyline;
