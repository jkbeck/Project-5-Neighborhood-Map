"use strict";
//Start of models
var model = {
	//My points of interest
	myLocs : [
	{
		name : "McMenamins",
		lat : "45.528368",
		lng : "-122.683604",
		formatted_address : "303 SW 12th Ave Portland, OR 97205",
		content : "Try the tator tots!",
	},
	{
		name : "McMenamins Rams Head",
		lat : "45.532216",
		lng : "-122.700427",
		formatted_address : "2282 NW Hoyt St Portland, OR 97210",
		content : "Try the Terminator Stout!",
	},
	{
		name : "Powell's City of Books",
		lat : "45.523353",
		lng : "-122.681456",
		formatted_address : "1005 W Burnside St Portland, OR 97209",
		content : "Open 9am to 11pm",
	},
	{
		name : "Olympic Provisions",
		lat : "45.522800",
		lng : "-122.663490",
		formatted_address : "107 SE Washington St Portland, OR 97214",
		content : "Open 11am to 10pm",
	}
	],

	mapOptions : {
    	zoom: 5,
    	center: new google.maps.LatLng(45.5424364,-122.654422)
  	},

  	defaultBounds : new google.maps.LatLngBounds(
			new google.maps.LatLng(45.6, -122.75),
			new google.maps.LatLng(45.45, -122.65)),

  	screenwidth : $(window).width(),

	resultsWidth : $("#search-results").width(),

	searchMarkers : [],
};

//Start of view-model
var viewModel = {
	getBounds : model.defaultBounds,

	getMapOptions : this.mapOptions,

	myLocs : model.myLocs,

};

var koViewModel = {
	searchResults : ko.observableArray([]),
	initialResults : ko.observableArray([]),

	haveSearchResults : ko.observable(false),

	airValue : ko.observable("No value recorded"),
	airDesc : ko.observable("No description recorded"),
	isVisibleBreathMtr : ko.observable(false),

	resultToggle : ko.observable("H I D E"),
	clickCount : 0,

	rateSelect : ko.observable("all"),

	clearResults : function() {
		//hide search results box
		this.haveSearchResults(false);
		//hide breezometer results box
		this.isVisibleBreathMtr(false);
		//remove streetview image
		$("#street-image").remove();
	},

	resultClick : function(result) {
		var address, setLat, setLon, searchLat, searchLon, request_url, lat, lon, streetWide, streetHeight;

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

		//Get screensize to diplay proper sized streetview depending on screenwidth
		streetWide = Math.round(model.resultsWidth + 26);
		streetHeight = Math.round(streetWide * 0.667);

		//If screen >= 320 then add streetview
		$("#street-image").remove();
		if(model.screenwidth >=320){
			$("#street-view").append('<img id="street-image" src="https://maps.googleapis.com/maps/api/streetview?size=' + streetWide +
			'x' + streetHeight + '&location=' + address + '">');
		}
	},

	//Needed separate click event for selecting marker to avoid infinite click loop
	selectMarker : function(result){
		var clickedMarker = model.searchMarkers[result.clickId];
		google.maps.event.trigger(clickedMarker, 'click');
	},

	hideShow : function(){
		$("#hide-show-btn").click("click", function(){
			if(koViewModel.clickCount === 0){
				$("#left-info").addClass("results-hide");
				koViewModel.resultToggle("S H O W");
				koViewModel.clickCount = 1;
			} else {
				$("#left-info").removeClass("results-hide");
				koViewModel.resultToggle("H I D E");
				koViewModel.clickCount = 0;
			}
		});
	}
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
			model.searchMarkers = [];
			var places = searchBox.getPlaces();

			koViewModel.searchResults.removeAll();
			//Reset radio button to all when new search
			koViewModel.rateSelect("all");

			var placesLength = places.length;

			for(var i = 0; i < placesLength; i++){
				places[i].clickId = [i];
				places[i].rated = places[i].rating;
				koViewModel.searchResults.push(places[i]);

				//Clone searchResults so we can go back if needed after filtering
				koViewModel.initialResults(koViewModel.searchResults.slice(0));
			}

			koViewModel.haveSearchResults(true);
			$("#left-info").removeClass("results-hide");

			if (placesLength === 0) {
				return;
			}

			for (var i = 0, marker; marker = markers[i]; i++) {
				marker.setMap(null);
			}

			// For each place, get the icon, place name, and location.
			var bounds = new google.maps.LatLngBounds();
			markers = [];

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
				    position: place.geometry.location,
				    id: [i]
				});

				markers.push(marker);
				model.searchMarkers = markers;

				if(place.rating === undefined) {
					place.rating = "Not yet rated";
				}
				//Custom infobox with class for css and id for javascript
				var boxText = '<div id="infobox" class="infobox-outer"><div class="infobox-inner">';
	        		boxText += place.name + "<br/>" + place.formatted_address + "<br/>Rating: "+ place.rating;
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
						//Center the map on clicked marker
						var latLng = marker.getPosition();
						map.setCenter(latLng);
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

		//Place my points of interest markers
		mapView.setMarkers(map, viewModel.myLocs);
		//Enable hide/show javascript for results window
		koViewModel.hideShow();
	},

	//Add my points of interest markers to the map on page load
	setMarkers : function(map, locations) {

		var myLocLength = viewModel.myLocs.length;

		for(var i = 0; i < myLocLength; i++){

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
					//Un-hide results window and display results
					koViewModel.resultClick(viewModel.myLocs[i]);
					$("#left-info").removeClass("results-hide");
					//Center the map on clicked marker
					var latLng = marker.getPosition();
					map.setCenter(latLng);
					console.log(marker);
				};

			})(marker, i));
		}
	}
};
google.maps.event.addDomListener(window, 'load', mapView.init);

//Filter search results
koViewModel.rateSelect.subscribe(function(newValue){
	var currentRating, currentResult;
	var resultLength = koViewModel.initialResults().length;
	koViewModel.searchResults.removeAll();

	switch(newValue) {
		case "all":
			koViewModel.searchResults(koViewModel.initialResults.slice(0));
			break;
		case "2":
			for(var i = 0; i < resultLength; i++){
				currentRating = koViewModel.initialResults()[i].rating;
				currentResult = koViewModel.initialResults()[i];
				//console.log(currentRating);
				if(currentRating >= 2){
					koViewModel.searchResults.push(currentResult);
				}
			}
			break;
		case "3":
			for(var i = 0; i < resultLength; i++){
				currentRating = koViewModel.initialResults()[i].rating;
				currentResult = koViewModel.initialResults()[i];
				if(currentRating >= 3){
					koViewModel.searchResults.push(currentResult);
				}
			}
			break;
		case "4":
			for(var i = 0; i < resultLength; i++){
				currentRating = koViewModel.initialResults()[i].rating;
				currentResult = koViewModel.initialResults()[i];
				if(currentRating >= 4){
					koViewModel.searchResults.push(currentResult);
				}
			}
			break;
	}
});