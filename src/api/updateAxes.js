import { select } from 'd3-selection';

import dimensionLabels from '../util/dimensionLabels';
import flipAxisAndUpdatePCP from '../util/flipAxisAndUpdatePCP';
import rotateLabels from '../util/rotateLabels';

const updateAxes = (config, pc, position, axis, flags) => (
  animationTime = null
) => {
  if (animationTime === null) {
    animationTime = config.animationTime;
  }

  const g_data = pc.svg
    .selectAll('.dimension')
    .data(pc.getOrderedDimensionKeys());
  // Enter
  g_data
    .enter()
    .append('svg:g')
    .attr('class', 'dimension')
    .attr('transform', p => 'translate(' + position(p) + ')')
    .style('opacity', 0)
    .append('svg:g')
    .attr('class', 'axis')
    .attr('transform', 'translate(0,0)')
    .each(function(d) {
      const axisElement = select(this).call(
        pc.applyAxisConfig(axis, config.dimensions[d])
      );

      axisElement
        .selectAll('path')
        .style('fill', 'none')
        .style('stroke', '#222')
        .style('shape-rendering', 'crispEdges');

      axisElement
        .selectAll('line')
        .style('fill', 'none')
        .style('stroke', '#222')
        .style('shape-rendering', 'crispEdges');
    })
    .append('svg:text')
    .attr('text-anchor', 'middle')
    .attr('class', 'label')
    .attr('x', 0)
    .attr('y', 0)
    .attr(
      'transform',
      'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')'
    )
    .text(dimensionLabels(config))
    .on('dblclick', flipAxisAndUpdatePCP(config, pc, axis))
    .on('wheel', rotateLabels(config, pc));

  // Update
  g_data.attr('opacity', 0);
  g_data
    .select('.axis')
    .transition()
    .duration(animationTime)
    .each(function(d) {
      select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));
    });
  g_data
    .select('.label')
    .transition()
    .duration(animationTime)
    .text(dimensionLabels(config))
    .attr(
      'transform',
      'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')'
    );

  // Exit
  g_data.exit().remove();

  const g = pc.svg.selectAll('.dimension');
  g.transition()
    .duration(animationTime)
    .attr('transform', p => 'translate(' + position(p) + ')')
    .style('opacity', 1);

  pc.svg
    .selectAll('.axis')
    .transition()
    .duration(animationTime)
    .each(function(d) {
      select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));
    });

  if (flags.brushable) pc.brushable();
  if (flags.reorderable) pc.reorderable();
  if (pc.brushMode() !== 'None') {
    const mode = pc.brushMode();
    pc.brushMode('None');
    pc.brushMode(mode);
  }
  return this;
};

export default updateAxes;
