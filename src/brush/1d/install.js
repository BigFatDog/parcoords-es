import { event, select } from 'd3-selection';
import brushExtents from './brushExtents';
import brushReset from './brushReset';
import { brushY } from 'd3-brush';

const brushFor = config => (axis, _selector) => {
  const brushRangeMax =
    config.dimensions[axis].type === 'string'
      ? config.dimensions[axis].yscale.range()[
          config.dimensions[axis].yscale.range().length - 1
        ]
      : config.dimensions[axis].yscale.range()[0];

  const _brush = brushY(_selector).extent([[-15, 0], [15, brushRangeMax]]);

  _brush
    .on('start', function() {
      if (event.sourceEvent !== null) {
        events.call('brushstart', pc, config.brushed);
        event.sourceEvent.stopPropagation();
      }
    })
    .on('brush', function() {
      brushUpdated(selected());
    })
    .on('end', function() {
      brushUpdated(selected());
      events.call('brushend', pc, __.brushed);
    });

  brushes[axis] = _brush;
  brushNodes[axis] = _selector.node();
  return _brush;
};

const install = (pc, g) => {
  if (!g) pc.createAxes();
  // Add and store a brush for each axis.
  const brush = g
    .append('svg:g')
    .attr('class', 'brush')
    .each(function(d) {
      select(this).call(brushFor(d, select(this)));
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

  pc.brushExtents = brushExtents;
  pc.brushReset = brushReset;
  return pc;
};

export default install;
