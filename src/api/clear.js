import isBrushed from '../util/isBrushed';
import w from '../util/width';
import h from '../util/height';

const clear = (config, pc, ctx, brushGroup) =>
  function(layer) {
    ctx[layer].clearRect(0, 0, w(config) + 2, h(config) + 2);

    // This will make sure that the foreground items are transparent
    // without the need for changing the opacity style of the foreground canvas
    // as this would stop the css styling from working
    if (layer === 'brushed' && isBrushed(config, brushGroup)) {
      ctx.brushed.fillStyle = pc.selection.style('background-color');
      ctx.brushed.globalAlpha = 1 - config.alphaOnBrushed;
      ctx.brushed.fillRect(0, 0, w(config) + 2, h(config) + 2);
      ctx.brushed.globalAlpha = config.alpha;
    }
    return this;
  };

export default clear;
