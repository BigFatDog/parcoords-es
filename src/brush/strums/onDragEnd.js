import selected from './selected';
import removeStrum from './removeStrum';

const onDragEnd = (brushGroup, state, config, pc, events) => () => {
  const strum = state.strums[state.strums.active];

  // Okay, somewhat unexpected, but not totally unsurprising, a mousclick is
  // considered a drag without move. So we have to deal with that case
  if (strum && strum.p1[0] === strum.p2[0] && strum.p1[1] === strum.p2[1]) {
    removeStrum(state, pc);
  }

  const brushed = selected(brushGroup, state, config);
  state.strums.active = undefined;
  config.brushed = brushed;
  pc.renderBrushed();
  events.call('brushend', pc, config.brushed);
};

export default onDragEnd;
