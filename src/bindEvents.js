// side effects for setters
import sideEffects from './state/sideEffects';
import getset from './util/getset';

const d3_rebind = (target, source, method) =>
  function() {
    const value = method.apply(source, arguments);
    return value === source ? target : value;
  };

const _rebind = (target, source, method) => {
  target[method] = d3_rebind(target, source, source[method]);
  return target;
};

const bindEvents = (
  __,
  ctx,
  pc,
  xscale,
  flags,
  brushedQueue,
  markedQueue,
  foregroundQueue,
  events,
  axis
) => {
  const side_effects = sideEffects(
    __,
    ctx,
    pc,
    xscale,
    axis,
    flags,
    brushedQueue,
    markedQueue,
    foregroundQueue
  );

  // create getter/setters
  getset(pc, __, events, side_effects);

  // expose events
  // getter/setter with event firing
  _rebind(pc, events, 'on');

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
};

export default bindEvents;
