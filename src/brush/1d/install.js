import { select } from 'd3-selection';
import brushExtents from './brushExtents';
import brushReset from './brushReset';
import brushFor from './brushFor';

const install = (state, config, pc, events, brushGroup) => () => {
  if (!pc.g()) {
    pc.createAxes();
  }

  // Add and store a brush for each axis.
  const brush = pc
    .g()
    .append('svg:g')
    .attr('class', 'brush')
    .each(function(d) {
      select(this).call(
        brushFor(state, config, pc, events, brushGroup)(d, select(this))
      );
    });
  brush
    .selectAll('rect')
    .style('visibility', null)
    .attr('x', -15)
    .attr('width', 30);

  brush.selectAll('rect.background').style('fill', 'transparent');

  brush
    .selectAll('rect.extent')
    .style('fill', 'rgba(255,255,255,0.25)')
    .style('stroke', 'rgba(0,0,0,0.6)');

  brush.selectAll('.resize rect').style('fill', 'rgba(0,0,0,0.1)');

  pc.brushExtents = brushExtents(state, config, pc);
  pc.brushReset = brushReset(state, config, pc);
  return pc;
};

export default install;
