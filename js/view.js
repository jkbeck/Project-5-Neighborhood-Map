//Start of models
var model = {
	//My points of interest
	myLocs : [
	{
		name : "McMenamins",
		lat: "45.528368",
		lng: "-122.683604",
		formatted_address : "303 SW 12th Ave Portland, OR 97205",
		content: "Try the tator tots!",
	},
	{
		name : "McMenamins Rams Head",
		lat: "45.532216",
		lng: "-122.700427",
		formatted_address : "2282 NW Hoyt St Portland, OR 97210",
		content: "Try the Terminator Stout!",
	},
	{
		name : "Powell's City of Books",
		lat: "45.523353",
		lng: "-122.681456",
		formatted_address : "1005 W Burnside St Portland, OR 97209",
		content: "Open 9am to 11pm",
	},
	{
		name : "Olympic Provisions",
		lat: "45.522800",
		lng: "-122.663490",
		formatted_address : "107 SE Washington St Portland, OR 97214",
		content: "Open 11am to 10pm",
	}
	],

	mapOptions : {
    	zoom: 5,
    	center: new google.maps.LatLng(45.5424364,-122.654422)
  	},

  	defaultBounds : new google.maps.LatLngBounds(
			new google.maps.LatLng(45.6, -122.75),
			new google.maps.LatLng(45.45, -122.65)),
};

//Start of view-model
var viewModel = {
	getBounds : model.defaultBounds,

	getMapOptions : this.mapOptions,

	myLocs : model.myLocs,

};

var koViewModel = {
	searchResults : ko.observableArray([]),

	haveSearchResults : ko.observable(false),

	airValue : ko.observable("No value recorded"),
	airDesc : ko.observable("No description recorded"),
	isVisibleBreathMtr : ko.observable(false),

	resultToggle : ko.observable("H I D E"),

	clearResults : function() {
		//hide search results box
		this.haveSearchResults(false);
		//hide breezometer results box
		this.isVisibleBreathMtr(false);
		//remove streetview image
		$("#street-image").remove();
	},

	resultClick : function(result) {
		var address, setLat, setLon, searchLat, searchLon, request_url, lat, lon;
		address = result.formatted_address;
		//Lat & lon from my points of interest
		setLat = result.lat;
		setLon = result.lng;
		//Lat & Lon from search results
		searchLat = (typeof result.geometry) === "undefined" ? "undefined" : result.geometry.location.A;
		searchLon = (typeof result.geometry) === "undefined" ? "undefined" : result.geometry.location.F;
		//Setting lat and lon to be used for ajax request according to which variables are defined
		lat = searchLat !== "undefined" ? searchLat : setLat;
		lon =  searchLon !== "undefined" ? searchLon : setLon;
		//Build ajax request url
		request_url = "http://api-beta.breezometer.com/baqi/?lat=" + lat + "&lon=" + lon;
		request_url += "&key=3817f9688d5843e7808fdb7730629327";
		//console.log(request_url);

		//Ajax request to breazometer.com
		$.ajax({
		  	url: request_url,
		  	dataType: "json",
		  	success: function(data) {
		  		if(data.data_valid === true){
		  			//console.log("Ajax success");
		  			koViewModel.airDesc(data.breezometer_description);
		  			koViewModel.airValue(data.breezometer_aqi);
		  		} else if(data.data_valid === false){
		  			console.log("Ajax data retrieval failure due to " + data.error);
		  		} else {
		  			console.log("Unknown Ajax error");
		  		}
		  	},
		  	error: function(){
		  		console.log("Problem with ajax request");
		  	}
		});

		koViewModel.isVisibleBreathMtr(true);
		$("#street-image").remove();
		$("#street-view").append('<img id="street-image" src="https://maps.googleapis.com/maps/api/streetview?size=400x250&location=' + address + '">');

	},

};
ko.applyBindings(koViewModel);

