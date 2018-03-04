// brush mode: 1D-Axes
import { keys } from 'd3-collection';
import { brushSelection, brushY } from 'd3-brush';
import { event, select } from 'd3-selection';

import selected from './selected';

const install1DAxes = (config, pc, g) => {
  let brushes = {};
  let brushNodes = {};

  const brushExtents = (pc, g) => extents => {
    if (typeof extents === 'undefined') {
      let extents = {};
      keys(config.dimensions).forEach(d => {
        const brush = brushes[d];
        //todo: brush check
        if (brush !== undefined && brushSelection(brushNodes[d]) !== null) {
          extents[d] = brush.extent();
        }
      });
      return extents;
    } else {
      //first get all the brush selections
      const brushSelections = {};
      g.selectAll('.brush').each(function(d) {
        brushSelections[d] = select(this);
      });

      // loop over each dimension and update appropriately (if it was passed in through extents)
      keys(config.dimensions).forEach(function(d) {
        if (extents[d] === undefined) {
          return;
        }

        let brush = brushes[d];
        if (brush !== undefined) {
          //update the extent
          brush.extent(extents[d]);

          //redraw the brush
          brushSelections[d]
            .transition()
            .duration(0)
            .call(brush);

          //fire some events
          brush.event(brushSelections[d]);
        }
      });

      //redraw the chart
      pc.renderBrushed();

      return pc;
    }
  };

  function brushFor(axis, _selector) {
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
  }

  function brushReset(dimension, pc, g) {
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
  }

  function install(pc, g) {
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
  }

  brush.modes['1D-axes'] = {
    install: install,
    uninstall: function() {
      g.selectAll('.brush').remove();
      brushes = {};
      delete pc.brushExtents;
      delete pc.brushReset;
    },
    selected: selected,
    brushState: brushExtents,
  };
};
