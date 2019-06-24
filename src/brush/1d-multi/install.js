import { select } from 'd3-selection';
import brushExtents from './brushExtents';
import brushReset from './brushReset';
import brushFor from './brushFor';

const install = (state, config, pc, events, brushGroup) => () => {
  if (!pc.g()) {
    pc.createAxes();
  }

  const hiddenAxes = pc.hideAxis();

  pc.g()
    .append('svg:g')
    .attr('id', (d, i) => 'brush-group-' + i)
    .attr('class', 'brush-group')
    .attr('dimension', d => d)
    .each(function(d) {
      if (!hiddenAxes.includes(d)) {
        brushFor(state, config, pc, events, brushGroup)(d, select(this));
      }
    });

  pc.brushExtents = brushExtents(state, config, pc, events, brushGroup);
  pc.brushReset = brushReset(state, config, pc);
  return pc;
};

export default install;
