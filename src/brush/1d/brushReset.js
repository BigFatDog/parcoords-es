import { select } from 'd3-selection';

const brushReset = (pc, g) => dimension => {
  if (dimension === undefined) {
    config.brushed = false;
    if (g) {
      g.selectAll('.brush').each(function(d) {
        select(this).call(brushes[d].move, null);
      });
      pc.renderBrushed();
    }
  } else {
    if (g) {
      g.selectAll('.brush').each(function(d) {
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
