import paper from 'paper';

paper.setup(new paper.Size(1000, 1000));

const svgString = "M 0 0 L 100 0 L 100 100 L 0 100 Z M 25 25 L 25 75 L 75 75 L 75 25 Z";
const baseItem = new paper.CompoundPath(svgString);

console.log(baseItem.children.length);
