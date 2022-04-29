const images = require('./queries/images');
const projects = require('./queries/projects');

const path = require('path');

exports.exportProject = (projectId, forCallback = false) => {
  const imgs = images.getForProject(projectId);
  const project = projects.get(projectId);

  return imgs
    .map(img => {
      const { id, originalName, labelData, labeled, callbackUrl } = img;
      if (!labeled && projectId != 11) return null;

      const shapes = [];
      const labels = [];

      project.form.formParts.forEach(({ id, type, name }) => {
        if (labelData.labels == null || labelData.labels == undefined) {
          console.log('No labels found for: ' + id);
          return;
        }
        const things = labelData.labels[id];
        if (type === 'bbox' || type === 'polygon') {
          function transform(points) {
            if (type === 'polygon') {
              return points;
            }

            const [[x1, y1], [x2, y2]] = points;
            return [[x1, y1], [x1, y2], [x2, y2], [x2, y1]];
          }
          function sanitize([x, y]) {
            x = Math.floor(Math.max(x, 0));
            x = Math.min(x, labelData.width);
            y = Math.floor(Math.max(y, 0));
            y = Math.min(y, labelData.height);
            return [x, y];
          }
          if (things == null || things == undefined) {
            return;
          }
          things.forEach(({ points, tracingOptions }) => {
            const pts =
              tracingOptions && tracingOptions.enabled
                ? tracingOptions.trace
                : points;
            shapes.push({
              label: name,
              line_color: null,
              fill_color: null,
              points: transform(pts.map(({ lng, lat }) => [lng, lat])).map(
                sanitize
              ),
            });
          });
        } else {
          labels.push({
            label: name,
            values: things,
          });
        }
      });

      if (projectId == 11) {
        labels.push({
          label: 'Review Status',
          values: ['PROPER'],
        });
        labels.push({
          label: 'Image Quality (scale of 1 to 10)',
          values: labeled ? [9] : [8],
        });
      }

      const out = {
        flags: {},
        shapes,
        labels,
        lineColor: [0, 255, 0, 128],
        fillColor: [255, 0, 0, 128],
        imagePath: originalName,
        imageData: null,
      };

      if (forCallback) {
        delete out.imageData;
        delete out.imagePath;
      }

      return {
        name: path.basename(originalName).replace(/\.[^/.]+$/, '') + '.json',
        image_id: id,
        originalName: originalName,
        callbackUrl: callbackUrl,
        contents: JSON.stringify(out, null, 2),
      };
    })
    .filter(x => !!x);
};
