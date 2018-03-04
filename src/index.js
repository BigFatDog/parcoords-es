import { select, selectAll, event } from 'd3-selection';
import { keys, entries } from 'd3-collection';
import { dispatch } from 'd3-dispatch';
import { ascending, min } from 'd3-array';
import { scalePoint } from 'd3-scale';
import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { drag } from 'd3-drag';

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
import computeCentroids from './util/computeCentroids';
import computeRealCentroids from './api/computeRealCentroids';
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
    w = () => __.width - __.margin.right - __.margin.left,
    h = () => __.height - __.margin.top - __.margin.bottom,
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
    g, // groups for axes, brushes
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
  let side_effects = dispatch
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
          flipAxisAndUpdatePCP(axis);
        });
        pc.updateAxes(0);
      }
    });

  // expose the state of the chart
  pc.state = __;
  pc.flags = flags;

  // create getter/setters
  getset(pc, __, events);

  // expose events
  _rebind(pc, events, 'on');

  // getter/setter with event firing
  function getset(obj, state, events) {
    keys(state).forEach(function(key) {
      obj[key] = function(x) {
        if (!arguments.length) {
          return state[key];
        }
        if (
          key === 'dimensions' &&
          Object.prototype.toString.call(x) === '[object Array]'
        ) {
          console.warn(
            'pc.dimensions([]) is deprecated, use pc.dimensions({})'
          );
          x = pc.applyDimensionDefaults(x);
        }
        let old = state[key];
        state[key] = x;
        side_effects.call(key, pc, { value: x, previous: old });
        events.call(key, pc, { value: x, previous: old });
        return obj;
      };
    });
  }

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

  pc.applyDimensionDefaults = function(dims) {
    let types = pc.detectDimensionTypes(__.data);
    dims = dims ? dims : keys(types);
    let newDims = {};
    let currIndex = 0;
    dims.forEach(function(k) {
      newDims[k] = __.dimensions[k] ? __.dimensions[k] : {};
      //Set up defaults
      newDims[k].orient = newDims[k].orient ? newDims[k].orient : 'left';
      newDims[k].ticks = newDims[k].ticks != null ? newDims[k].ticks : 5;
      newDims[k].innerTickSize =
        newDims[k].innerTickSize != null ? newDims[k].innerTickSize : 6;
      newDims[k].outerTickSize =
        newDims[k].outerTickSize != null ? newDims[k].outerTickSize : 0;
      newDims[k].tickPadding =
        newDims[k].tickPadding != null ? newDims[k].tickPadding : 3;
      newDims[k].type = newDims[k].type ? newDims[k].type : types[k];

      newDims[k].index =
        newDims[k].index != null ? newDims[k].index : currIndex;
      currIndex++;
    });
    return newDims;
  };

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
  pc.axisDots = function(_r) {
    let r = _r || 0.1;
    let ctx = pc.ctx.marks;
    let startAngle = 0;
    let endAngle = 2 * Math.PI;
    ctx.globalAlpha = min([1 / Math.pow(__.data.length, 1 / 2), 1]);
    __.data.forEach(function(d) {
      entries(__.dimensions).forEach(function(p, i) {
        ctx.beginPath();
        ctx.arc(
          position(p),
          __.dimensions[p.key].yscale(d[p]),
          r,
          startAngle,
          endAngle
        );
        ctx.stroke();
        ctx.fill();
      });
    });
    return this;
  };

  // draw single cubic bezier curve
  function single_curve(d, ctx) {
    let centroids = computeCentroids(__, position, d);
    let cps = computeControlPoints(__.smoothness, centroids);

    ctx.moveTo(cps[0].e(1), cps[0].e(2));
    for (let i = 1; i < cps.length; i += 3) {
      if (__.showControlPoints) {
        for (let j = 0; j < 3; j++) {
          ctx.fillRect(cps[i + j].e(1), cps[i + j].e(2), 2, 2);
        }
      }
      ctx.bezierCurveTo(
        cps[i].e(1),
        cps[i].e(2),
        cps[i + 1].e(1),
        cps[i + 1].e(2),
        cps[i + 2].e(1),
        cps[i + 2].e(2)
      );
    }
  }

  // draw single polyline
  function color_path(d, ctx) {
    ctx.beginPath();
    if (
      (__.bundleDimension !== null && __.bundlingStrength > 0) ||
      __.smoothness > 0
    ) {
      single_curve(d, ctx);
    } else {
      single_path(d, ctx);
    }
    ctx.stroke();
  }

  // returns the y-position just beyond the separating null value line
  function getNullPosition() {
    if (__.nullValueSeparator == 'bottom') {
      return h() + 1;
    } else if (__.nullValueSeparator == 'top') {
      return 1;
    } else {
      console.log(
        "A value is NULL, but nullValueSeparator is not set; set it to 'bottom' or 'top'."
      );
    }
    return h() + 1;
  }

  function single_path(d, ctx) {
    entries(__.dimensions).forEach(function(p, i) {
      //p isn't really p
      if (i == 0) {
        ctx.moveTo(
          position(p.key),
          typeof d[p.key] == 'undefined'
            ? getNullPosition()
            : __.dimensions[p.key].yscale(d[p.key])
        );
      } else {
        ctx.lineTo(
          position(p.key),
          typeof d[p.key] == 'undefined'
            ? getNullPosition()
            : __.dimensions[p.key].yscale(d[p.key])
        );
      }
    });
  }

  function path_brushed(d, i) {
    if (__.brushedColor !== null) {
      ctx.brushed.strokeStyle = _functor(__.brushedColor)(d, i);
    } else {
      ctx.brushed.strokeStyle = _functor(__.color)(d, i);
    }
    return color_path(d, ctx.brushed);
  }

  function path_foreground(d, i) {
    ctx.foreground.strokeStyle = _functor(__.color)(d, i);
    return color_path(d, ctx.foreground);
  }

  function path_highlight(d, i) {
    ctx.highlight.strokeStyle = _functor(__.color)(d, i);
    return color_path(d, ctx.highlight);
  }

  pc.clear = function(layer) {
    ctx[layer].clearRect(0, 0, w() + 2, h() + 2);

    // This will make sure that the foreground items are transparent
    // without the need for changing the opacity style of the foreground canvas
    // as this would stop the css styling from working
    if (layer === 'brushed' && isBrushed()) {
      ctx.brushed.fillStyle = pc.selection.style('background-color');
      ctx.brushed.globalAlpha = 1 - __.alphaOnBrushed;
      ctx.brushed.fillRect(0, 0, w() + 2, h() + 2);
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

  function flipAxisAndUpdatePCP(dimension) {
    let g = pc.svg.selectAll('.dimension');
    pc.flip(dimension);
    pc.brushReset(dimension);
    select(this.parentElement)
      .transition()
      .duration(__.animationTime)
      .call(axis.scale(__.dimensions[dimension].yscale));
    pc.render();
  }

  function rotateLabels() {
    if (!__.rotateLabels) return;

    let delta = event.deltaY;
    delta = delta < 0 ? -5 : delta;
    delta = delta > 0 ? 5 : delta;

    __.dimensionTitleRotation += delta;
    pc.svg
      .selectAll('text.label')
      .attr(
        'transform',
        'translate(0,-5) rotate(' + __.dimensionTitleRotation + ')'
      );
    event.preventDefault();
  }

  function dimensionLabels(d) {
    return __.dimensions[d].title ? __.dimensions[d].title : d; // dimension display names
  }

  pc.createAxes = function() {
    if (g) pc.removeAxes();
    // Add a group element for each dimension.
    g = pc.svg
      .selectAll('.dimension')
      .data(pc.getOrderedDimensionKeys(), function(d) {
        return d;
      })
      .enter()
      .append('svg:g')
      .attr('class', 'dimension')
      .attr('transform', function(d) {
        return 'translate(' + xscale(d) + ')';
      });
    // Add an axis and title.
    g
      .append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(0,0)')
      .each(function(d) {
        let axisElement = select(this).call(
          pc.applyAxisConfig(axis, __.dimensions[d])
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
      .attr('y', 0)
      .attr(
        'transform',
        'translate(0,-5) rotate(' + __.dimensionTitleRotation + ')'
      )
      .attr('x', 0)
      .attr('class', 'label')
      .text(dimensionLabels)
      .on('dblclick', flipAxisAndUpdatePCP)
      .on('wheel', rotateLabels);

    if (__.nullValueSeparator == 'top') {
      pc.svg
        .append('line')
        .attr('x1', 0)
        .attr('y1', 1 + __.nullValueSeparatorPadding.top)
        .attr('x2', w())
        .attr('y2', 1 + __.nullValueSeparatorPadding.top)
        .attr('stroke-width', 1)
        .attr('stroke', '#777')
        .attr('fill', 'none')
        .attr('shape-rendering', 'crispEdges');
    } else if (__.nullValueSeparator == 'bottom') {
      pc.svg
        .append('line')
        .attr('x1', 0)
        .attr('y1', h() + 1 - __.nullValueSeparatorPadding.bottom)
        .attr('x2', w())
        .attr('y2', h() + 1 - __.nullValueSeparatorPadding.bottom)
        .attr('stroke-width', 1)
        .attr('stroke', '#777')
        .attr('fill', 'none')
        .attr('shape-rendering', 'crispEdges');
    }

    flags.axes = true;
    return this;
  };

  pc.removeAxes = function() {
    g.remove();
    g = undefined;
    return this;
  };

  pc.updateAxes = updateAxes(__, pc, position, axis, flags);

  pc.applyAxisConfig = function(axis, dimension) {
    let axisCfg;

    switch (dimension.orient) {
      case 'left':
        axisCfg = axisLeft(dimension.yscale);
        break;
      case 'right':
        axisCfg = axisRight(dimension.yscale);

        break;
      case 'top':
        axisCfg = axisTop(dimension.yscale);

        break;
      case 'bottom':
        axisCfg = axisBottom(dimension.yscale);

        break;
      default:
        axisCfg = axisLeft(dimension.yscale);

        break;
    }

    axisCfg
      .ticks(dimension.ticks)
      .tickValues(dimension.tickValues)
      .tickSizeInner(dimension.innerTickSize)
      .tickSizeOuter(dimension.outerTickSize)
      .tickPadding(dimension.tickPadding)
      .tickFormat(dimension.tickFormat);

    return axisCfg;
  };

  pc.brushable = brushable(__, pc, flags);

  pc.brush = function() {
    __.brushed = pc.selected();
    render.call('render');
  };

  pc.brushReset = function(dimension) {
    let brushesToKeep = [];
    for (let j = 0; j < __.brushes.length; j++) {
      if (__.brushes[j].data !== dimension) {
        brushesToKeep.push(__.brushes[j]);
      }
    }

    __.brushes = brushesToKeep;
    __.brushed = false;

    if (g) {
      let nodes = selectAll('.brush').nodes();
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].__data__ === dimension) {
          // remove all dummy brushes for this axis or the real brush
          select(select(nodes[i]).nodes()[0].parentNode)
            .selectAll('.dummy')
            .remove();
          __.dimensions[dimension].brush.move(select(nodes[i], null));
        }
      }
    }

    return this;
  };

  pc.selected = selected(__);

  // Jason Davies, http://bl.ocks.org/1341281
  pc.reorderable = function() {
    if (!g) pc.createAxes();
    g.style('cursor', 'move').call(
      drag()
        .on('start', function(d) {
          dragging[d] = this.__origin__ = xscale(d);
        })
        .on('drag', function(d) {
          dragging[d] = Math.min(
            w(),
            Math.max(0, (this.__origin__ += event.dx))
          );
          pc.sortDimensions();
          xscale.domain(pc.getOrderedDimensionKeys());
          pc.render();
          g.attr('transform', function(d) {
            return 'translate(' + position(d) + ')';
          });
        })
        .on('end', function(d) {
          delete this.__origin__;
          delete dragging[d];
          select(this)
            .transition()
            .attr('transform', 'translate(' + xscale(d) + ')');
          pc.render();
        })
    );
    flags.reorderable = true;
    return this;
  };

  // Reorder dimensions, such that the highest value (visually) is on the left and
  // the lowest on the right. Visual values are determined by the data values in
  // the given row.
  pc.reorder = function(rowdata) {
    let firstDim = pc.getOrderedDimensionKeys()[0];

    pc.sortDimensionsByRowData(rowdata);
    // NOTE: this is relatively cheap given that:
    // number of dimensions < number of data items
    // Thus we check equality of order to prevent rerendering when this is the case.
    let reordered = false;
    reordered = firstDim !== pc.getOrderedDimensionKeys()[0];

    if (reordered) {
      xscale.domain(pc.getOrderedDimensionKeys());
      let highlighted = __.highlighted.slice(0);
      pc.unhighlight();

      g
        .transition()
        .duration(1500)
        .attr('transform', function(d) {
          return 'translate(' + xscale(d) + ')';
        });
      pc.render();

      // pc.highlight() does not check whether highlighted is length zero, so we do that here.
      if (highlighted.length !== 0) {
        pc.highlight(highlighted);
      }
    }
  };

  pc.sortDimensionsByRowData = function(rowdata) {
    let copy = __.dimensions;
    let positionSortedKeys = keys(__.dimensions).sort(function(a, b) {
      let pixelDifference =
        __.dimensions[a].yscale(rowdata[a]) -
        __.dimensions[b].yscale(rowdata[b]);

      // Array.sort is not necessarily stable, this means that if pixelDifference is zero
      // the ordering of dimensions might change unexpectedly. This is solved by sorting on
      // variable name in that case.
      if (pixelDifference === 0) {
        return a.localeCompare(b);
      } // else
      return pixelDifference;
    });
    __.dimensions = {};
    positionSortedKeys.forEach(function(p, i) {
      __.dimensions[p] = copy[p];
      __.dimensions[p].index = i;
    });
  };

  pc.sortDimensions = function() {
    let copy = __.dimensions;
    let positionSortedKeys = keys(__.dimensions).sort(function(a, b) {
      if (position(a) - position(b) === 0) {
        return 1;
      } else {
        return position(a) - position(b);
      }
    });
    __.dimensions = {};
    positionSortedKeys.forEach(function(p, i) {
      __.dimensions[p] = copy[p];
      __.dimensions[p].index = i;
    });
  };

  // pairs of adjacent dimensions
  pc.adjacent_pairs = function(arr) {
    let ret = [];
    for (let i = 0; i < arr.length - 1; i++) {
      ret.push([arr[i], arr[i + 1]]);
    }
    return ret;
  };

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

  pc.interactive = function() {
    flags.interactive = true;
    return this;
  };

  // expose a few objects
  pc.xscale = xscale;
  pc.ctx = ctx;
  pc.canvas = canvas;
  pc.g = function() {
    return g;
  };

  // rescale for height, width and margins
  // TODO currently assumes chart is brushable, and destroys old brushes
  pc.resize = function() {
    // selection size
    pc.selection
      .select('svg')
      .attr('width', __.width)
      .attr('height', __.height);
    pc.svg.attr(
      'transform',
      'translate(' + __.margin.left + ',' + __.margin.top + ')'
    );

    // FIXME: the current brush state should pass through
    if (flags.brushable) pc.brushReset();

    // scales
    pc.autoscale();

    // axes, destroys old brushes.
    if (g) pc.createAxes();
    if (flags.brushable) pc.brushable();
    if (flags.reorderable) pc.reorderable();

    events.call('resize', this, {
      width: __.width,
      height: __.height,
      margin: __.margin,
    });
    return this;
  };

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
      xscale.range([0, w()], 1);
    }
    let v = dragging[d];
    return v == null ? xscale(d) : v;
  }

  // Merges the canvases and SVG elements into one canvas element which is then passed into the callback
  // (so you can choose to save it to disk, etc.)
  pc.mergeParcoords = mergeParcoords(pc);

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
