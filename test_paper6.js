import paper from 'paper';
import * as opentype from 'opentype.js';

paper.setup(new paper.Size(1000, 1000));

const svgString = 'M 0 0 L 100 0 L 100 100 L 0 100 Z M 25 25 L 25 75 L 75 75 L 75 25 Z';
const baseItem = new paper.CompoundPath(svgString);

console.log("Original children:", baseItem.children.length);
console.log("Child 0 clockwise:", baseItem.children[0].clockwise);
console.log("Child 1 clockwise:", baseItem.children[1].clockwise);

const eraser = new paper.Path.Circle(new paper.Point(50, 50), 20);
const result = baseItem.subtract(eraser);

console.log("Result children:", result.children ? result.children.length : 1);
if (result.children) {
  console.log("Result child 0 clockwise:", result.children[0].clockwise);
  console.log("Result child 1 clockwise:", result.children[1].clockwise);
  console.log("Result child 2 clockwise:", result.children[2].clockwise);
}
