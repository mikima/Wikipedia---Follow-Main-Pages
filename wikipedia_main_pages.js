//first of all, query the page
//http://blog.comperiosearch.com/blog/2012/06/27/make-an-instant-search-application-using-json-ajax-and-jquery/

var langID = 'en';
var page = 'Global warming';
var graph = {nodes:[],edges:[]};
var nodedict = {}
nodedict[page] = {name:page, size:0, depthlevel:0, status:'new', id:graph.nodes.length};
graph.nodes.push(nodedict[page]);
var maxdepth = 0;
var width = 960;
var height = 500;
var sizescale, force, svg, nodes, cursor, links, node, link;

//When DOM loaded we attach click event to button
$(document).ready(function() {

	//after button is clicked we add data
	$('#load_button').click(function(){
		explore();
	});
	
	//after button is clicked we download the data
	$('#export_gexf').click(function(){
		//console.log(graph)
		console.log(GEXFexport(page, graph));
	});

	$("#searchterm").keyup(function (e) {
    var q = $("#searchterm").val();
    $.getJSON("http://en.wikipedia.org/w/api.php?callback=?",
    	{
		    srsearch: q,
		    action: "query",
		    list: "search",
		    format: "json"
	    },
	    function (data) {
	    	$("#results").show();
	        $("#results").empty();
	        $("#results").append("Results for <b>" + q + "</b>");
	        $.each(data.query.search, function (i, item) {
	           	console.log(i+": "+item.title);
	            $("#results").append('<div class="wp_page" id="wiki_' + i + '" pagename="' + item.title + '">' + item.title + '</div>');
	            $("#wiki_"+i).click(function() {
	            	$("#results").hide();
	            	initialize($(this).attr('pagename'));
	            });
	        });
	    });
	});
});

function initialize(_pagename)
{
	console.log('inizializzo per ' + _pagename);
	langID = 'en';
	page = _pagename;
	graph = {nodes:[],edges:[]};
	nodedict = {};
	nodedict[page] = {name:page, size:0, depthlevel:0, status:'new', id:graph.nodes.length};
	graph.nodes.push(nodedict[page]);
	var maxdepth = 0;
	explore();
	
	// initialize network

	sizescale = d3.scale.sqrt()
					  .domain([0, d3.max(graph.nodes, function(d){ return d.size})])
					  .range([0,50]);


	force = d3.layout.force()
	    .size([width, height])
	    .nodes(graph.nodes) // initialize with a single node
	    .links(graph.edges)
	    .linkDistance(30)
	    .charge(-60)
	    .on("tick", tick);
	
	d3.select("svg")
       .remove();

	svg = d3.select("body").append("svg")
	    .attr("width", width)
	    .attr("height", height);
	    //.on("mousemove", mousemove)
	    //.on("mousedown", mousedown);

	svg.append("rect")
	    .attr("width", width)
	    .attr("height", height);

	nodes = force.nodes(),
	links = force.links(),
	node = svg.selectAll(".node"),
	link = svg.selectAll(".link");

	cursor = svg.append("circle")
	    .attr("r", 30)
	    .attr("transform", "translate(-100,-100)")
	    .attr("class", "cursor");

	restart();
}

function explore()
{
	for(var i in nodedict)
	{
		console.log('esploro');
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
	console.log('carico ' + baseURL);
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
    .domain([0, maxdepth/2, maxdepth])
    .range(["#D7191C", "#FFFFBF", "#2C7BB6"]);
    
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
	   .style("fill", function(d) { d.color = color(d.depthlevel); return color(d.depthlevel); })
	   .attr('r', function(d) { return sizescale(d.size); });
	
  force.start();
}


function GEXFexport(_netName, _graph)
{
	//a quick and dirt GEXF exporter
	var output = '';

	//we iterate through nodes and we add them
	
	var nodeoutput = '';
	//we set up a dictionary for attributes
	
	for(var n in _graph.nodes)
	{
		var node = _graph.nodes[n];
		console.log("esporto "+node.name);
		var color = hexToRgb(node.color)
		nodeoutput += '<node id="' + n + '" label="' + node.name + '">\r';
		nodeoutput += '<attvalues>\r';
		//save node variables
		nodeoutput += '<attvalue for="status" value="' + node.status + '"/>\r';
		nodeoutput += '<attvalue for="size" value="' + node.size + '"/>\r';
		nodeoutput += '<attvalue for="depthlevel" value="' + node.depthlevel + '"/>\r';
		nodeoutput += '</attvalues>\r';
		nodeoutput += '<viz:size value="' + node.weight + '" />\r';
		nodeoutput += '<viz:position x="' + node.x + '" y="' + node.y + '" z="0.0" />\r';
		nodeoutput += '<viz:color r="'+color.r+'" g="'+color.g+'" b="'+color.b+'" />\r';
		nodeoutput += '</node>\r';
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
	        + '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2" xmlns:viz="http://www.gexf.net/1.2draft/viz" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.gexf.net/1.2draft http://www.gexf.net/1.2draft/gexf.xsd">\r'
	        + '<meta lastmodifieddate="' + getDate() + '">\r'
	        + '<creator>DensityDesign Lab | www.densitydesign.org</creator>\r'
	        + '<description>' + _netName + '</description>\r'
	        + '</meta>\r'
	        + '<graph mode="static" defaultedgetype="directed">\r'
	        + '<attributes class="node">\r'
	        + '<attribute id="size" title="size" type="float"/>\r'
	        + '<attribute id="depthlevel" title="depthlevel" type="float"/>\r'
	        + '<attribute id="status" title="status" type="string"/>\r'
	        + '</attributes>'
			+ '<nodes>\r'
			+ nodeoutput
			+ '</nodes>\r'
			+ '<edges>\r'
			+ edgeoutput
			+ '</edges>\r'
			+ '</graph>\r'
			+ '</gexf>';
	
	download(_netName+'_'+getDate()+'.gexf', output);
	return output;
}

//http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);
    pom.click();
}

//http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

//http://stackoverflow.com/questions/13459866/javascript-change-date-into-format-of-dd-mm-yyyy

function getDate() {
  function pad(s) { return (s < 10) ? '0' + s : s; }
  var d = new Date(Date.now());
  //console.log(d);
  return [d.getFullYear(), pad(d.getMonth()+1), pad(d.getDate())].join('-');
}