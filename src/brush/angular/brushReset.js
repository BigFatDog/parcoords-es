import onDragEnd from './onDragEnd';
import removeStrum from './removeStrum';

const brushReset = (brushGroup, state, config, pc, events) => () => {
  const ids = Object.getOwnPropertyNames(state.arcs).filter(d => !isNaN(d));

  ids.forEach(d => {
    state.arcs.active = d;
    removeStrum(state, pc);
  });
  onDragEnd(brushGroup, state, config, pc, events)();
};

export default brushReset;
