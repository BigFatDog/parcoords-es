import brushExtents from './brushExtents';
import install from './install';
import selected from './selected';
import uninstall from './uninstall';

const install1DMultiAxes = (brushGroup, config, pc, events) => {
  const state = {
    brushes: {},
    brushNodes: {},
  };

  brushGroup.modes['1D-axes-multi'] = {
    install: install(state, config, pc, events, brushGroup),
    uninstall: uninstall(state, pc),
    selected: selected(state, config, brushGroup),
    brushState: brushExtents(state, config, pc),
  };
};

export default install1DMultiAxes;
