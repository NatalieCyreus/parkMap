var map;
var locationArray = [];
var address;
var addressLatLng;
//Weather API global variables.
var contentHTML = "";
var currentWeather = "";
var displayCurrentweather = "";
// Foursquare global variable.
var clientID = '';
var clientSecret = '';
var placeList = ko.observableArray([]);
// tree image as markers.
var defaultIcon = "images/treeIcon.png";

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		styles: styles,
		mapTypeControl: false
	});

	// One instance of infowindow is created and used in Places. This way only one infowindow can appear in the map.
	InfoWindow = new google.maps.InfoWindow();

	zoomToArea();

	// Get location with google Geocoder.
	function zoomToArea() {
		var geocoder = new google.maps.Geocoder();
		address = 'Stockholm, sweden';
		geocoder.geocode({
			address: address
		}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				map.setCenter(results[0].geometry.location);
				addressLatLng = results[0].geometry.location;
				map.setZoom(15);
				findPlaceInArea();
			} else {
				window.alert('It seems to be a problem with google API.');
			}
			getWeatherAPI(results[0]);
		});

	}

	//Weather API to show the weather in adress area, uses lat lng from google geocode result.
	function getWeatherAPI(results) {
		var weatherAPIkey = 'fe50b81890652f2dd2f26fa41083e299';
		var locationLat = results.geometry.viewport.f.b;
		var locationLng = results.geometry.viewport.b.b;
		var weatherURL = 'http://api.openweathermap.org/data/2.5/weather?lat=' + locationLat + '&lon=' + locationLng + '&units=metric&APPID=' + weatherAPIkey;
		$.getJSON(weatherURL).done(function(results) {
			currentWeather = results.weather[0].description;
			displayCurrentweather = "Current weather: " + currentWeather;
		}).fail(function() {
			alert("There was an error with the weather API call. Try again later.");
		});
	}

	// Uses google geocoder result position to find parks within that area.
	function findPlaceInArea() {
		var service = new google.maps.places.PlacesService(map);
		service.nearbySearch({
			location: addressLatLng,
			radius: 400,
			type: ['park']
		}, getPlaceArray);
	}

	// Takes the results from google places and push results to locationArray. Start foursquare search to add foursquare checkin to array.
	function getPlaceArray(results, status) {
		if (status === google.maps.places.PlacesServiceStatus.OK) {
			//For loop to populate locationArray.
			for (var i = 0; i < results.length; i++) {
				locationArray.push(results[i]);
				var locationObject = results[i];
				getFourSquareAPI(locationObject, i);
			}
		} else {
			window.alert("It seems to be a problem with the google API");
		}
	}
	// Get results from foursquare and creates foursquareCheckin to each locationArray place object.
	function getFourSquareAPI(locationObject, locationObjectIndex) {
		clientID = 'TTSUU4KIIOL2HILPY33444SNIIDYQRGVGX5XTFVZXV5T5FDT';
		clientSecret = '5FD5J51HFV5W3XBD23TC4DDTL2A315KHIZHJQHECE0DYEW5C';
		var foursquareResultArray = [];
		var foursquareURL = 'https://api.foursquare.com/v2/venues/search?ll=' + locationObject.geometry.viewport.f.f + ',' + locationObject.geometry.viewport.b.f + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20170101 ' + '&query=' + locationObject.name;
		// Foursquare Api call.
		var parameter = {
			index: locationObjectIndex
		};
		$.getJSON(foursquareURL, parameter).done(function(foursquareResult) {
				var fSresult;
				if (foursquareResult.response.venues.length > 0) {
					fSresult = foursquareResult.response.venues[0].stats.checkinsCount;
				} else {
					fSresult = 0;
				}
				// For each result push into locationArray.
				locationArray[parameter.index].foursquareCheckin = fSresult;
				checkIfCompleted();
			}
			// If foursquare fail, the foursquare checkIn is set to "can't connect, try later".
		).fail(function() {
			locationArray[parameter.index].foursquareCheckin = "can't connect, try later";
			checkIfCompleted();
		});
	}

	// Check if foursquare checkin is complete on each locationarray object, starts createPlace when done.
	function checkIfCompleted() {
		var isMissingCheckin = false;
		for (var i = 0; i < locationArray.length; i++) {
			var location = locationArray[i];
			if (location.foursquareCheckin === undefined) {
				isMissingCheckin = true;
				break;
			}
		}
		if (!isMissingCheckin) {
			createPlace();
		}

	}

	var Place = function(data) {
		var self = this;
		this.name = data.name;
		this.position = data.geometry.location;
		this.lng = data.geometry.viewport.b.b;
		this.lat = data.geometry.viewport.f.b;
		this.id = data.place_id;
		this.foursquareCheckin = data.foursquareCheckin;
		this.visible = ko.observable(true);
		this.currentWeather = currentWeather;
		this.contentString = "<div>" + this.name + " Forsquare checkins: " + this.foursquareCheckin;

		if (data.photos) {
			this.photo = '<br><img src="' + data.photos[0].getUrl({
				maxHeight: 200,
				maxWidth: 400
			}) + '"><br>';
			this.contentString += this.photo + "</div>";
		} else {
			this.contentString += "</div>";
		}

		this.infoWindow = InfoWindow;

		this.marker = new google.maps.Marker({
			map: map,
			position: this.position,
			animation: google.maps.Animation.DROP,
			icon: defaultIcon,
			id: this.id
		});

		this.showMarker = ko.computed(function() {
			if (this.visible() === true) {
				this.marker.setMap(map);
			} else {
				this.marker.setMap(null);
			}
			return true;
		}, this);

		this.marker.addListener('click', function() {
			self.infoWindow.setContent(self.contentString);
			self.infoWindow.open(map, this);
			self.marker.setAnimation(google.maps.Animation.BOUNCE);
			setTimeout(function() {
				self.marker.setAnimation(null);
			}, 1100);
			map.setZoom(17);
			map.setCenter(this.position);
		});

		this.bounce = function(place) {
			google.maps.event.trigger(self.marker, 'click');
		};
	};

	// create Places from the results and a filtered list.
	function ViewModel() {
		var self = this;
		self.arrayLength = locationArray.length;
		//Search filter list.
		this.searchItem = ko.observable("");
		//Empty KO observable array.
		placeList = ko.observableArray([]);
		//Push locationArray items into KO placeList array.
		locationArray.forEach(function(data) {
			var newPlace = new Place(data);
			placeList.push(newPlace);
		});
		//Filter the listItem.
		this.filteredList = ko.computed(function() {
			var filter = self.searchItem().toLowerCase();
			if (!filter) {
				placeList().forEach(function(newPlace) {
					newPlace.visible(true);
				});
				return placeList();
			} else {
				return ko.utils.arrayFilter(placeList(),
					function(newPlace) {
						var string = newPlace.name.toLowerCase();
						var result = (string.search(filter) >= 0);
						newPlace.visible(result);
						return result;
					});
			}
		}, self);
	}

	// Start the viewmodel to create places.
	function createPlace() {
		ko.applyBindings(new ViewModel());
	}
}

// google map error, called in index where it loads Google Map API, on error.
function mapError() {
	alert("Can't connect to Google Maps. Refresh the page or try again later.");
}
