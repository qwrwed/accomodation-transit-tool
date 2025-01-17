import React, { useRef, useEffect } from "react";
import { Polyline, PolylineProps } from "react-leaflet";
import "leaflet-arrowheads";

interface ArrowheadsPolylineProps extends PolylineProps {
  arrowheads: boolean;
}

const ArrowheadsPolyline: React.FC<ArrowheadsPolylineProps> = ({
  arrowheads,
  ...props
}) => {
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (arrowheads && polyline) {
      polyline.arrowheads({});
      // // eslint-disable-next-line no-underscore-dangle
      // polyline._update();
    }

    return () => {
      if (arrowheads && polyline) {
        // polyline.deleteArrowheads();
        polyline.remove();
      }
    };
  }, [arrowheads]);

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Polyline ref={polylineRef} {...props} />;
};

export default ArrowheadsPolyline;
