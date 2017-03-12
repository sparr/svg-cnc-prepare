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
var input = fs.readFileSync('test.svg','utf8');
var snapthing = Snap.parse(input);

//ORIGINALPSEUDOCODE ungroup everything
// promote all the elements to be optimized to the top level, preserving their order
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
ungroup_recurse(snapthing.node.children[0]);

//ORIGINALPSEUDOCODE TODO calculate modified Delaunay triangulation of elements


// Basic shapes
// <circle>, <ellipse>, <line>, <polygon>, <polyline>, <rect>

//ORIGINALPSEUDOCODE for every element
//ORIGINALPSEUDOCODE   for every neighbor
//ORIGINALPSEUDOCODE     split element at its closest point to neighbor
//ORIGINALPSEUDOCODE apply modified TSP to element endpoints
//ORIGINALPSEUDOCODE rearrange elements into order specified by TSP solution
//ORIGINALPSEUDOCODE re-join elements that share a vertex and are adjacent in the file

//ORIGINALPSEUDOCODE save svg
const svg = xmlserializer.serializeToString(snapthing.node);
console.log(svg);

// end of unindented jsdom.env()
window.close();
});

