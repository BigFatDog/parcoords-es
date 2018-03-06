import { event } from 'd3-selection';

const rotateLabels = (config, pc) => {
  if (!config.rotateLabels) return;

  let delta = event.deltaY;
  delta = delta < 0 ? -5 : delta;
  delta = delta > 0 ? 5 : delta;

  config.dimensionTitleRotation += delta;
  pc.svg
    .selectAll('text.label')
    .attr(
      'transform',
      'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')'
    );
  event.preventDefault();
};

export default rotateLabels;
