const brushReset = (brushGroup, config, pc, events) => state => {
  const ids = Object.getOwnPropertyNames(state.strums).filter(d => !isNaN(d));

  ids.forEach(d => {
    state.strums.active = d;
    removeStrum(state, pc);
  });
  onDragEnd(brushGroup, state, config, pc, events)();
};

export default brushReset;
