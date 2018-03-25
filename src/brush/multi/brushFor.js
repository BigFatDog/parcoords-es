import { event } from 'd3-selection';

import selected from './selected';

const brushUpdated = (config, pc, events) => newSelection => {
  config.brushed = newSelection;
  events.call('brush', pc, config.brushed);
  pc.renderBrushed();
};

const brushFor = (state, config, pc, events) => axis => {
  const brush = multibBrush();

  brush
    .y(config.dimensions[axis].yscale)
    .on('brushstart', function() {
      if (event.sourceEvent !== null) {
        events.brushstart.call(pc, config.brushed);
        event.sourceEvent.stopPropagation();
      }
    })
    .on('brush', function() {
      brushUpdated(selected());
    })
    .on('brushend', function() {
      // d3.svg.multibrush clears extents just before calling 'brushend'
      // so we have to update here again.
      // This fixes issue #103 for now, but should be changed in d3.svg.multibrush
      // to avoid unnecessary computation.
      brushUpdated(selected());
      events.brushend.call(pc, config.brushed);
    })
    .extentAdaption(selection => {
      selection
        .style('visibility', null)
        .attr('x', -15)
        .attr('width', 30)
        .style('fill', 'rgba(255,255,255,0.25)')
        .style('stroke', 'rgba(0,0,0,0.6)');
    })
    .resizeAdaption(selection => {
      selection
        .selectAll('rect')
        .attr('x', -15)
        .attr('width', 30)
        .style('visibility', null)
        .style('fill', 'rgba(0,0,0,0.1)');
    });

  state.brushes[axis] = brush;
  return brush;
};

export default brushFor;
