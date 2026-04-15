import paper from 'paper';
import * as opentype from 'opentype.js';

paper.setup(new paper.Size(1000, 1000));

const font = opentype.loadSync('node_modules/opentype.js/test/fonts/Roboto-Black.ttf');
const glyph = font.charToGlyph('i');
const pathData = glyph.path.toPathData(2);

const baseItem = new paper.CompoundPath(pathData);
console.log("Original children:", baseItem.children.length);

const eraser = new paper.Path.Circle(new paper.Point(250, 1400), 200); // Erase the dot
const result = baseItem.subtract(eraser);

console.log("Result children:", result.children ? result.children.length : 1);
