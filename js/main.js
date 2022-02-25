// Instantiate Leaflet
function createMap() {
	//create map
	const map = L.map('map', {
		center: [37.8, -96],
		zoom: 4
	});

	// Add OSM base tile layer
	const OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	});
	OpenStreetMap_Mapnik.addTo(map);

	getData(map);
}; // end createMap()

// Retrieve data and place in map
function getData(map) {
	$.ajax("data/citypoints.geojson", {
		dataType: "json",
		success: function (response){
			// init attr array
			var attributes = processData(response);
			createPropSymbols(response, map, attributes);
			createSliderUI(map, attributes);
			createLegend(map, attributes);
		}
	});
}; // end getData()

function processData(homeless) {

	let attributes = [];
	let properties = homeless.features[1].properties;
	for (let attribute in properties){
		// only select attrs with homeless percentages
		if (attribute.indexOf("20") > -1){
			attributes.push(attribute);
		};
	};
	// console.log(attributes);
	// array of attributes from 2010 to 2019
	return attributes;
}; // end processData()

function createPropSymbols(homeless, map, attributes){

	L.geoJson(homeless, {
		pointToLayer: function(feature, latlng) {
			return pointToLayer(feature, latlng, attributes);
		}
	}).addTo(map);

}; //end createPropSymbols()

function onEachFeature(feature, layer) {
	// Create HTML string with properties
	var popupContent = "";
	if (feature.properties) {
		// Loop adds property names, vals to HTML string
		for (var property in feature.properties) {
			popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
		}
		layer.bindPopup(popupContent);
	};
};

function calcPropRadius(attValue) {
	var scaleFactor = 1050;
	var area = attValue * scaleFactor;
	var radius = Math.sqrt(area/Math.PI);
	return radius;
};

function round(value, decimals) {
	return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};

function updatePropSymbols(map, attribute){
	map.eachLayer(function(layer){
		if (layer.feature && layer.feature.properties[attribute]){

			var props = layer.feature.properties;

			var radius = calcPropRadius(props[attribute]);
			layer.setRadius(radius);

			var popupContent = "<p><b>City:</b> " + props.name + "</p>";
			var year = attribute.split("_")[0];
			popupContent += "<p><b>% Pop Homeless in " +
				year + ":</b> " + round(props[attribute], 2) + "%</p>";

				layer.bindPopup(popupContent, {
					offset: new L.Point(0,-radius)
				});
		};
	});

	updateLegend(map, attribute);
};

function createSliderUI(map, attributes) {
	$('#panel').append('<input class="range-slider" type="range">');

	$('.range-slider').attr({
		max: 9,
		min: 0,
		value: 0,
		step: 1
	});

	$('#panel').append('<button class="skip" id="backward">Backward</button>');
	$('#panel').append('<button class="skip" id="forward">Forward</button>');

	$('#backward').html('<img alt="backward by Debi Alpa Nugraha from the Noun Project" src="img/backward_crop_res.png">');
	$('#forward').html('<img alt="forward by Debi Alpa Nugraha from the Noun Project" src="img/forward_crop_res.png">');
	// create slider bar
	var sliderControl = L.Control.extend({
		options: {
			position: 'bottomleft',
			layer: attributes
		},

		onAdd: function (map) {
				// Create control container div, name it
				var container = L.DomUtil.create('div', 'sequence-control-container');
				$('.skip').click(function(){
					var index = $('.range-slider').val();

					if ($(this).attr('id') == 'forward'){
						index++;

						index = index > 9 ? 0 : index;
					} else if ($(this).attr('id') == 'backward'){
						index--;

						index = index < 0 ? 9 : index;
					};

					$('.range-slider').val(index);
					updatePropSymbols(map, attributes[index]);
				});

					$('.range-slider').on('input', function(){
					var index = $(this).val();
					updatePropSymbols(map, attributes[index]);

				});

				return container;
			}
	});
	map.addControl(new sliderControl());

};

function updateLegend(map, attribute){

	var year = attribute.split("_")[0];
	var content = "Percent homeless in " + year;
	$('#temporal-legend').html(content);

	var circleValues = getCircleValues(map, attribute);

	for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        //Step 3: assign the cy and r attributes
        $('#'+key).attr({
            cy: 59 - radius,
            r: radius
        });

				$('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + " percent");
    };
};

function createLegend(map, attributes){
		var LegendControl = L.Control.extend({
				options: {
						position: 'bottomleft',
				},

				onAdd: function (map) {

						// create the control container with a particular class name
						var container = L.DomUtil.create('div', 'legend-container');
						$(container).append('<div id="temporal-legend">')

						var svg = '<svg id="attribute-legend" width="160px" height="90px">';

						var circles = {
							max: 20,
							mean: 40,
							min: 60
						};

						//loop to add each circle and text to svg string
						for (var circle in circles){
						//circle string
							svg += '<circle class="legend-circle" id="' + circle + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="30"/>';

							svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';
						};

						svg += "</svg>";

						$(container).append(svg);
						return container;
					}


		});
		map.addControl(new LegendControl());
		updateLegend(map, attributes[0]);
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

function pointToLayer(feature, latlng, attributes) {

	var attribute = attributes[0];

	// Create marker options
	var gjMarkerOptions = {
		fillColor: "#ff7800",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
	};

	var attValue = Number(feature.properties[attribute]);

	gjMarkerOptions.radius = calcPropRadius(attValue);

	var layer = L.circleMarker(latlng, gjMarkerOptions);

	var popupContent = "<p><b>City: </b>" + feature.properties.name + "</p>";
	
	popupContent += "<p><b>% Pop Homeless in " + attribute + ":</b> " + round(feature.properties[attribute], 2) + "%</p>";

	layer.bindPopup(popupContent);

	// add event listeners to open popup on hover
	layer.on({
		mouseover: function(){
			this.openPopup();
		},
		mouseout: function(){
			this.closePopup();
		}
	});

	return layer;
} // end pointToLayer()

$(document).ready(createMap);
