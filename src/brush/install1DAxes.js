// brush mode: 1D-Axes
import { keys } from 'd3-collection';
import { brushSelection, brushY } from 'd3-brush';
import { event, select } from 'd3-selection';

// This function can be used for 'live' updates of brushes. That is, during the
// specification of a brush, this method can be called to update the view.
//
// @param newSelection - The new set of data items that is currently contained
//                       by the brushes
const brushUpdated = (config, pc, events) => newSelection => {
  config.brushed = newSelection;
  events.call('brush', pc, config.brushed);
  pc.renderBrushed();
};

const install1DAxes = (brushGroup, config, pc, events) => {
  let brushes = {};
  let brushNodes = {};
  let g = null;

  //https://github.com/d3/d3-brush/issues/10
  function is_brushed(p) {
    return brushSelection(brushNodes[p]) !== null;
  }

  // data within extents
  function selected() {
    let actives = keys(config.dimensions).filter(is_brushed),
      extents = actives.map(function(p) {
        const _brushRange = brushSelection(brushNodes[p]);

        if (typeof config.dimensions[p].yscale.invert === 'function') {
          return [
            config.dimensions[p].yscale.invert(_brushRange[1]),
            config.dimensions[p].yscale.invert(_brushRange[0]),
          ];
        } else {
          return _brushRange;
        }
      });
    // We don't want to return the full data set when there are no axes brushed.
    // Actually, when there are no axes brushed, by definition, no items are
    // selected. So, let's avoid the filtering and just return false.
    //if (actives.length === 0) return false;

    // Resolves broken examples for now. They expect to get the full dataset back from empty brushes
    if (actives.length === 0) return config.data;

    // test if within range
    let within = {
      date: function(d, p, dimension) {
        if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
          // if it is ordinal
          return (
            extents[dimension][0] <= config.dimensions[p].yscale(d[p]) &&
            config.dimensions[p].yscale(d[p]) <= extents[dimension][1]
          );
        } else {
          return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
        }
      },
      number: function(d, p, dimension) {
        if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
          // if it is ordinal
          return (
            extents[dimension][0] <= config.dimensions[p].yscale(d[p]) &&
            config.dimensions[p].yscale(d[p]) <= extents[dimension][1]
          );
        } else {
          return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
        }
      },
      string: function(d, p, dimension) {
        return (
          extents[dimension][0] <= config.dimensions[p].yscale(d[p]) &&
          config.dimensions[p].yscale(d[p]) <= extents[dimension][1]
        );
      },
    };

    return config.data.filter(function(d) {
      switch (brushGroup.predicate) {
        case 'AND':
          return actives.every(function(p, dimension) {
            return within[config.dimensions[p].type](d, p, dimension);
          });
        case 'OR':
          return actives.some(function(p, dimension) {
            return within[config.dimensions[p].type](d, p, dimension);
          });
        default:
          throw new Error('Unknown brush predicate ' + config.brushPredicate);
      }
    });
  }

  function brushExtents(extents) {
    if (typeof extents === 'undefined') {
      let extents = {};
      keys(config.dimensions).forEach(function(d) {
        let brush = brushes[d];
        //todo: brush check
        if (brush !== undefined && brushSelection(brushNodes[d]) !== null) {
          extents[d] = brush.extent();
        }
      });
      return extents;
    } else {
      //first get all the brush selections
      let brushSelections = {};
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
  }

  function brushFor(axis, _selector) {
    const brushRangeMax =
      config.dimensions[axis].type === 'string'
        ? config.dimensions[axis].yscale.range()[
            config.dimensions[axis].yscale.range().length - 1
          ]
        : config.dimensions[axis].yscale.range()[0];

    let _brush = brushY(_selector).extent([[-15, 0], [15, brushRangeMax]]);

    _brush
      .on('start', function() {
        if (event.sourceEvent !== null) {
          events.call('brushstart', pc, config.brushed);
          event.sourceEvent.stopPropagation();
        }
      })
      .on('brush', function() {
        brushUpdated(config, pc, events)(selected());
      })
      .on('end', function() {
        brushUpdated(config, pc, events)(selected());
        events.call('brushend', pc, config.brushed);
      });

    brushes[axis] = _brush;
    brushNodes[axis] = _selector.node();
    return _brush;
  }

  function brushReset(dimension) {
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

  function install() {
    if (!pc.g()) {
      pc.createAxes();
    }

    g = pc.g();

    // Add and store a brush for each axis.
    let brush = g
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

  brushGroup.modes['1D-axes'] = {
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

export default install1DAxes;
