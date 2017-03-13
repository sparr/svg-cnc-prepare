#!/usr/bin/env node

const xmlserializer = require('xmlserializer');
const fs = require('fs');

const optimizeElements = [
  "circle", "ellipse", "line", "path", "polygon", "polyline", "rect"
];

// const Snap = require('snapsvg');
const jsdom = require('jsdom');
jsdom.env('', ['node_modules/snapsvg/dist/snap.svg.js'], (error, window) => {
if (error) throw error;
const Snap = window.Snap;
// not indenting contents to avoid whitespace diff when jsdom dependency goes away


//ORIGINALPSEUDOCODE load svg
const input = fs.readFileSync('test.svg','utf8');
const snapthing = Snap.parse(input);
const svgElem = snapthing.node.children[0];
const paper = Snap(svgElem);


//ORIGINALPSEUDOCODE ungroup everything
// promote all the elements to be optimized to the top level, preserving their order
// remove any element that previously had children and is now empty
function ungroup_recurse(elem) {
  for (var elemIndex = 0; elemIndex < elem.children.length; elemIndex++) {
    var child = elem.children[elemIndex];
    ungroup_recurse(child);
    if (child.children.length > 0) {
      var nextElement = child.nextSibling;
      for (var childIndex = 0; childIndex < child.children.length; childIndex++) {
        if (optimizeElements.includes(child.children[childIndex].tagName)) {
          elem.insertBefore(child.children[childIndex], nextElement);
          childIndex--;
          elemIndex++;
        }
      }
      if (child.children.length == 0) {
        child.remove();
        elemIndex--;
      }
    }
  }
}
ungroup_recurse(svgElem);


//ORIGINALPSEUDOCODE TODO calculate modified Delaunay triangulation of elements


originalElements = [];
for (element of svgElem.children) {
  if (optimizeElements.includes(element.tagName)) {
    originalElements.push(element);    
  }
}

// convert all elements to be optimized into paths
originalPaths = [];
numberRegex = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
for (element of originalElements) {
  var attrRemove, pathData;
  switch (element.tagName) {
    case 'circle':
      var cx = +(element.getAttribute('cx')),
          cy = +(element.getAttribute('cy')),
           r = +(element.getAttribute('r'));
      pathData =
        'M' + cx + ' ' + cy +
        'a' + r + ' ' + r + ' 0 1 0 ' + ( r * 2) + ' 0' +
        'a' + r + ' ' + r + ' 0 1 0 ' + (-r * 2) + ' 0' +
        'Z';
      attrRemove = ['cx', 'cy', 'r'];
      break;
    case 'ellipse':
      var cx = +(element.getAttribute('cx')),
          cy = +(element.getAttribute('cy')),
          rx = +(element.getAttribute('rx')),
          ry = +(element.getAttribute('ry'));
      pathData =
        'M' + cx + ' ' + cy +
        'a' + rx + ' ' + ry + ' 0 1 0 ' + ( rx * 2) + ' 0' +
        'a' + rx + ' ' + ry + ' 0 1 0 ' + (-rx * 2) + ' 0' +
        'Z';
      attrRemove = ['cx', 'cy', 'rx', 'ry'];
      break;
    case 'line':
      var x1 = +(element.getAttribute('x1')),
          y1 = +(element.getAttribute('y1')),
          x2 = +(element.getAttribute('x2')),
          y2 = +(element.getAttribute('y2'));
      pathData = 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2;
      attrRemove = ['x1', 'y1', 'x2', 'y2'];
      break;
    case 'polygon':
    case 'polyline':
      var points = +(element.getAttribute('points')).match(regNumber).map(Number);
      pathData = 'M' + coords.slice(0,2).join(' ') +
                 'L' + coords.slice(2).join(' ') +
                 ((element.tagName == 'polygon') ? 'Z' : '');
      attrRemove = ['points'];
      break;
    case 'rect':
      var x = +(element.getAttribute('x')),
          y = +(element.getAttribute('y')),
          width  = +(element.getAttribute('width')),
          height = +(element.getAttribute('height'));
      pathData =
        'M' + x + ' ' + y +
        'H' + (x + width) +
        'V' + (y + height) +
        'H' + x +
        'Z';
      attrRemove = ['x', 'y', 'width', 'height'];
      break;
    case 'path':
      pathData = element.getAttribute('d');
      attrRemove = ['d'];
      break;
    default:
      console.log("Tried to convert element to path: " + element.tagName);
  }
  for (attr of attrRemove) {
    element.removeAttribute(attr);
  }
  var newElement = paper.path();
  var attributes = element.attributes;
  var attrs = {d: pathData};
  for(var i = 0; i < attributes.length; i++) {
    if (!attrRemove.includes(attributes[i].name)) {
      attrs[attributes[i].name] = attributes[i].value;
    }
  };  
  newElement.attr(attrs);
  element.parentElement.insertBefore(newElement.node, element);
  element.remove();
  originalPaths.push(newElement);
}

// precalculate N points along each path, for starting the search for nearest approach to neighbors later
const NEIGHBOR_SEARCH_POINTS = 500;
const NEIGHBOR_SEARCH_REFINE_STEPS = 100;
for (var index = 0; index < originalPaths.length; index++) {
  thisElement = originalPaths[index];
  thisElement.search_points = [];
  thisElement.length = Snap.path.getTotalLength(thisElement);
  // include both ends of the path and N-2 points in between
  for(var n = 0; n < NEIGHBOR_SEARCH_POINTS; n++) {
    thisElement.search_points.push(thisElement.getPointAtLength(thisElement.length*n/(NEIGHBOR_SEARCH_POINTS-1)));
  }
  // console.log(thisElement.search_points);
}
//ORIGINALPSEUDOCODE for every element
for (var indexA = 0; indexA < originalPaths.length - 1; indexA++) {
  thisElement = originalPaths[indexA];
//ORIGINALPSEUDOCODE   for every neighbor
  for (var indexB = indexA+1; indexB < originalPaths.length; indexB++) {
    otherElement = originalPaths[indexB]
//ORIGINALPSEUDOCODE     split element at its closest point to neighbor
    // now we need to find the point on each path that's closest to the other path
    const thisPoints  =  thisElement.search_points.map(a => Object.assign({}, a));
    const otherPoints = otherElement.search_points.map(a => Object.assign({}, a));
    var bestPointA = null,
        bestPointB = null,
        bestDistance = Infinity;
    for (var pointA = 0; pointA < NEIGHBOR_SEARCH_POINTS; pointA++) {
      for (var pointB = 0; pointB < NEIGHBOR_SEARCH_POINTS; pointB++) {
        var dist = Snap.len2(
           thisPoints[pointA].x,
           thisPoints[pointA].y,
          otherPoints[pointB].x,
          otherPoints[pointB].y
        );
        if (dist < bestDistance) {
          bestPointA = pointA;
          bestPointB = pointB;
          bestDistance = dist;
        }
      }
    }
    const finalPointA =  thisPoints[bestPointA],
          finalPointB = otherPoints[bestPointB];
    // try to refine the points
    // doesn't work yet
    // const searchStep = 1.0/(NEIGHBOR_SEARCH_POINTS-1)/NEIGHBOR_SEARCH_REFINE_STEPS;
    // const testPointA1 =  thisElement.getPointAtLength( thisElement.length * (bestPointA/(NEIGHBOR_SEARCH_POINTS-1) + searchStep)),
    //       testPointA2 =  thisElement.getPointAtLength( thisElement.length * (bestPointA/(NEIGHBOR_SEARCH_POINTS-1) - searchStep)),
    //       testPointB1 = otherElement.getPointAtLength(otherElement.length * (bestPointB/(NEIGHBOR_SEARCH_POINTS-1) + searchStep)),
    //       testPointB2 = otherElement.getPointAtLength(otherElement.length * (bestPointB/(NEIGHBOR_SEARCH_POINTS-1) - searchStep)),
    //       lenA1 = Snap.len2(testPointA1.x, testPointA1.y, otherPoints[bestPointB].x, otherPoints[bestPointB].y),
    //       lenA2 = Snap.len2(testPointA2.x, testPointA2.y, otherPoints[bestPointB].x, otherPoints[bestPointB].y),
    //       lenB1 = Snap.len2(testPointB1.x, testPointB1.y,  thisPoints[bestPointA].x,  thisPoints[bestPointA].y),
    //       lenB2 = Snap.len2(testPointB2.x, testPointB2.y,  thisPoints[bestPointA].x,  thisPoints[bestPointA].y),
    //       stepA =  thisElement.length * (lenA1<lenA2 ? searchStep : -searchStep),
    //       stepB = otherElement.length * (lenB1<lenB2 ? searchStep : -searchStep);
    // var newLenA =  thisElement.length * (bestPointA/(NEIGHBOR_SEARCH_POINTS-1)),
    //     newLenB = otherElement.length * (bestPointB/(NEIGHBOR_SEARCH_POINTS-1)),
    //     bestLenA = newLenA,
    //     bestLenB = newLenB,
    //     newDistance = bestDistance;
    // do {
    //   bestDistance = newDistance;
    //   newLenA += stepA;
    //   newLenB += stepB;
    //   newPointA =  thisElement.getPointAtLength(newLenA),
    //   newPointB = otherElement.getPointAtLength(newLenB),
    //   newDistance = Snap.len2(
    //     newPointA.x,
    //     newPointA.y,
    //     newPointB.x,
    //     newPointB.y
    //   );
    //   if (newDistance < bestDistance) {
    //     bestLenA = newLenA;
    //     bestLenB = newLenB;
    //   }
    // } while (newDistance < bestDistance);
    // const finalPointA =  thisElement.getPointAtLength(bestLenA),
    //       finalPointB = otherElement.getPointAtLength(bestLenB);
    // console.log("closest approach between "+thisElement.id+" and "+otherElement.id+" is "+Math.sqrt(bestDistance));
    paper.circle(finalPointA.x,finalPointA.y,1);
    paper.circle(finalPointB.x,finalPointB.y,1);
    var line = paper.line(finalPointA.x,finalPointA.y,finalPointB.x,finalPointB.y);
    line.attr({stroke:'#000','stroke-width':'0.25'});
  }
}

//ORIGINALPSEUDOCODE apply modified TSP to element endpoints
//ORIGINALPSEUDOCODE rearrange elements into order specified by TSP solution
//ORIGINALPSEUDOCODE re-join elements that share a vertex and are adjacent in the file

//ORIGINALPSEUDOCODE save svg
const svg = xmlserializer.serializeToString(snapthing.node);
console.log(svg);

// end of unindented jsdom.env()
window.close();
});

