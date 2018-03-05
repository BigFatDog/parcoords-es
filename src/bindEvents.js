// side effects for setters
import sideEffects from './sideEffects';
import getset from './util/getset';
import { _rebind } from './helper';

const bindEvents = (
  __,
  ctx,
  pc,
  xscale,
  flags,
  brushedQueue,
  foregroundQueue,
  events,
  axis
) => {
  const side_effects = sideEffects(
    __,
    ctx,
    pc,
    xscale,
    flags,
    brushedQueue,
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
