import isBrushed from '../util/isBrushed';
import colorPath from '../util/colorPath';
import functor from '../util/functor';

const pathBrushed = (config, ctx, position) => (d, i) => {
  if (config.brushedColor !== null) {
    ctx.brushed.strokeStyle = functor(config.brushedColor)(d, i);
  } else {
    ctx.brushed.strokeStyle = functor(config.color)(d, i);
  }
  return colorPath(config, position, d, ctx.brushed);
};

const renderBrushedDefault = (config, ctx, position, pc, brushGroup) => () => {
  pc.clear('brushed');

  if (isBrushed(config, brushGroup) && config.brushed !== false) {
    config.brushed.forEach(pathBrushed(config, ctx, position));
  }
};

const renderBrushedQueue = (config, brushGroup, brushedQueue) => () => {
  if (isBrushed(config, brushGroup)) {
    brushedQueue(config.brushed);
  } else {
    brushedQueue([]); // This is needed to clear the currently brushed items
  }
};

const renderBrushed = (config, pc, events) =>
  function() {
    if (!Object.keys(config.dimensions).length) pc.detectDimensions();

    pc.renderBrushed[config.mode]();
    events.call('render', this);
    return this;
  };

export { pathBrushed, renderBrushed, renderBrushedDefault, renderBrushedQueue };
