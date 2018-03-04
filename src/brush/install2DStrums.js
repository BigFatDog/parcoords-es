// brush mode: 2D-strums
// bl.ocks.org/syntagmatic/5441022
import { keys } from 'd3-collection';
import { drag } from 'd3-drag';
import { event, mouse, select } from 'd3-selection';

import w from '../util/width';
import h from '../util/height';

const install2DStrums = (brushGroup, config, pc, events, xscale) => {
  let strums = {},
    strumRect;

  let g;

  function drawStrum(strum, activePoint) {
    let _svg = pc.selection.select('svg').select('g#strums'),
      id = strum.dims.i,
      points = [strum.p1, strum.p2],
      _line = _svg.selectAll('line#strum-' + id).data([strum]),
      circles = _svg.selectAll('circle#strum-' + id).data(points),
      _drag = drag();

    _line
      .enter()
      .append('line')
      .attr('id', 'strum-' + id)
      .attr('class', 'strum');

    _line
      .attr('x1', function(d) {
        return d.p1[0];
      })
      .attr('y1', function(d) {
        return d.p1[1];
      })
      .attr('x2', function(d) {
        return d.p2[0];
      })
      .attr('y2', function(d) {
        return d.p2[1];
      })
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    _drag
      .on('drag', function(d, i) {
        let ev = event;
        i = i + 1;
        strum['p' + i][0] = Math.min(
          Math.max(strum.minX + 1, ev.x),
          strum.maxX
        );
        strum['p' + i][1] = Math.min(Math.max(strum.minY, ev.y), strum.maxY);
        drawStrum(strum, i - 1);
      })
      .on('end', onDragEnd());

    circles
      .enter()
      .append('circle')
      .attr('id', 'strum-' + id)
      .attr('class', 'strum');

    circles
      .attr('cx', function(d) {
        return d[0];
      })
      .attr('cy', function(d) {
        return d[1];
      })
      .attr('r', 5)
      .style('opacity', function(d, i) {
        return activePoint !== undefined && i === activePoint ? 0.8 : 0;
      })
      .on('mouseover', function() {
        select(this).style('opacity', 0.8);
      })
      .on('mouseout', function() {
        select(this).style('opacity', 0);
      })
      .call(_drag);
  }

  function dimensionsForPoint(p) {
    let dims = { i: -1, left: undefined, right: undefined };
    keys(config.dimensions).some(function(dim, i) {
      if (xscale(dim) < p[0]) {
        let next = keys(config.dimensions)[
          pc.getOrderedDimensionKeys().indexOf(dim) + 1
        ];
        dims.i = i;
        dims.left = dim;
        dims.right = next;
        return false;
      }
      return true;
    });

    if (dims.left === undefined) {
      // Event on the left side of the first axis.
      dims.i = 0;
      dims.left = pc.getOrderedDimensionKeys()[0];
      dims.right = pc.getOrderedDimensionKeys()[1];
    } else if (dims.right === undefined) {
      // Event on the right side of the last axis
      dims.i = keys(config.dimensions).length - 1;
      dims.right = dims.left;
      dims.left = pc.getOrderedDimensionKeys()[
        keys(config.dimensions).length - 2
      ];
    }

    return dims;
  }

  function onDragStart() {
    // First we need to determine between which two axes the sturm was started.
    // This will determine the freedom of movement, because a strum can
    // logically only happen between two axes, so no movement outside these axes
    // should be allowed.
    return function() {
      let p = mouse(strumRect.node()),
        dims,
        strum;

      p[0] = p[0] - config.margin.left;
      p[1] = p[1] - config.margin.top;

      (dims = dimensionsForPoint(p)),
        (strum = {
          p1: p,
          dims: dims,
          minX: xscale(dims.left),
          maxX: xscale(dims.right),
          minY: 0,
          maxY: h(config),
        });

      strums[dims.i] = strum;
      strums.active = dims.i;

      // Make sure that the point is within the bounds
      strum.p1[0] = Math.min(Math.max(strum.minX, p[0]), strum.maxX);
      strum.p2 = strum.p1.slice();
    };
  }

  function onDrag() {
    return function() {
      let ev = event,
        strum = strums[strums.active];

      // Make sure that the point is within the bounds
      strum.p2[0] = Math.min(
        Math.max(strum.minX + 1, ev.x - config.margin.left),
        strum.maxX
      );
      strum.p2[1] = Math.min(
        Math.max(strum.minY, ev.y - config.margin.top),
        strum.maxY
      );
      drawStrum(strum, 1);
    };
  }

  function containmentTest(strum, width) {
    let p1 = [strum.p1[0] - strum.minX, strum.p1[1] - strum.minX],
      p2 = [strum.p2[0] - strum.minX, strum.p2[1] - strum.minX],
      m1 = 1 - width / p1[0],
      b1 = p1[1] * (1 - m1),
      m2 = 1 - width / p2[0],
      b2 = p2[1] * (1 - m2);

    // test if point falls between lines
    return function(p) {
      let x = p[0],
        y = p[1],
        y1 = m1 * x + b1,
        y2 = m2 * x + b2;

      if (y > Math.min(y1, y2) && y < Math.max(y1, y2)) {
        return true;
      }

      return false;
    };
  }

  function selected() {
    let ids = Object.getOwnPropertyNames(strums),
      brushed = config.data;

    // Get the ids of the currently active strums.
    ids = ids.filter(function(d) {
      return !isNaN(d);
    });

    function crossesStrum(d, id) {
      let strum = strums[id],
        test = containmentTest(strum, strums.width(id)),
        d1 = strum.dims.left,
        d2 = strum.dims.right,
        y1 = config.dimensions[d1].yscale,
        y2 = config.dimensions[d2].yscale,
        point = [y1(d[d1]) - strum.minX, y2(d[d2]) - strum.minX];
      return test(point);
    }

    if (ids.length === 0) {
      return brushed;
    }

    return brushed.filter(function(d) {
      switch (brushGroup.predicate) {
        case 'AND':
          return ids.every(function(id) {
            return crossesStrum(d, id);
          });
        case 'OR':
          return ids.some(function(id) {
            return crossesStrum(d, id);
          });
        default:
          throw new Error('Unknown brush predicate ' + config.brushPredicate);
      }
    });
  }

  function removeStrum() {
    let strum = strums[strums.active],
      svg = pc.selection.select('svg').select('g#strums');

    delete strums[strums.active];
    strums.active = undefined;
    svg.selectAll('line#strum-' + strum.dims.i).remove();
    svg.selectAll('circle#strum-' + strum.dims.i).remove();
  }

  function onDragEnd() {
    return function() {
      let brushed = config.data,
        strum = strums[strums.active];

      // Okay, somewhat unexpected, but not totally unsurprising, a mousclick is
      // considered a drag without move. So we have to deal with that case
      if (strum && strum.p1[0] === strum.p2[0] && strum.p1[1] === strum.p2[1]) {
        removeStrum(strums);
      }

      brushed = selected(strums);
      strums.active = undefined;
      config.brushed = brushed;
      pc.renderBrushed();
      events.call('brushend', pc, config.brushed);
    };
  }

  function brushReset(strums) {
    return function() {
      let ids = Object.getOwnPropertyNames(strums).filter(function(d) {
        return !isNaN(d);
      });

      ids.forEach(function(d) {
        strums.active = d;
        removeStrum(strums);
      });
      onDragEnd(strums)();
    };
  }

  function install() {
    if (!g) g = pc.createAxes().g();

    let _drag = drag();

    // Map of current strums. Strums are stored per segment of the PC. A segment,
    // being the area between two axes. The left most area is indexed at 0.
    strums.active = undefined;
    // Returns the width of the PC segment where currently a strum is being
    // placed. NOTE: even though they are evenly spaced in our current
    // implementation, we keep for when non-even spaced segments are supported as
    // well.
    strums.width = function(id) {
      let strum = strums[id];

      if (strum === undefined) {
        return undefined;
      }

      return strum.maxX - strum.minX;
    };

    pc.on('axesreorder.strums', function() {
      let ids = Object.getOwnPropertyNames(strums).filter(function(d) {
        return !isNaN(d);
      });

      // Checks if the first dimension is directly left of the second dimension.
      function consecutive(first, second) {
        let length = keys(config.dimensions).length;
        return keys(config.dimensions).some(function(d, i) {
          return d === first
            ? i + i < length && config.dimensions[i + 1] === second
            : false;
        });
      }

      if (ids.length > 0) {
        // We have some strums, which might need to be removed.
        ids.forEach(function(d) {
          let dims = strums[d].dims;
          strums.active = d;
          // If the two dimensions of the current strum are not next to each other
          // any more, than we'll need to remove the strum. Otherwise we keep it.
          if (!consecutive(dims.left, dims.right)) {
            removeStrum(strums);
          }
        });
        onDragEnd(strums)();
      }
    });

    // Add a new svg group in which we draw the strums.
    pc.selection
      .select('svg')
      .append('g')
      .attr('id', 'strums')
      .attr(
        'transform',
        'translate(' + config.margin.left + ',' + config.margin.top + ')'
      );

    // Install the required brushReset function
    pc.brushReset = brushReset(strums);

    _drag
      .on('start', onDragStart(strums))
      .on('drag', onDrag(strums))
      .on('end', onDragEnd(strums));

    // NOTE: The styling needs to be done here and not in the css. This is because
    //       for 1D brushing, the canvas layers should not listen to
    //       pointer-events._.
    strumRect = pc.selection
      .select('svg')
      .insert('rect', 'g#strums')
      .attr('id', 'strum-events')
      .attr('x', config.margin.left)
      .attr('y', config.margin.top)
      .attr('width', w(config))
      .attr('height', h(config) + 2)
      .style('opacity', 0)
      .call(_drag);
  }

  brushGroup.modes['2D-strums'] = {
    install: install,
    uninstall: function() {
      pc.selection
        .select('svg')
        .select('g#strums')
        .remove();
      pc.selection
        .select('svg')
        .select('rect#strum-events')
        .remove();
      pc.on('axesreorder.strums', undefined);
      delete pc.brushReset;

      strumRect = undefined;
    },
    selected: selected,
    brushState: function() {
      return strums;
    },
  };
};

export default install2DStrums;
