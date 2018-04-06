import newBrush from './newBrush';
import drawBrushes from './drawBrushes';

const brushFor = (state, config, pc, events, brushGroup) => (
  axis,
  _selector
) => {
  const { brushes } = state;
  newBrush(state, config, pc, events, brushGroup)(axis, _selector);
  drawBrushes(brushes[axis], config, pc, axis, _selector);
};

export default brushFor;
