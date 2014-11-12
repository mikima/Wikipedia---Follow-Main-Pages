var langID = 'en';
var page = 'Climate change';
var graph = {nodes:[],edges:[]};
var nodedict = {}
nodedict[page] = {name:page, size:0, depthlevel:0, status:'new', id:graph.nodes.length};
graph.nodes.push(nodedict[page]);
var maxdepth = 0;

//When DOM loaded we attach click event to button
$(document).ready(function() {

	//after button is clicked we add data
	$('#load_button').click(function(){
		explore();
	});
	
	//after button is clicked we download the data
	$('#export_gexf').click(function(){
		console.log(graph)
		//console.log(GEXFexport(page, graph));
	});
});

function explore()
{
	for(var i in nodedict)
	{
		var item = nodedict[i];
		if(item.status == 'new')
		{
			loadPage(langID, nodedict[i], nodedict, graph);
		}
	}
	document.getElementById("load_button").disabled = false;
};

function loadPage(_langID, _parent,_nodedict, _graph)
{
	document.getElementById("load_button").disabled = true;
	var baseURL = "http://"+_langID+".wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content|size&format=json&callback=?&titles="+_parent.name;
	$.getJSON(
	    baseURL, 
	    function(data)
	    {
	    	try{
		    	//load page from API
		    	var pagedata = data['query']['pages'];
		    	for (first in pagedata) break;
		    	var text = pagedata[first]['revisions'][0]['*'];
		    	var pagesize = pagedata[first]['revisions'][0]['size'];
		    	
		    	_nodedict[_parent.name].size = pagesize;
		    	_nodedict[_parent.name].status = 'visited';
		    	//console.log(JSON.stringify(pagedata,null,2));
		    	
		    	//get main pages
		    	var templates = text.match(/\{\{[Mm]ain\|(.+?)\}\}/g);
		    	var pages = []
		    	for (var i in templates)
		    	{
		    		var allpages = templates[i].match(/\{\{[Mm]ain\|(.+?)\}\}/)[1];
		    		var temppages = allpages.split('|');
		    		for(var j in temppages)
		    		{
		    			pages.push(temppages[j]);
		    		}
		    	}
		    	
		    	for(var i in pages)
		    	{
		    		var newpage = pages[i]
		    		
		    		//check if pages exixts
		    		if(!(newpage in _nodedict))
		    		{
		    			maxdepth = _parent.depthlevel+1;
		    			_nodedict[newpage] = {name:newpage, size:0, depthlevel:_parent.depthlevel+1, status:'new', id:_graph.nodes.length};
		    			_graph.nodes.push(_nodedict[newpage]);
		    		}
		    		_graph.edges.push({source:_parent.id, target:_nodedict[newpage].id})
		    		//console.log('added '+newpage); 
		    		//console.log(JSON.stringify(_graph, null, 2));
		    	}
	    	} catch (e)
	    	{
	    		//console.log(JSON.stringify(_graph.nodes, null, 2));
	    		console.log('error: '+_parent.name);
	    		_parent.status = 'error';
	    	}
	    	
	    }
	).success(function(){
	restart();
	});
}


// initialize network


var width = 960,
    height = 500;

var sizescale = d3.scale.sqrt()
				  .domain([0, d3.max(graph.nodes, function(d){ return d.size})])
				  .range([0,50]);


var force = d3.layout.force()
    .size([width, height])
    .nodes(graph.nodes) // initialize with a single node
    .links(graph.edges)
    .linkDistance(30)
    .charge(-60)
    .on("tick", tick);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);
    //.on("mousemove", mousemove)
    //.on("mousedown", mousedown);

svg.append("rect")
    .attr("width", width)
    .attr("height", height);

var nodes = force.nodes(),
    links = force.links(),
    node = svg.selectAll(".node"),
    link = svg.selectAll(".link");

var cursor = svg.append("circle")
    .attr("r", 30)
    .attr("transform", "translate(-100,-100)")
    .attr("class", "cursor");

restart();

function tick() {
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
}

function restart() {
  link = link.data(links);
  
  var color = d3.scale.linear()
    .domain([0, maxdepth])
    .range(["red", "green"]);
    
	var sizescale = d3.scale.sqrt()
				  .domain([0, d3.max(graph.nodes, function(d){ return d.size})])
				  .range([1,10]);

  link.enter().insert("line", ".node")
      .attr("class", "link");

  node = node.data(nodes);

  node.append("title")
      .text(function(d) { return d.name; });
      
  node.enter().insert("circle", ".cursor")
      .attr("class", "node")
      .attr("r", 5)
      .style("fill", function(d) { return color(d.depthlevel); })
      .call(force.drag);
	
	//update colors
	svg.selectAll('.node')
	   .style("fill", function(d) { return color(d.depthlevel); })
	   .attr('r', function(d) { return sizescale(d.size); });
	
  force.start();
}

//generic exporter
function GEXFexport(_netName, _graph)
{
	//a quick and dirt GEXF exporter
	var output = '';

	//we iterate through nodes and we add them
	
	var nodeoutput = '';
	//we set up a dictionary for attributes
	var attr = {};
	
	for(var n in _graph.nodes)
	{
		var node = _graph.nodes[n];
		nodeoutput += '<node id="' + n + '">\r';
		nodeoutput += '<attvalues>\r';
		//iterate through node variables
		for(var v in node)
		{
			nodeoutput += '<attvalue for="' + v + '" value="' + node[v] + '"/>\r';
			//check/add to dictionary
			if(!(v in attr))
			{
				
				attr[v] = typeof node[v] == 'number' ? 'float' : 'string' ;
			}
		}
		nodeoutput += '</attvalues>\r';
		nodeoutput += '</node>\r';
	}
	
	//we saves all attributes
	var attroutput = '';
	for(var a in attr)
	{
		attroutput += '<attribute id="' + a + '" title="' + a + '" type="' + attr[a] + '"/>\r'
	}
	
	//we iterate through edges
	
	var edgeoutput = '';
	
	for(var l in _graph.edges)
	{
		var edge = _graph.edges[l];
		edgeoutput += '<edge id="' + l + '" source="' + edge.source.id + '" target="' + edge.target.id + '"/>\r';
	}
	
	
	//now put everything togheter
	
	//first, set up the initials
	output += '<?xml version="1.0" encoding="UTF-8"?>\r'
	        + '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">\r'
	        + '<meta lastmodifieddate="2009-03-20">\r'
	        + '<creator>DensityDesign Lab | www.densitydesign.org</creator>\r'
	        + '<description>' + _netName + '</description>\r'
	        + '</meta>\r'
	        + '<graph mode="static" defaultedgetype="directed">\r'
	        + '<attributes class="node">\r'
	        + attroutput
	        + '</attributes>'
			+ '<nodes>\r'
			+ nodeoutput
			+ '</nodes>\r'
			+ '<edges>\r'
			+ edgeoutput
			+ '</edges>\r'
			+ '</graph>\r'
			+ '</gexf>';
	
	download('net.gexf', output);
	return output;
}

//http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);
    pom.click();
}