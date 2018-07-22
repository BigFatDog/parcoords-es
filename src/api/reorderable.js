import { drag } from 'd3-drag';
import { event, select } from 'd3-selection';

import w from '../util/width';

// Jason Davies, http://bl.ocks.org/1341281
const reorderable = (config, pc, xscale, position, dragging, flags) =>
  function() {
    if (pc.g() === undefined) pc.createAxes();
    const g = pc.g();

    g.style('cursor', 'move').call(
      drag()
        .on('start', function(d) {
          dragging[d] = this.__origin__ = xscale(d);
        })
        .on('drag', function(d) {
          dragging[d] = Math.min(
            w(config),
            Math.max(0, (this.__origin__ += event.dx))
          );
          pc.sortDimensions();
          xscale.domain(pc.getOrderedDimensionKeys());
          pc.render();
          g.attr('transform', d => 'translate(' + position(d) + ')');
        })
        .on('end', function(d) {
          delete this.__origin__;
          delete dragging[d];
          select(this)
            .transition()
            .attr('transform', 'translate(' + xscale(d) + ')');
          pc.render();
          pc.renderMarked();
        })
    );
    flags.reorderable = true;
    return this;
  };

export default reorderable;
