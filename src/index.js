import { select, selectAll } from 'd3-selection';
import { keys, entries } from 'd3-collection';
import { dispatch } from 'd3-dispatch';
import { ascending } from 'd3-array';
import { scalePoint } from 'd3-scale';
import { axisLeft } from 'd3-axis';

import './parallel-coordinates.css';
import renderQueue from './renderQueue';

import { _functor, _rebind, without } from './helper';
import InitialState from './initialState';
import install1DAxes from './brush/install1DAxes';
import install2DStrums from './brush/install2DStrums';
import installAngularBrush from './brush/installAngularBrush';
import intersection from './api/intersection';
import mergeParcoords from './api/mergeParcoords';
import selected from './api/selected';
import brushMode from './api/brushMode';
import updateAxes from './api/updateAxes';
import autoscale from './api/autoscale';
import brushable from './api/brushable';
import commonScale from './api/commonScale';
import computeClusterCentroids from './util/computeClusterCentroids';
import computeRealCentroids from './api/computeRealCentroids';
import getset from './util/getset';
import applyDimensionDefaults from './api/applyDimensionDefaults';
import createAxes from './api/createAxes';
import axisDots from './api/axisDots';
import colorPath from './util/colorPath';
import applyAxisConfig from './api/applyAxisConfig';
import reorderable from './api/reorderable';

import w from './util/width';
import h from './util/height';
import resize from './api/resize';
import reorder from './api/reorder';
import sortDimensions from './api/sortDimensions';
import sortDimensionsByRowData from './api/sortDimensionsByRowData';
//============================================================================================

