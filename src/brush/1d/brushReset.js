import { select } from 'd3-selection';

const brushReset = (state, config, pc) => dimension => {
  const { brushes } = state;

  if (dimension === undefined) {
    config.brushed = false;
    if (pc.g() !== undefined && pc.g() !== null) {
      pc
        .g()
        .selectAll('.brush')
        .each(function(d) {
          select(this).call(brushes[d].move, null);
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
