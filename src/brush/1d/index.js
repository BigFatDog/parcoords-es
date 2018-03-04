import brushExtents from './brushExtents';
import install from './install';
import selected from './selected';
import uninstall from './uninstall';

const BrushState = {
    brushes: {},
    brushNodes: {}
}

const install1DAxes = (brushObj, config, pc, g) => {
  brushObj.modes['1D-axes'] = {
    install: install,
    uninstall: uninstall,
    selected: selected,
    brushState: brushExtents(pc, g),
  };
};
