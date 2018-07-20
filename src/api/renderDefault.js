import colorPath from '../util/colorPath';
import functor from '../util/functor';

const pathForeground = (config, ctx, position) => (d, i) => {
  ctx.foreground.strokeStyle = functor(config.color)(d, i);
  return colorPath(config, position, d, ctx.foreground);
};

const renderDefault = (config, pc, ctx, position) => () => {
  pc.clear('foreground');
  pc.clear('highlight');

  pc.renderBrushed.default();
  pc.renderMarked.default();

  config.data.forEach(pathForeground(config, ctx, position));
};

const renderDefaultQueue = (config, pc, foregroundQueue) => () => {
  pc.renderBrushed.queue();
  pc.renderMarked.queue();
  foregroundQueue(config.data);
};

export default renderDefault;

export { pathForeground, renderDefaultQueue };
