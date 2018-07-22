import { entries } from 'd3-collection';
import { min } from 'd3-array';

//draw dots with radius r on the axis line where data intersects
const axisDots = (config, pc, position) => _r => {
  const r = _r || 0.1;
  const ctx = pc.ctx.dots;
  const startAngle = 0;
  const endAngle = 2 * Math.PI;
  ctx.globalAlpha = min([1 / Math.pow(config.data.length, 1 / 2), 1]);
  config.data.forEach(d => {
    entries(config.dimensions).forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(
        position(p),
        config.dimensions[p.key].yscale(d[p]),
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

export default axisDots;
