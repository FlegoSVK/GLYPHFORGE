import paper from 'paper';
paper.setup(new paper.Size(1000, 1000));

const path1 = new paper.Path.Circle(new paper.Point(50, 50), 25);
const path2 = new paper.Path.Circle(new paper.Point(60, 50), 25);

const result = path1.subtract(path2);
console.log(result.exportSVG({ asString: true }));
