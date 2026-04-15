import paper from 'paper';

paper.setup(new paper.Size(1000, 1000));

function expandStroke(pathString, radius) {
    const path = new paper.Path(pathString);
    let result = null;
    
    path.flatten(radius / 4);
    
    for (let i = 0; i < path.segments.length - 1; i++) {
        const p1 = path.segments[i].point;
        const p2 = path.segments[i+1].point;
        
        const dir = p2.subtract(p1);
        if (dir.length === 0) continue;
        
        const normal = dir.normalize(radius).rotate(90);
        
        const rect = new paper.Path();
        rect.add(p1.add(normal));
        rect.add(p2.add(normal));
        rect.add(p2.subtract(normal));
        rect.add(p1.subtract(normal));
        rect.closed = true;
        
        const circle1 = new paper.Path.Circle(p1, radius);
        const circle2 = new paper.Path.Circle(p2, radius);
        
        let segmentShape = rect.unite(circle1).unite(circle2);
        
        if (!result) {
            result = segmentShape;
        } else {
            result = result.unite(segmentShape);
        }
    }
    
    if (!result && path.segments.length > 0) {
        result = new paper.Path.Circle(path.segments[0].point, radius);
    }
    
    return result || new paper.Path();
}

function paperToOpentypeCommands(item) {
  const commands = [];
  
  const paths = item instanceof paper.CompoundPath ? item.children : [item];
  
  for (const path of paths) {
    if (!path.segments || path.segments.length === 0) continue;
    
    const first = path.segments[0];
    commands.push({ type: 'M', x: first.point.x, y: first.point.y });
    
    for (let i = 1; i < path.segments.length; i++) {
      const prev = path.segments[i - 1];
      const curr = path.segments[i];
      
      if (prev.handleOut.isZero() && curr.handleIn.isZero()) {
        commands.push({ type: 'L', x: curr.point.x, y: curr.point.y });
      } else {
        commands.push({
          type: 'C',
          x1: prev.point.x + prev.handleOut.x,
          y1: prev.point.y + prev.handleOut.y,
          x2: curr.point.x + curr.handleIn.x,
          y2: curr.point.y + curr.handleIn.y,
          x: curr.point.x,
          y: curr.point.y
        });
      }
    }
    
    if (path.closed) {
      const prev = path.segments[path.segments.length - 1];
      const curr = path.segments[0];
      if (!prev.handleOut.isZero() || !curr.handleIn.isZero()) {
        commands.push({
          type: 'C',
          x1: prev.point.x + prev.handleOut.x,
          y1: prev.point.y + prev.handleOut.y,
          x2: curr.point.x + curr.handleIn.x,
          y2: curr.point.y + curr.handleIn.y,
          x: curr.point.x,
          y: curr.point.y
        });
      }
      commands.push({ type: 'Z' });
    }
  }
  
  return commands;
}

const base = new paper.Path.Rectangle(new paper.Point(0, 0), new paper.Size(100, 100));
const eraser = expandStroke("M 50 0 L 50 100", 10);

const finalShape = base.subtract(eraser);
console.log(JSON.stringify(paperToOpentypeCommands(finalShape), null, 2));
