import { select, selectAll } from 'd3-selection';

// Merges the canvases and SVG elements into one canvas element which is then passed into the callback
// (so you can choose to save it to disk, etc.)
const mergeParcoords = pc => callback => {
  // Retina display, etc.
  const devicePixelRatio = window.devicePixelRatio || 1;

  // Create a canvas element to store the merged canvases
  const mergedCanvas = document.createElement('canvas');

  const foregroundCanvas = pc.canvas.foreground;
  // We will need to adjust for canvas margins to align the svg and canvas
  const canvasMarginLeft = Number(
    foregroundCanvas.style.marginLeft.replace('px', '')
  );

  const textTopAdjust = 15;
  const canvasMarginTop =
    Number(foregroundCanvas.style.marginTop.replace('px', '')) + textTopAdjust;
  const width =
    (foregroundCanvas.clientWidth + canvasMarginLeft) * devicePixelRatio;
  const height =
    (foregroundCanvas.clientHeight + canvasMarginTop) * devicePixelRatio;
  mergedCanvas.width = width + 50; // pad so that svg labels at right will not get cut off
  mergedCanvas.height = height + 30; // pad so that svg labels at bottom will not get cut off
  mergedCanvas.style.width = mergedCanvas.width / devicePixelRatio + 'px';
  mergedCanvas.style.height = mergedCanvas.height / devicePixelRatio + 'px';

  // Give the canvas a white background
  const context = mergedCanvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

  // Merge all the canvases
  for (const key in pc.canvas) {
    context.drawImage(
      pc.canvas[key],
      canvasMarginLeft * devicePixelRatio,
      canvasMarginTop * devicePixelRatio,
      width - canvasMarginLeft * devicePixelRatio,
      height - canvasMarginTop * devicePixelRatio
    );
  }

  // Add SVG elements to canvas
  const DOMURL = window.URL || window.webkitURL || window;
  const serializer = new XMLSerializer();
  // axis labels are translated (0,-5) so we will clone the svg
  //   and translate down so the labels are drawn on the canvas
  const svgNodeCopy = pc.selection
    .select('svg')
    .node()
    .cloneNode(true);
  svgNodeCopy.setAttribute('transform', 'translate(0,' + textTopAdjust + ')');
  svgNodeCopy.setAttribute(
    'height',
    svgNodeCopy.getAttribute('height') + textTopAdjust
  );
  // text will need fill attribute since css styles will not get picked up
  //   this is not sophisticated since it doesn't look up css styles
  //   if the user changes
  select(svgNodeCopy)
    .selectAll('text')
    .attr('fill', 'black');
  const svgStr = serializer.serializeToString(svgNodeCopy);

  // Create a Data URI.
  const src = 'data:image/svg+xml;base64,' + window.btoa(svgStr);
  const img = new Image();
  img.onload = () => {
    context.drawImage(
      img,
      0,
      0,
      img.width * devicePixelRatio,
      img.height * devicePixelRatio
    );
    if (typeof callback === 'function') {
      callback(mergedCanvas);
    }
  };
  img.src = src;
};

export default mergeParcoords;
