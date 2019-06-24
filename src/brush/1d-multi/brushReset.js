import { select } from 'd3-selection';
import { brushSelection } from 'd3-brush';

const brushReset = (state, config, pc) => dimension => {
  const { brushes } = state;

  if (dimension === undefined) {
    if (pc.g() !== undefined && pc.g() !== null) {
      Object.keys(config.dimensions).forEach((d, pos) => {
        const axisBrush = brushes[d];

        // hidden axes will be undefined
        if (axisBrush) {
          axisBrush.forEach((e, i) => {
            const brush = document.getElementById('brush-' + pos + '-' + i);
            if (brush && brushSelection(brush) !== null) {
              pc.g()
                .select('#brush-' + pos + '-' + i)
                .call(e.brush.move, null);
            }
          });
        }
      });

      pc.renderBrushed();
    }
  } else {
    if (pc.g() !== undefined && pc.g() !== null) {
      const axisBrush = brushes[dimension];
      const pos = Object.keys(config.dimensions).indexOf(dimension);

      if (axisBrush) {
        axisBrush.forEach((e, i) => {
          const brush = document.getElementById('brush-' + pos + '-' + i);
          if (brushSelection(brush) !== null) {
            pc.g()
              .select('#brush-' + pos + '-' + i)
              .call(e.brush.move, null);

            if (typeof e.event === 'function') {
              e.event(select('#brush-' + pos + '-' + i));
            }
          }
        });
      }

      pc.renderBrushed();
    }
  }
  return this;
};

export default brushReset;
