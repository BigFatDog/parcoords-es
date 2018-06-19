import uninstall from './uninstall';
import install from './install';
import selected from './selected';

const installAngularBrush = (brushGroup, config, pc, events, xscale) => {
  const state = {
    arcs: {},
    strumRect: {},
  };

  brushGroup.modes['angular'] = {
    install: install(brushGroup, state, config, pc, events, xscale),
    uninstall: uninstall(state, pc),
    selected: selected(brushGroup, state, config),
    brushState: () => state.arcs,
  };
};

export default installAngularBrush;
