// misc
import renderQueue from './util/renderQueue';
import w from './util/width';

// brush
import install1DAxes from './brush/1d';
import install1DAxesMulti from './brush/1d-multi';
import install2DStrums from './brush/strums';
import installAngularBrush from './brush/angular';

// api
import intersection from './api/intersection';
import mergeParcoords from './api/mergeParcoords';
import selected from './api/selected';
import brushMode from './api/brushMode';
import updateAxes from './api/updateAxes';
import autoscale from './api/autoscale';
import brushable from './api/brushable';
import commonScale from './api/commonScale';
import computeRealCentroids from './api/computeRealCentroids';
import applyDimensionDefaults from './api/applyDimensionDefaults';
import createAxes from './api/createAxes';
import axisDots from './api/axisDots';
import applyAxisConfig from './api/applyAxisConfig';
import reorderable from './api/reorderable';
import resize from './api/resize';
import reorder from './api/reorder';
import sortDimensions from './api/sortDimensions';
import sortDimensionsByRowData from './api/sortDimensionsByRowData';
import clear from './api/clear';
import {
  pathMark,
  renderMarked,
  renderMarkedDefault,
  renderMarkedQueue,
} from './api/renderMarked';
import {
  pathBrushed,
  renderBrushed,
  renderBrushedDefault,
  renderBrushedQueue,
} from './api/renderBrushed';
import brushReset from './api/brushReset';
import toType from './api/toType';
import toString from './api/toString';
import adjacentPairs from './api/adjacentPairs';
import highlight from './api/highlight';
import unhighlight from './api/unhighlight';
import mark from './api/mark';
import unmark from './api/unmark';
import removeAxes from './api/removeAxes';
import render from './api/render';
import renderDefault, {
  pathForeground,
  renderDefaultQueue,
} from './api/renderDefault';
import toTypeCoerceNumbers from './api/toTypeCoerceNumbers';
import detectDimensionTypes from './api/detectDimensionTypes';
import getOrderedDimensionKeys from './api/getOrderedDimensionKeys';
import interactive from './api/interactive';
import shadows from './api/shadows';
import init from './api/init';
import flip from './api/flip';
import detectDimensions from './api/detectDimensions';
import scale from './api/scale';

import { version } from '../package.json';
import initState from './state';
import bindEvents from './bindEvents';

//css
import './parallel-coordinates.css';

const ParCoords = userConfig => {
  const state = initState(userConfig);
  const {
    config,
    events,
    flags,
    xscale,
    dragging,
    axis,
    ctx,
    canvas,
    brush,
  } = state;

  const pc = init(config, canvas, ctx);

  const position = d => {
    if (xscale.range().length === 0) {
      xscale.range([0, w(config)], 1);
    }
    return dragging[d] == null ? xscale(d) : dragging[d];
  };

  const brushedQueue = renderQueue(pathBrushed(config, ctx, position))
    .rate(50)
    .clear(() => pc.clear('brushed'));

  const markedQueue = renderQueue(pathMark(config, ctx, position))
    .rate(50)
    .clear(() => pc.clear('marked'));

  const foregroundQueue = renderQueue(pathForeground(config, ctx, position))
    .rate(50)
    .clear(function() {
      pc.clear('foreground');
      pc.clear('highlight');
    });

  bindEvents(
    config,
    ctx,
    pc,
    xscale,
    flags,
    brushedQueue,
    markedQueue,
    foregroundQueue,
    events,
    axis
  );

  // expose the state of the chart
  pc.state = config;
  pc.flags = flags;

  pc.autoscale = autoscale(config, pc, xscale, ctx);
  pc.scale = scale(config, pc);
  pc.flip = flip(config);
  pc.commonScale = commonScale(config, pc);
  pc.detectDimensions = detectDimensions(pc);
  // attempt to determine types of each dimension based on first row of data
  pc.detectDimensionTypes = detectDimensionTypes;
  pc.applyDimensionDefaults = applyDimensionDefaults(config, pc);
  pc.getOrderedDimensionKeys = getOrderedDimensionKeys(config);

  //Renders the polylines.
  pc.render = render(config, pc, events);
  pc.renderBrushed = renderBrushed(config, pc, events);
  pc.renderMarked = renderMarked(config, pc, events);
  pc.render.default = renderDefault(config, pc, ctx, position);
  pc.render.queue = renderDefaultQueue(config, pc, foregroundQueue);
  pc.renderBrushed.default = renderBrushedDefault(
    config,
    ctx,
    position,
    pc,
    brush
  );
  pc.renderBrushed.queue = renderBrushedQueue(config, brush, brushedQueue);
  pc.renderMarked.default = renderMarkedDefault(config, pc, ctx, position);
  pc.renderMarked.queue = renderMarkedQueue(config, markedQueue);

  pc.compute_real_centroids = computeRealCentroids(config, position);
  pc.shadows = shadows(flags, pc);
  pc.axisDots = axisDots(config, pc, position);
  pc.clear = clear(config, pc, ctx, brush);
  pc.createAxes = createAxes(config, pc, xscale, flags, axis);
  pc.removeAxes = removeAxes(pc);
  pc.updateAxes = updateAxes(config, pc, position, axis, flags);
  pc.applyAxisConfig = applyAxisConfig;
  pc.brushable = brushable(config, pc, flags);
  pc.brushReset = brushReset(config, pc);
  pc.selected = selected(config, pc);
  pc.reorderable = reorderable(config, pc, xscale, position, dragging, flags);

  // Reorder dimensions, such that the highest value (visually) is on the left and
  // the lowest on the right. Visual values are determined by the data values in
  // the given row.
  pc.reorder = reorder(config, pc, xscale);
  pc.sortDimensionsByRowData = sortDimensionsByRowData(config);
  pc.sortDimensions = sortDimensions(config, position);

  // pairs of adjacent dimensions
  pc.adjacent_pairs = adjacentPairs;
  pc.interactive = interactive(flags);

  // expose internal state
  pc.xscale = xscale;
  pc.ctx = ctx;
  pc.canvas = canvas;
  pc.g = () => pc._g;

  // rescale for height, width and margins
  // TODO currently assumes chart is brushable, and destroys old brushes
  pc.resize = resize(config, pc, flags, events);

  // highlight an array of data
  pc.highlight = highlight(config, pc, canvas, events, ctx, position);
  // clear highlighting
  pc.unhighlight = unhighlight(config, pc, canvas);

  // mark an array of data
  pc.mark = mark(config, pc, canvas, events, ctx, position);
  // clear marked data
  pc.unmark = unmark(config, pc, canvas);

  // calculate 2d intersection of line a->b with line c->d
  // points are objects with x and y properties
  pc.intersection = intersection;

  // Merges the canvases and SVG elements into one canvas element which is then passed into the callback
  // (so you can choose to save it to disk, etc.)
  pc.mergeParcoords = mergeParcoords(pc);
  pc.brushModes = () => Object.getOwnPropertyNames(brush.modes);
  pc.brushMode = brushMode(brush, config, pc);

  // install brushes
  install1DAxes(brush, config, pc, events);
  install2DStrums(brush, config, pc, events, xscale);
  installAngularBrush(brush, config, pc, events, xscale);
  install1DAxesMulti(brush, config, pc, events);

  pc.version = version;
  // this descriptive text should live with other introspective methods
  pc.toString = toString(config);
  pc.toType = toType;
  // try to coerce to number before returning type
  pc.toTypeCoerceNumbers = toTypeCoerceNumbers;

  return pc;
};

export default ParCoords;
