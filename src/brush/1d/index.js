import brushExtents from './brushExtents';
import install from './install';
import selected from './selected';
import uninstall from './uninstall';

const BrushState = {
  brushes: {},
  brushNodes: {},
};

const install1DAxes = (brushGroup, config, pc, events) => {
  const state = Object.assign({}, BrushState);

  brushGroup.modes['1D-axes'] = {
    install: install(state, config, pc, events, brushGroup),
    uninstall: uninstall(state, pc),
    selected: selected(state, config, brushGroup),
    brushState: brushExtents(state, config, pc),
  };
};

export default install1DAxes;
