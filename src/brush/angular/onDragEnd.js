import selected from './selected';
import removeStrum from './removeStrum';

const onDragEnd = (brushGroup, state, config, pc, events) => () => {
  const arc = state.arcs[state.arcs.active];

  // Okay, somewhat unexpected, but not totally unsurprising, a mousclick is
  // considered a drag without move. So we have to deal with that case
  if (arc && arc.p1[0] === arc.p2[0] && arc.p1[1] === arc.p2[1]) {
    removeStrum(state, pc);
  }

  if (arc) {
    const angle = state.arcs.startAngle(state.arcs.active);

    arc.startAngle = angle;
    arc.endAngle = angle;
    arc.arc
      .outerRadius(state.arcs.length(state.arcs.active))
      .startAngle(angle)
      .endAngle(angle);
  }

  state.arcs.active = undefined;
  config.brushed = selected(brushGroup, state, config);
  pc.renderBrushed();
  events.call('brushend', pc, config.brushed);
};

export default onDragEnd;
