var map;
var locationArray = [];
var address = 'Tribeca, New York, NY, USA';
var addressLatLng;
//Weather API global variables.
var currentWeather = "";
var displayCurrentweather = "";
// Foursquare global variable.
var clientID = '';
var clientSecret = '';
var checkIn = '';
var placeList = ko.observableArray([]);
//Styles the markers.
var defaultIcon = "images/treeIcon.png";
var treeIconYellow = "images/treeIconYellow.png";

// Loads the map
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		styles: styles,
		mapTypeControl: false
	});

	var largeInfowindow = new google.maps.InfoWindow();
	zoomToArea();

	function zoomToArea() {
		var geocoder = new google.maps.Geocoder();
		address = 'Tribeca, New York, NY, USA';
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
		});

//Weather API CALL
		var weatherAPIkey = 'fe50b81890652f2dd2f26fa41083e299';
		var weatherURL = 'http://api.openweathermap.org/data/2.5/weather?lat=40.716269&lon=-74.008632&units=metric&APPID=' + weatherAPIkey;
		$.getJSON(weatherURL).done(function(data) {
			currentWeather = data.weather[0].description;
			displayCurrentweather = "Current weather: " + currentWeather;
		}).fail(function() {
			alert("There was an error with the weather API call. Try again later.");
		});
	}

	// Gets back result JSON from google place Api. Find parks within 1000 meters of input adress. Invoke callback funtion.
	function findPlaceInArea() {
		var service = new google.maps.places.PlacesService(map);
		service.nearbySearch({
			location: addressLatLng,
			radius: 1000,
			type: ['park']
		}, getPlaceArray);
	}

	function getPlaceArray(results, status) {
		if (status === google.maps.places.PlacesServiceStatus.OK) {
			for (var i = 0; i < results.length; i++) {
				locationArray.push(results[i]);
			}
			startApp();
		} else {
			window.alert("It seems to be a problem with the google API");
		}
	}

	var Place = function(data) {
		self = this;
		this.name = data.name;
		this.position = data.geometry.location;
		this.lng = data.geometry.viewport.b.b;
		this.lat = data.geometry.viewport.f.b;
		this.id = data.place_id;
		this.checkIn = data.checkIn;
		this.visible = ko.observable(true);
		this.currentWeather = currentWeather;
		this.checkInList = 'Foursquare checkins: '+ this.checkIn;
		var markeritle =  this.name + ' Checkins: ' + this.checkIn;
		this.marker = new google.maps.Marker({
			map: map,
			position: this.position,
			title: markeritle,
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

		this.bounce = function(place) {
			google.maps.event.trigger(this.marker, 'click');
			this.marker.setAnimation(google.maps.Animation.DROP);
		};


		this.marker.addListener('click', function() {
			this.setIcon(treeIconYellow);
			populateInfoWindow(this, largeInfowindow);
		});

	};

	function callFoursquare(data) {
		clientID = 'TTSUU4KIIOL2HILPY33444SNIIDYQRGVGX5XTFVZXV5T5FDT';
		clientSecret = '5FD5J51HFV5W3XBD23TC4DDTL2A315KHIZHJQHECE0DYEW5C';

		//foursquare API CALL
		var foursquareURL = 'https://api.foursquare.com/v2/venues/search?ll=' + data.geometry.viewport.f.b + ',' + data.geometry.viewport.b.b + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20170101 ' + '&query=' + data.name;

		$.getJSON(foursquareURL).done(function(foursquareResult) {
				checkIn = foursquareResult.response.venues[0].stats.checkinsCount;
				data.checkIn = checkIn;
				var newPlace = new Place(data);
				placeList.push(newPlace);
		}).fail(function() {
			data.checkIn = 'not available';
			var newPlace = new Place(data);
			placeList.push(newPlace);
		});
	}

	function ViewModel() {
		var self = this;
		self.arrayLength = locationArray.length;
		//Search filter list.
		this.searchItem = ko.observable("");
		//Empty KO observable array.
		placeList = ko.observableArray([]);
		//Push locationArray items into KO placeList array.
		locationArray.forEach(function(data) {
			callFoursquare(data);
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
				return ko.utils.arrayFilter(placeList(), function(newPlace) {
					var string = newPlace.name.toLowerCase();
					var result = (string.search(filter) >= 0);
					newPlace.visible(result);
					return result;
				});
			}
		}, self);

	}

	//This starts the app when API result is done.
	function startApp() {
		ko.applyBindings(new ViewModel());
	}
}


// when a marker is clicked on it populates that Infowindow and uses google places getDetails to get the places details.
function populateInfoWindow(marker, infowindow) {
	var service = new google.maps.places.PlacesService(map);

	service.getDetails({
		placeId: marker.id
	}, function(place, status) {
		if (status === google.maps.places.PlacesServiceStatus.OK) {

			console.log(place);
			// Set the marker property on this infowindow so it isn't created again.
			infowindow.marker = marker;
			var innerHTML = '<div>';
			if (place.photos) {
				innerHTML += '<br><img src="' + place.photos[0].getUrl({
					maxHeight: 200,
					maxWidth: 400
				}) + '"><br>';
			}
			if (place.name) {
				innerHTML += '<p>' + place.name + '</p>';
			}
			if (currentWeather.length > 0) {
				innerHTML += '<p>' + currentWeather + '</p>';
			}
			if (place.formatted_address) {
				innerHTML += '<p>' + place.formatted_address + '</p>';
			}
			if (place.website) {
				innerHTML += '<a target="_blank" href="' + place.website + '">Website</a>';
			}
			if (place.rating) {
				innerHTML += '<p>Rating:</strong>' + place.rating + '<strong></p>';
			}

			innerHTML += '</div>';
			infowindow.setContent(innerHTML);
			infowindow.open(map, marker);
			// Make sure the marker property is cleared if the infowindow is closed.
			infowindow.addListener('closeclick', function() {
				infowindow.marker = null;
			});
		} else {
			window.alert("It seems to be a problem with Google API");
		}
	});
}
