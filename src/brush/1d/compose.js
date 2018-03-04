import brushExtents from './brushExtents';
import selected from './selected';
import install from './install';
import uninstall from './uninstall';

const compose = target => {
  target.modes['1D-axes'] = {
    install: install,
    uninstall: uninstall,
    selected: selected,
    brushState: brushExtents,
  };
};

export default compose;
