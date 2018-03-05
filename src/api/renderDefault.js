import colorPath from '../util/colorPath';
import { _functor } from '../helper';

const pathForeground = (config, ctx, position) => (d, i) => {
  ctx.foreground.strokeStyle = _functor(config.color)(d, i);
  return colorPath(config, position, d, ctx.foreground);
};

const renderDefault = (config, pc, ctx, position) => () => {
  pc.clear('foreground');
  pc.clear('highlight');

  pc.renderBrushed.default();

  config.data.forEach(pathForeground(config, ctx, position));
};

const renderDefaultQueue = (config, pc, foregroundQueue) => () => {
  pc.renderBrushed.queue();
  foregroundQueue(config.data);
};

export default renderDefault;

export { pathForeground, renderDefaultQueue };