//Start of Views
var mapView = {
	init : function () {
		//Map location
		var markers = [];
	  	var map = new google.maps.Map(document.getElementById('map-canvas'), viewModel.getMapOptions);

		//Search box start
		var defaultBounds = viewModel.getBounds;
		map.fitBounds(defaultBounds);

		// Create the search box and link it to the UI element.
		var input = /** @type {HTMLInputElement} */(
		  document.getElementById('pac-input'));
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

		var searchBox = new google.maps.places.SearchBox(
		/** @type {HTMLInputElement} */(input));

		// [START region_getplaces]
		// Listen for the event fired when the user selects an item from the
		// pick list. Retrieve the matching places for that item.
		google.maps.event.addListener(searchBox, 'places_changed', function() {
			var places = searchBox.getPlaces();

			koViewModel.searchResults.removeAll();

			for(var i = 0; i < places.length; i++){
				koViewModel.searchResults.push(places[i]);
			}
			koViewModel.haveSearchResults(true);

			if (places.length === 0) {
				return;
			}

			for (var i = 0, marker; marker = markers[i]; i++) {
				marker.setMap(null);
			}

			// For each place, get the icon, place name, and location.
			var bounds = new google.maps.LatLngBounds();

			for (var i = 0, place; place = places[i]; i++) {
				var image = {
			    	url: place.icon,
			    	size: new google.maps.Size(71, 71),
			    	origin: new google.maps.Point(0, 0),
			    	anchor: new google.maps.Point(17, 34),
			    	scaledSize: new google.maps.Size(25, 25)
			  	};

				// Create a marker for each place.
				var marker = new google.maps.Marker({
				    map: map,
				    icon: image,
				    name: place.name,
				    position: place.geometry.location
				});

				markers.push(marker);

				//Custom infobox with class for css and id for javascript
				var boxText = '<div id="infobox" class="infobox-outer"><div class="infobox-inner">';
	        		boxText += place.name + "<br/>" + place.formatted_address;
	        		boxText += '</div></div>';

				var infoboxOptions = {
					content : boxText,
					disableAutoPan: false,
					maxWidth: 0,
					pixelOffset: new google.maps.Size(-145, -10),
					zIndex: null,
					boxStyle: {
						opacity: 1,
						width: "280px",
					},
					closeBoxMargin: "10px 2px 2px 2px",
					infoBoxClearance: new google.maps.Size(1, 1),
					isHidden: false,
					pane: "floatPane"
				};

				//Add listener for marker click events
				google.maps.event.addListener(marker, 'click',(function(marker, i) {

					var infobox = new InfoBox(infoboxOptions);

					return function(){
						//Remove old infobox if any
						$('#infobox').remove();
						//Add new infobox
						infobox.open(map, marker);
						//infowindow.open(map, marker);
						koViewModel.resultClick(places[i]);
					};
				})(marker, i));

				bounds.extend(place.geometry.location);
			}

		map.fitBounds(bounds);
		});
		// [END region_getplaces]

		// Bias the SearchBox results towards places that are within the bounds of the
		// current map's viewport.
		google.maps.event.addListener(map, 'bounds_changed', function() {
			var bounds = map.getBounds();
			searchBox.setBounds(bounds);
		});
		//Search box end


		mapView.setMarkers(map, viewModel.myLocs);
	},

	//Add my points of interest markers to the map on page load
	setMarkers : function(map, locations) {

		for(var i = 0; i < viewModel.myLocs.length; i++){

			//Create map marker object
			var marker = new google.maps.Marker({
		    	position: new google.maps.LatLng( viewModel.myLocs[i].lat , viewModel.myLocs[i].lng ),
		    	map: map,
		    	name: viewModel.myLocs[i].name
			});

			//Custom infobox with class for css and id for javascript
	        var boxText = '<div id="infobox" class="infobox-outer"><div class="infobox-inner">';
	        	boxText += viewModel.myLocs[i].name + "<br/>" + viewModel.myLocs[i].formatted_address + "<br/>" + viewModel.myLocs[i].content;
	        	boxText += '</div></div>';

			var infoboxOptions = {
		            content : boxText,
		            disableAutoPan: false,
		            maxWidth: 0,
		            pixelOffset: new google.maps.Size(-140, 0),
		            zIndex: null,
		            boxStyle: {
                		opacity: 1,
                		width: "280px",
            		},
		 			closeBoxMargin: "10px 2px 2px 2px",
		 			infoBoxClearance: new google.maps.Size(1, 1),
		 			isHidden: false,
		 			pane: "floatPane"
		        };

			//Add event listener for marker click events
			google.maps.event.addListener(marker, 'click', (function(marker, i) {
				//Create marker info window
				var infobox = new InfoBox(infoboxOptions);

				return function(){
					//Remove old infobox if any
					$('#infobox').remove();
					//Add new infobox
					infobox.open(map, marker);
					//
					koViewModel.resultClick(viewModel.myLocs[i]);
				};

			})(marker, i));
		}
	}
};
google.maps.event.addDomListener(window, 'load', mapView.init);

var clicked = 0;

$("#hide-show-btn").click("click", function(){
	if(clicked === 0){
		$("#left-info").addClass("results-hide");
		koViewModel.resultToggle("S H O W");
		clicked = 1;
	} else {
		$("#left-info").removeClass("results-hide");
		koViewModel.resultToggle("H I D E");
		clicked = 0;
	}
});