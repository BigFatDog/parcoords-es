// Merges the canvases and SVG elements into one canvas element which is then passed into the callback
// (so you can choose to save it to disk, etc.)
const mergeParcoords = pc => callback => {
  // Retina display, etc.
  const devicePixelRatio = window.devicePixelRatio || 1;

  // Create a canvas element to store the merged canvases
  const mergedCanvas = document.createElement('canvas');
  mergedCanvas.width = pc.canvas.foreground.clientWidth * devicePixelRatio;
  mergedCanvas.height =
    (pc.canvas.foreground.clientHeight + 30) * devicePixelRatio;
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
      0,
      24 * devicePixelRatio,
      mergedCanvas.width,
      mergedCanvas.height - 30 * devicePixelRatio
    );
  }

  // Add SVG elements to canvas
  const DOMURL = window.URL || window.webkitURL || window;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(
    pc.selection.select('svg').node()
  );

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
