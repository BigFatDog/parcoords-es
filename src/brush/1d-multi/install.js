import { select } from 'd3-selection';
import brushExtents from './brushExtents';
import brushReset from './brushReset';
import brushFor from './brushFor';

const install = (state, config, pc, events, brushGroup) => () => {
  if (!pc.g()) {
    pc.createAxes();
  }

  pc
    .g()
    .append('svg:g')
    .attr('class', 'brush')
    .each(function(d) {
      brushFor(state, config, pc, events, brushGroup)(d, select(this));
    });

  pc.brushExtents = brushExtents(state, config, pc);
  pc.brushReset = brushReset(state, config, pc);
  return pc;
};

export default install;
