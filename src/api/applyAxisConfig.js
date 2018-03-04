import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';

const applyAxisConfig = (axis, dimension) => {
  let axisCfg;

  switch (dimension.orient) {
    case 'left':
      axisCfg = axisLeft(dimension.yscale);
      break;
    case 'right':
      axisCfg = axisRight(dimension.yscale);
      break;
    case 'top':
      axisCfg = axisTop(dimension.yscale);
      break;
    case 'bottom':
      axisCfg = axisBottom(dimension.yscale);
      break;
    default:
      axisCfg = axisLeft(dimension.yscale);
      break;
  }

  axisCfg
    .ticks(dimension.ticks)
    .tickValues(dimension.tickValues)
    .tickSizeInner(dimension.innerTickSize)
    .tickSizeOuter(dimension.outerTickSize)
    .tickPadding(dimension.tickPadding)
    .tickFormat(dimension.tickFormat);

  return axisCfg;
};

export default applyAxisConfig;
