import { select } from 'd3-selection';
import {brushSelection} from "d3-brush";

const brushReset = (state, config, pc) => dimension => {
  const { brushes } = state;

  console.log('------')
  if (dimension === undefined) {
    config.brushed = false;
    if (pc.g() !== undefined && pc.g() !== null) {
      Object.keys(config.dimensions).forEach(d=> {
          const axisBrush = brushes[d];

          axisBrush.forEach((e ,i) => {
              const brush = document.getElementById('brush-' + d.split(' ').join('_') + '-' + i);
              if (brushSelection(brush) !== null) {
                  pc.g().select('#brush-' + d.split(' ').join('_') + '-' + i).call(e.brush.move, null);

              }
          })
      });

      pc.renderBrushed();
    }
  } else {
    if (pc.g() !== undefined && pc.g() !== null) {
      pc
        .g()
        .selectAll('.brush')
        .each(function(d) {
          if (d != dimension) return;
          select(this).call(brushes[d].move, null);
          brushes[d].event(select(this));
        });
      pc.renderBrushed();
    }
  }
  return this;
};

export default brushReset;
