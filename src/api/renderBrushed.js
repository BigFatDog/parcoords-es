import isBrushed from '../util/isBrushed';
import colorPath from '../util/colorPath';
import { _functor } from '../helper';

const pathBrushed = (config, ctx, position) => (d, i) => {
  if (config.brushedColor !== null) {
    ctx.brushed.strokeStyle = _functor(config.brushedColor)(d, i);
  } else {
    ctx.brushed.strokeStyle = _functor(config.color)(d, i);
  }
  return colorPath(config, position, d, ctx.brushed);
};

const renderBrushedDefault = (config, ctx, position, pc, brushGroup) => () => {
  pc.clear('brushed');

  if (isBrushed(config, brushGroup)) {
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

export { pathBrushed, renderBrushedDefault, renderBrushedQueue };
