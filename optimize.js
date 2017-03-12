#!/usr/bin/env node

const xmlserializer = require('xmlserializer');
const fs = require('fs');

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
function ungroup_recurse(elem) {
  for (var index = 0; index < elem.children.length; index++) {
    var child = elem.children[index];
    ungroup_recurse(child);
    if (child.tagName == 'g') {
      var nextElement = child.nextSibling;
      while (child.children.length > 0) {
        elem.insertBefore(child.children[0], nextElement);
        index++;
      }
      child.remove();
      index--;
    }
  }
}
ungroup_recurse(snapthing.node);

//ORIGINALPSEUDOCODE calculate modified Delaunay triangulation of elements
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

