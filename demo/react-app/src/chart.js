import React, { useEffect, useRef } from "react";
import Parcoords from "parcoord-es/dist/parcoords.esm";
import "parcoord-es/dist/parcoords.css";

const Chart = (props) => {
  const chartRef = useRef(null);
  useEffect(
    () => {
      if (chartRef !== null) {
        // use default config;
        const chart = Parcoords()(chartRef.current)
          .data([
            [0, -0, 0, 0, 0, 1],
            [1, -1, 1, 2, 1, 1],
            [2, -2, 4, 4, 0.5, 1],
            [3, -3, 9, 6, 0.33, 1],
            [4, -4, 16, 8, 0.25, 1],
          ])
          .render()
          .createAxes()
          .reorderable()
          .brushMode("1D-axes-multi");
      }
    },
    [chartRef]
  );

  return (
    <div
      ref={chartRef}
      id={"chart-id"}
      style={{ width: 600, height: 600 }}
      className={"parcoords"}
    />
  );
};

export default Chart;
