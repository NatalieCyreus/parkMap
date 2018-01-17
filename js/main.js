var map;
//blank array for all listing markers.
var markers = ko.observableArray([]);
var locationArray = [];
var address;
var addressLatLng;
var currentWeather;
//Styles the markers.
var defaultIcon = "images/treeIcon.png";
var treeIconYellow = "images/treeIconYellow.png";

// Loads the map
function initMap() {
	var newYork = new google.maps.LatLng(40.7413549, -73.9980244);
	//Create the map and set a start center position.
	map = new google.maps.Map(document.getElementById('map'), {
		center: {
			lat: 40.7413549,
			lng: -73.9980244
		},
		zoom: 13,
		styles: styles,
		mapTypeControl: false
	});

	var largeInfowindow = new google.maps.InfoWindow();

	var zoomAutocomplete = new google.maps.places.Autocomplete(
		document.getElementById('searchInAreaText'));
	zoomAutocomplete.bindTo('bounds', map);
	zoomToArea();

	/*document.getElementById('searchInArea').addEventListener('click', function() {
		zoomToArea();
	});
	*/
// Use google smart search and zoom into input location and invoke findPlaceInArea funtion.
	function zoomToArea() {
		var geocoder = new google.maps.Geocoder();
		//address = document.getElementById('searchInAreaText').value;
		address = 'Tribeca, New York, NY, USA';
		if (address == '') {
			window.alert('add an address!');
		} else {
			//hideMarkers(markers);
			geocoder.geocode({
				address: address
			}, function(results, status) {
				if (status == google.maps.GeocoderStatus.OK) {
					map.setCenter(results[0].geometry.location);
					//document.getElementById('searchInAreaText').value = results[0].formatted_address;
					addressLatLng = results[0].geometry.location;
					map.setZoom(15);
					findPlaceInArea();
				}
			});
		}

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
		for (var i=0; i < results.length; i++) {
			locationArray.push(results[i]);
		}
		startApp();
	}
}

var Place = function(data) {
	self = this;
	this.name = data.name;
	this.position = data.geometry.location;
	this.id = data.place_id;
	this.visible = ko.observable(true);
	this.currentWeather;
	this.marker = new google.maps.Marker({
			map: map,
			position: this.position,
			title: this.name,
			animation: google.maps.Animation.DROP,
			icon: defaultIcon,
			id: this.id
		});

		var weatherAPIkey = 'fe50b81890652f2dd2f26fa41083e299';
		var weatherURL = 'http://api.openweathermap.org/data/2.5/weather?lat=40.716269&lon=-74.008632&units=metric&APPID=' + weatherAPIkey;

			$.getJSON(weatherURL).done(function(data) {
				var weatherResult = data.weather[0].description;
				console.log(weatherResult)
				this.currentWeather = weatherResult;
			}).fail(function() {
	        alert("There was an error with the weather API call. Try again later.");
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
				populateInfoWindow(this, largeInfowindow)
		})

		this.marker.addListener('click', function() {
				populateInfoWindow(this, largeInfowindow)
		});

		this.marker.addListener('mouseover', function() {
			this.setIcon(treeIconYellow);
		});
		this.marker.addListener('mouseout', function() {
			this.setIcon(defaultIcon);
		});

};


function ViewModel() {
		var self = this;
		//self.arrayLength = ko.observable("");
		self.arrayLength = locationArray.length;
		//Search filter list.
		this.searchTerm = ko.observable("");
		//Empty KO observable array.
		this.placeList = ko.observableArray([]);
		//Push locationArray items into KO placeList array.
		locationArray.forEach(function(place){
			var newPlace = new Place(place);
			//console.log(newPlace);
			self.placeList.push(newPlace);
		});

		//Displayes the list with a filter search function.
		this.filteredList = ko.computed(function() {
			var filter = self.searchTerm().toLowerCase();
			if (!filter) {
            self.placeList().forEach(function(newPlace) {
                newPlace.visible(true);
            });
            return self.placeList();
        } else {
            return ko.utils.arrayFilter(self.placeList(), function(newPlace) {
                var string = newPlace.name.toLowerCase();
                var result = (string.search(filter) >= 0);
                newPlace.visible(result);
                return result;
            });
        }
    }, self);

};

//This starts the app when API result is done.
	function startApp() {
			ko.applyBindings(new ViewModel())
	}
};

// when a marker is clicked on it populates that Infowindow and uses google places getDetails to get the places details.
function populateInfoWindow(marker, infowindow) {

	var service = new google.maps.places.PlacesService(map);
	service.getDetails({
		placeId: marker.id
	}, function(place, status) {
		if (status === google.maps.places.PlacesServiceStatus.OK) {
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
				innerHTML += '<strong>' + place.name + '</strong>';
			}
			if (place.formatted_address) {
				innerHTML += '<br>' + place.formatted_address;
			}
			if (place.website) {
				innerHTML += '<br><a target="_blank" href="' + place.website + '">Website</a>';
			}
			if (place.rating) {
				innerHTML += '<br><strong>Rating:</strong>' + place.rating + '<strong> /5</strong>';
			}

			innerHTML += '</div>';
			infowindow.setContent(innerHTML);
			infowindow.open(map, marker);
			// Make sure the marker property is cleared if the infowindow is closed.
			infowindow.addListener('closeclick', function() {
				infowindow.marker = null;
			});
		}
	});
}

// this is evoked if a new input is search to remove the markers by emptying the markers array and removes the list in the Dom.
function hideMarkers(markers) {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
	}
	$('#list li').remove();
}

function resetSearch() {
	initMap();
}
