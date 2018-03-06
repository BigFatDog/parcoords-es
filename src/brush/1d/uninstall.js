const uninstall = (pc, g, brushes) => {
  g.selectAll('.brush').remove();
  brushes = {};
  delete pc.brushExtents;
  delete pc.brushReset;
};

export default uninstall;