const ParCoords = config => {
  const __ = Object.assign({}, InitialState, config);

  if (config && config.dimensionTitles) {
    console.warn(
      'dimensionTitles passed in config is deprecated. Add title to dimension object.'
    );
    entries(config.dimensionTitles).forEach(d => {
      if (__.dimensions[d.key]) {
        __.dimensions[d.key].title = __.dimensions[d.key].title
          ? __.dimensions[d.key].title
          : d.value;
      } else {
        __.dimensions[d.key] = {
          title: d.value,
        };
      }
    });
  }

  const eventTypes = [
    'render',
    'resize',
    'highlight',
    'brush',
    'brushend',
    'brushstart',
    'axesreorder',
  ].concat(keys(__));

  let events = dispatch.apply(this, eventTypes),
    flags = {
      brushable: false,
      reorderable: false,
      axes: false,
      interactive: false,
      debug: false,
    },
    xscale = scalePoint(),
    dragging = {},
    axis = axisLeft().ticks(5),
    ctx = {},
    canvas = {};

  const pc = function(selection) {
    selection = pc.selection = select(selection);

    __.width = selection.node().clientWidth;
    __.height = selection.node().clientHeight;
    // canvas data layers
    ['marks', 'foreground', 'brushed', 'highlight'].forEach(function(layer) {
      canvas[layer] = selection
        .append('canvas')
        .attr('class', layer)
        .node();
      ctx[layer] = canvas[layer].getContext('2d');
    });

    // svg tick and brush layers
    pc.svg = selection
      .append('svg')
      .attr('width', __.width)
      .attr('height', __.height)
      .style('font', '14px sans-serif')
      .style('position', 'absolute')

      .append('svg:g')
      .attr(
        'transform',
        'translate(' + __.margin.left + ',' + __.margin.top + ')'
      );

    return pc;
  };

  // side effects for setters
  const side_effects = dispatch
    .apply(this, keys(__))
    .on('composite', function(d) {
      ctx.foreground.globalCompositeOperation = d.value;
      ctx.brushed.globalCompositeOperation = d.value;
    })
    .on('alpha', function(d) {
      ctx.foreground.globalAlpha = d.value;
      ctx.brushed.globalAlpha = d.value;
    })
    .on('brushedColor', function(d) {
      ctx.brushed.strokeStyle = d.value;
    })
    .on('width', function(d) {
      pc.resize();
    })
    .on('height', function(d) {
      pc.resize();
    })
    .on('margin', function(d) {
      pc.resize();
    })
    .on('rate', function(d) {
      brushedQueue.rate(d.value);
      foregroundQueue.rate(d.value);
    })
    .on('dimensions', function(d) {
      __.dimensions = pc.applyDimensionDefaults(keys(d.value));
      xscale.domain(pc.getOrderedDimensionKeys());
      pc.sortDimensions();
      if (flags.interactive) {
        pc.render().updateAxes();
      }
    })
    .on('bundleDimension', function(d) {
      if (!keys(__.dimensions).length) pc.detectDimensions();
      pc.autoscale();
      if (typeof d.value === 'number') {
        if (d.value < keys(__.dimensions).length) {
          __.bundleDimension = __.dimensions[d.value];
        } else if (d.value < __.hideAxis.length) {
          __.bundleDimension = __.hideAxis[d.value];
        }
      } else {
        __.bundleDimension = d.value;
      }

      __.clusterCentroids = computeClusterCentroids(__, __.bundleDimension);
      if (flags.interactive) {
        pc.render();
      }
    })
    .on('hideAxis', function(d) {
      pc.dimensions(pc.applyDimensionDefaults());
      pc.dimensions(without(__.dimensions, d.value));
    })
    .on('flipAxes', function(d) {
      if (d.value && d.value.length) {
        d.value.forEach(function(axis) {
          flipAxisAndUpdatePCP(__, pc, axis);
        });
        pc.updateAxes(0);
      }
    });

  // expose the state of the chart
  pc.state = __;
  pc.flags = flags;

  // create getter/setters
  getset(pc, __, events, side_effects);

  // expose events
  _rebind(pc, events, 'on');

  // getter/setter with event firing

  pc.autoscale = autoscale(__, pc, xscale, ctx);

  pc.scale = function(d, domain) {
    __.dimensions[d].yscale.domain(domain);

    return this;
  };

  pc.flip = function(d) {
    //__.dimensions[d].yscale.domain().reverse();                               // does not work
    __.dimensions[d].yscale.domain(__.dimensions[d].yscale.domain().reverse()); // works

    return this;
  };

  pc.commonScale = commonScale(__, pc);
  pc.detectDimensions = function() {
    pc.dimensions(pc.applyDimensionDefaults());
    return this;
  };

  pc.applyDimensionDefaults = applyDimensionDefaults(__, pc);

  pc.getOrderedDimensionKeys = function() {
    return keys(__.dimensions).sort(function(x, y) {
      return ascending(__.dimensions[x].index, __.dimensions[y].index);
    });
  };

  // a better "typeof" from this post: http://stackoverflow.com/questions/7390426/better-way-to-get-type-of-a-javascript-variable
  pc.toType = function(v) {
    return {}.toString
      .call(v)
      .match(/\s([a-zA-Z]+)/)[1]
      .toLowerCase();
  };

  // try to coerce to number before returning type
  pc.toTypeCoerceNumbers = function(v) {
    if (parseFloat(v) == v && v != null) {
      return 'number';
    }
    return pc.toType(v);
  };

  // attempt to determine types of each dimension based on first row of data
  pc.detectDimensionTypes = function(data) {
    let types = {};
    keys(data[0]).forEach(function(col) {
      types[isNaN(Number(col)) ? col : parseInt(col)] = pc.toTypeCoerceNumbers(
        data[0][col]
      );
    });
    return types;
  };

  pc.render = function() {
    // try to autodetect dimensions and create scales
    if (!keys(__.dimensions).length) {
      pc.detectDimensions();
    }
    pc.autoscale();

    pc.render[__.mode]();

    events.call('render', this);
    return this;
  };

  pc.renderBrushed = function() {
    if (!keys(__.dimensions).length) pc.detectDimensions();

    pc.renderBrushed[__.mode]();
    events.call('render', this);
    return this;
  };

  function isBrushed() {
    if (__.brushed && __.brushed.length !== __.data.length) return true;

    let object = brush.currentMode().brushState();

    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        return true;
      }
    }
    return false;
  }

  pc.render.default = function() {
    pc.clear('foreground');
    pc.clear('highlight');

    pc.renderBrushed.default();

    __.data.forEach(path_foreground);
  };

  let foregroundQueue = renderQueue(path_foreground)
    .rate(50)
    .clear(function() {
      pc.clear('foreground');
      pc.clear('highlight');
    });

  pc.render.queue = function() {
    pc.renderBrushed.queue();

    foregroundQueue(__.data);
  };

  pc.renderBrushed.default = function() {
    pc.clear('brushed');

    if (isBrushed()) {
      __.brushed.forEach(path_brushed);
    }
  };

  let brushedQueue = renderQueue(path_brushed)
    .rate(50)
    .clear(function() {
      pc.clear('brushed');
    });

  pc.renderBrushed.queue = function() {
    if (isBrushed()) {
      brushedQueue(__.brushed);
    } else {
      brushedQueue([]); // This is needed to clear the currently brushed items
    }
  };

  pc.compute_real_centroids = computeRealCentroids(__.dimensions, position);

  pc.shadows = function() {
    flags.shadows = true;
    pc.alphaOnBrushed(0.1);
    pc.render();
    return this;
  };

  // draw dots with radius r on the axis line where data intersects
  pc.axisDots = axisDots(__, pc, position);

  function path_brushed(d, i) {
    if (__.brushedColor !== null) {
      ctx.brushed.strokeStyle = _functor(__.brushedColor)(d, i);
    } else {
      ctx.brushed.strokeStyle = _functor(__.color)(d, i);
    }
    return colorPath(__, position, d, ctx.brushed);
  }

  function path_foreground(d, i) {
    ctx.foreground.strokeStyle = _functor(__.color)(d, i);
    return colorPath(__, position, d, ctx.foreground);
  }

  function path_highlight(d, i) {
    ctx.highlight.strokeStyle = _functor(__.color)(d, i);
    return colorPath(__, position, d, ctx.highlight);
  }

  pc.clear = function(layer) {
    ctx[layer].clearRect(0, 0, w(__) + 2, h(__) + 2);

    // This will make sure that the foreground items are transparent
    // without the need for changing the opacity style of the foreground canvas
    // as this would stop the css styling from working
    if (layer === 'brushed' && isBrushed()) {
      ctx.brushed.fillStyle = pc.selection.style('background-color');
      ctx.brushed.globalAlpha = 1 - __.alphaOnBrushed;
      ctx.brushed.fillRect(0, 0, w(__) + 2, h(__) + 2);
      ctx.brushed.globalAlpha = __.alpha;
    }
    return this;
  };
  _rebind(
    pc,
    axis,
    'ticks',
    'orient',
    'tickValues',
    'tickSubdivide',
    'tickSize',
    'tickPadding',
    'tickFormat'
  );

  pc.createAxes = createAxes(__, pc, xscale, flags, axis);

  pc.removeAxes = function() {
    pc._g.remove();

    delete pc._g;
    return this;
  };

  pc.updateAxes = updateAxes(__, pc, position, axis, flags);
  pc.applyAxisConfig = applyAxisConfig;
  pc.brushable = brushable(__, pc, flags);

  pc.brush = function() {
    __.brushed = pc.selected();
    render.call('render');
  };

  pc.brushReset = brushReset(__);
  pc.selected = selected(__);
  pc.reorderable = reorderable(__, pc, xscale, position, dragging, flags);
  pc.reorder = reorder(__, pc, xscale);
  pc.sortDimensionsByRowData = sortDimensionsByRowData(__);
  pc.sortDimensions = sortDimensions(__, position);

  // pairs of adjacent dimensions
  pc.adjacent_pairs = function(arr) {
    let ret = [];
    for (let i = 0; i < arr.length - 1; i++) {
      ret.push([arr[i], arr[i + 1]]);
    }
    return ret;
  };

  pc.interactive = function() {
    flags.interactive = true;
    return this;
  };

  // expose a few objects
  pc.xscale = xscale;
  pc.ctx = ctx;
  pc.canvas = canvas;
  pc.g = () => pc._g;

  pc.resize = resize(__, pc, flags, events);

  // highlight an array of data
  pc.highlight = function(data) {
    if (arguments.length === 0) {
      return __.highlighted;
    }

    __.highlighted = data;
    pc.clear('highlight');
    selectAll([canvas.foreground, canvas.brushed]).classed('faded', true);
    data.forEach(path_highlight);
    events.call('highlight', this, data);
    return this;
  };

  // clear highlighting
  pc.unhighlight = function() {
    __.highlighted = [];
    pc.clear('highlight');
    selectAll([canvas.foreground, canvas.brushed]).classed('faded', false);
    return this;
  };

  // calculate 2d intersection of line a->b with line c->d
  // points are objects with x and y properties
  pc.intersection = intersection;

  function position(d) {
    if (xscale.range().length === 0) {
      xscale.range([0, w(__)], 1);
    }
    let v = dragging[d];
    return v == null ? xscale(d) : v;
  }

  // Merges the canvases and SVG elements into one canvas element which is then passed into the callback
  // (so you can choose to save it to disk, etc.)
  pc.mergeParcoords = mergeParcoords(pc);

  const brush = {
    modes: {
      None: {
        install: function(pc) {}, // Nothing to be done.
        uninstall: function(pc) {}, // Nothing to be done.
        selected: function() {
          return [];
        }, // Nothing to return
        brushState: function() {
          return {};
        },
      },
    },
    mode: 'None',
    predicate: 'AND',
    currentMode: function() {
      return this.modes[this.mode];
    },
  };

  pc.brushModes = function() {
    return Object.getOwnPropertyNames(brush.modes);
  };

  pc.brushMode = brushMode(brush, __, pc);

  install1DAxes(brush, __, pc, events);
  install2DStrums(brush, __, pc, events, xscale);
  installAngularBrush(brush, __, pc, events, xscale);

  pc.version = '1.0.3';
  // this descriptive text should live with other introspective methods
  pc.toString = function() {
    return (
      'Parallel Coordinates: ' +
      keys(__.dimensions).length +
      ' dimensions (' +
      keys(__.data[0]).length +
      ' total) , ' +
      __.data.length +
      ' rows'
    );
  };

  return pc;
};

export default ParCoords;
