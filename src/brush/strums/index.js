import uninstall from './uninstall';
import install from './install';
import selected from './selected';

const install2DStrums = (brushGroup, config, pc, events, xscale) => {
  const state = {
    strums: {},
    strumRect: {},
  };

  brushGroup.modes['2D-strums'] = {
    install: install(brushGroup, state, config, pc, events, xscale),
    uninstall: uninstall(state, pc),
    selected: selected(brushGroup, state, config),
    brushState: () => state.strums,
  };
};

export default install2DStrums;
