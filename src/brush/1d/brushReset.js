import { select } from 'd3-selection';

const brushReset = (state, config, pc) => dimension => {
  const { brushes } = state;

  if (dimension === undefined) {
    config.brushed = false;
    if (pc.g() !== undefined && pc.g() !== null) {
      pc.g()
        .selectAll('.brush')
        .each(function(d) {
          if (brushes[d] !== undefined) {
            select(this).call(brushes[d].move, null);
          }
        });
      pc.renderBrushed();
    }
  } else {
    config.brushed = false;
    if (pc.g() !== undefined && pc.g() !== null) {
      pc.g()
        .selectAll('.brush')
        .each(function(d) {
          if (d !== dimension) return;
          select(this).call(brushes[d].move, null);
          if (typeof brushes[d].type === 'function') {
            brushes[d].event(select(this));
          }
        });
      pc.renderBrushed();
    }
  }
  return this;
};

export default brushReset;
