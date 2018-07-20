import colorPath from '../util/colorPath';
import functor from '../util/functor';

const pathMark = (config, ctx, position) => (d, i) => {
  ctx.marked.strokeStyle = functor(config.color)(d, i);
  return colorPath(config, position, d, ctx.marked);
};

const renderMarkedDefault = (config, pc, ctx, position) => () => {
  pc.clear('marked');

  if (config.marked.length) {
    config.marked.forEach(pathMark(config, ctx, position));
  }
};

const renderMarkedQueue = (config, markedQueue) => () => {
  if (config.marked) {
    markedQueue(config.marked);
  } else {
    markedQueue([]); // This is needed to clear the currently marked items
  }
};

const renderMarked = (config, pc, events) =>
  function() {
    if (!Object.keys(config.dimensions).length) pc.detectDimensions();

    pc.renderMarked[config.mode]();
    events.call('render', this);
    return this;
  };

export { pathMark, renderMarked, renderMarkedDefault, renderMarkedQueue };
