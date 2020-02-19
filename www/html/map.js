
function Map() {
    Page.call(this, "map");
    this.map           = null;
    this.popup         = null;
    this.tiles         = null;
    this.marker        = [];
    this.line          = [];
    this.dblClick      = {'ll': null, 'time': 0};

    // Leaflet controls
    //this.locationText = null;
    pgLocation.setCallback(this.updateLocation.bind(this));
}

Map.prototype = Object.create(Page.prototype);
Map.prototype.constructor = Map;

Map.prototype.update = function(show, data) {
    if(show) {
        this.data = data;
        pgLocation.locationChecker(true);
        if (!this.map) {
            this.createMap();
            this.resize();
        }

        pgLocation.getCurrentLocation(this.updateLocation.bind(this));
        this.addLines(this.data);
        this.addMarkers(this.data);
        this.center(false);
    }
    else {
        pgLocation.locationChecker(false);
    }
    return this.data;
};

Map.prototype.settings = function(show) {
    if(show) {
        $("#map_showMarkers").prop("checked", this.data.showMarkers).checkboxradio("refresh");
        $("#map_showPaths").prop("checked", this.data.showPaths).checkboxradio("refresh");
        $("#map_provider").val(this.data.provider).trigger("change");
    }
    else {
        this.data.showMarkers  = $("#map_showMarkers")[0].checked;
        this.data.showPaths    = $("#map_showPaths")[0].checked;
        this.data.provider     = $("#map_provider").val();
        this.data.lastPoint    = this.lastPoint;
        this.addTileLayer();
        this.addMarkers();
        this.addLines();
    }
};

Map.prototype.getPageData = function() {
    var data = pg.getPageData("map", pg.category());
    if(! ('showMarkers' in data))
        data.showMarkers = true;
    if(! ('showPaths' in data))
        data.showPaths = false;
    if(! ('provider' in data))
        data.provider = "OSM";
    if(! ('startTime' in data))
        data.startTime = 0;
    if(! ('lastPoint' in data))
        data.lastPoint = {"lat": 12.566512847456258, "lng": 99.94653224945068};
    return data;
};

Map.prototype.resize = function() {
    Page.prototype.resize.call(this, false);
    var win    = pgUI.getWindowDims();
    var height = win.height - this.headerHeight();
    var width  = win.width;

    var ctrlHeight = $("#mapControls").height();
    var mapid = document.getElementById("mapid");
    if(mapid) {
        $("#mapcontainer").height(height);
        $("#mapid").height(height);
        $("#mapid").width(width);
    }
    if(this.map) {
        this.map.invalidateSize();
    }
    $(".leaflet-bar").css("box-shadow", "none").css("border", "0px");
};

Map.prototype.updateLocation = function(path) {
    if(typeof(path)==="string") {
        pgUI.showDialog({title: "Location Error", true: "OK", false: "Cancel"},
                   "<p>Error message: " +path +"</p>" );
        return;
    }
    else if(path.length===0) {
        return;
    }
    var lat = 0;
    var lng = 0;
    var alt = 0;

    lat = path[path.length-1][1];
    lng = path[path.length-1][2];
    alt = path[path.length-1][3];
    this.lastPoint = {lat: lat, lng: lng, alt: alt};

    if(this.map) {
        // Move the marker to the current location
        this.marker[0].setLatLng(this.lastPoint);
        // Add a line to the map
        var p = [];
        for(var i=0; i<path.length; i++)
            p[i] = {lat: path[i][1],
                    lng: path[i][2]};
        this.line[0].setLatLngs(p);
    }
    // print lat-lng in lower left-hand corner.
    var html = lat.toFixed(3) + ", " + lng.toFixed(3);
    if(!this.map) {
        var t = pgUtil.getCurrentTime();
        var html = "<h2>" + html + "</h2>";
        html += "<p>" + Date(t).toLocaleString() + "</p>";
        $("#mapid").html(html);
    }
};

Map.prototype.onMapClick = function(e) {
    //if(!this.dblClick || 
    //   this.dblClick.time+800 < pgUtil.getCurrentTime())
    //    UI.map.closePopups();
    //return false;
};
Map.prototype.onMapDblClick = function(e) {
    this.center(false);
    //this.dblClick = {'ll': e.latlng, 'time': pgUtil.getCurrentTime()};
    //var txt = "<a href='' onclick='UI.map.markPoint(UI.map.dblClick.ll); return false;'>Create new marker</a>";
    //this.popup
    //.setLatLng(e.latlng)
    //.setContent(txt)
    //.openOn(this.map);
    //return false;
};

Map.prototype.markPoint = function(point) {
    if(!point.alt)
        point.alt = 0;
    var time = pgUtil.getCurrentTime();
    var event = { start: time,
                  duration: 0,
                  category: pg.category(),
                  page: "map",
                  type: "marker",
                  data: {location: [time, point.lat, point.lng, point.alt]} };
    event.data.title = "unnamed";
    pg.addNewEvents(event, true);
    this.addMarkers();
    UI.map.closePopups();
};

Map.prototype.center = function(doPopup) {
    // pan the map to the current location
    this.resize();
    pgLocation.getCurrentLocation(locationCB.bind(this, doPopup));
    return false;
    
    function locationCB(doPopup, path) {
        if(typeof(path)==="string" || path.length===0) {
            //showLog("Could not determine current location");
            return;
        }
        var lat = path[path.length-1][1];
        var lng = path[path.length-1][2];
        var alt = path[path.length-1][3];
        this.lastPoint = {lat: lat, lng: lng, alt: alt};
        UI.map.marker[0].setLatLng(this.lastPoint);
        UI.map.map.panTo(this.lastPoint);
        
        if(doPopup) {
	        // create a new marker event at the current location.
	        this.dblClick = {'ll': this.lastPoint, 'time': pgUtil.getCurrentTime()};
	        var txt = "<a href='' onclick='UI.map.markPoint(UI.map.dblClick.ll);return false;'>Create new marker</a>";
	        this.popup
	            .setLatLng(this.lastPoint)
	            .setContent(txt)
	            .openOn(this.map);
        }
    }
};

Map.prototype.createMap = function() {
    var latlng = {lat: this.data.lastPoint.lat, lng: this.data.lastPoint.lng};
    var opts = {
        zoomControl:        false,
        center:             latlng,
        zoom:               12,
        doubleClickZoom:    false,
        keyboard:           false,
        closePopupOnClick:  false
    };
    this.map = L.map('mapid', opts);
    this.popup = L.popup();
    this.addTileLayer();
    this.map.attributionControl.setPrefix(''); // the "powered by leaflet" control is a bit much.
    this.map.on('dblclick', this.onMapDblClick.bind(this));
    this.map.on('click', this.onMapClick.bind(this));
    this.addMarkers();
    this.addLines();
    //this.createButtons();
};

Map.prototype.addTileLayer = function() {
    var url, attrib;
    if(this.data.provider === "MapBox") {
        //url = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';
        url = 'https://{s}.tiles.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=';
        //url = 'https://{s}.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v2/{z}/{x}/{y}.png?access_token=';
        //url = 'https://{s}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/{z}/{x}/{y}.png?access_token=';
        //url = 'https://{s}.tiles.mapbox.com/v4/examples.map-i87786ca/{z}/{x}/{y}.png?access_token=';
        url += 'pk.eyJ1IjoicHN5Z3JhcGgiLCJhIjoiYkd1eWVITSJ9.tXut1t0FMolAcxZRowrlqw';
        attrib = '<a href="" onclick="pgUtil.openWeb(\'http://www.mapbox.com/about/maps\')" >Terms &amp; Feedback</a>';
    }
    else if(this.data.provider === "ArcGIS") {
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attrib = '<a href="" onclick="pgUtil.openWeb(\'http://www.esri.com\')" title="Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community" >Tiles &copy; Esri</a>';}
    else if(this.data.provider === "OSM") {
        url    = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attrib = 'Map data © <a href="" onclick="pgUtil.openWeb(\'http://openstreetmap.org\');">OpenStreetMap</a>';
    }
    if(this.tiles)
        this.map.removeLayer(this.tiles);
    if(pg.online) {
        this.tiles = L.tileLayer(url,
                                 {
                                     maxZoom: 18,
                                     attribution: attrib
                                 });
        if(this.map && this.tiles) {
            this.tiles.addTo(this.map);
        }
    }
};


    Map.prototype.closePopups = function() {
        UI.map.map.closePopup();
    };

Map.prototype.setMarkerName = function(id) {
    this.closePopups();
    // display a textinput popup to gather the marker name.
    var event    = pg.getEventFromID(id);
    var origName = event[E_DATA].title;
    var pos      = event[E_DATA].location[0];
    var latLng   = pos[1] + ", " + pos[2];
    var text =     "<div class='ui-field-contain no-field-separator'>"+
    "<label for='markerPos'>Location:</label>" +
    "<input type='text' id='markerPos' name='markerPos' value='"+latLng+"'/>"+
    "</div>"+
    "<div class='ui-field-contain no-field-separator'>"+
    "<label for='markerName'>Name:</label>" +
    "<input type='text' id='markerName' name='markerName' value='"+origName+"' data-clear-btn='true' />"+
    "</div>";

    pgUI.showDialog({title: origName, 'true': "OK", 'false': "Cancel", 'other': "Delete"},
               text,
               cb.bind(this)
    );

    function cb(val) {
        if(val) {
            var pos = document.getElementById('markerPos').value.split(",");
            var name = document.getElementById('markerName').value;
            if(val===2) { // delete the event
                pg.deleteEventIDs([id]);
            }
            else {
                event[E_DATA].location[0][1] = parseFloat(pos[0]);
                event[E_DATA].location[0][2] = parseFloat(pos[1]);
                event[E_DATA].title = name;
                var success = pg.changeEventAtID(id, event);
            }
            this.addMarkers(this.data);
        }
        resetPage();
    }
};

Map.prototype.showMarkerText = function(id) {
    // display the data.text
    var event    = pg.getEventFromID(id);
    var title    = event[E_DATA].title;
    var text     = "<p>" + event[E_DATA].text + "</p>";
    pgUI.showDialog({title: title, true: "OK", false: "Cancel"},
               text,
               cb.bind(this)
    );
    function cb(clickedOK) {
        resetPage();
    }
};

Map.prototype.addMarkers = function() {
    var markerIndex = this.marker.length;
    if(markerIndex === 0) {
        var latlng = {lat: this.data.lastPoint.lat, lng: this.data.lastPoint.lng};
        addMarker.call(this, markerIndex++, latlng);
    }
    // remove old markers
    while(markerIndex>1) {
        this.map.removeLayer(this.marker[--markerIndex]);
        this.marker.splice(markerIndex,1);
    }    
    var events;
    if( this.data.showMarkers )
        events = pg.getEvents(pg.category());
    else
        events = pg.getSelectedEvents(pg.category());
    for (var i=0; i<events.length; i++) {
        var e = pgUtil.parseEvent(events[i]);
        if(e &&
           (e.page==="note" || e.page==="stopwatch") &&
           typeof(e.data.location)!=="undefined" ) {
            addMarker.call(this, markerIndex++, e);
        }
    }
    function addMarker(index, e) {
        // in case we are being displayed from WP, get the base URL
        var path = "";
        if(pgUtil.isWebBrowser())
            path += document.location;
        var img;
        var latlng;
        var popText;
        if(index===0) {
            img = path + 'images/cursor.png';
            latlng = e;
            //popText = "lat: "+latlng.lat.toFixed(4)+", lng: "+latlng.lng.toFixed(4);
            //this.dblClick = {'ll': e, 'time': pgUtil.getCurrentTime()};
            popText = "<a href='' onclick='UI.map.markPoint(UI.map.lastPoint); return false;'>Create new marker</a>";
        }
        else {
            img = path + 'images/mark.png';
            latlng = {"lat": e.data.location[0][1], "lng": e.data.location[0][2]};
            popText = "<a href='' onclick='UI.map.setMarkerName("+e.id+");'>"+e.data.title+"</a>";
        }
        var image = L.icon({
                iconUrl: img,
                iconRetinaUrl: img,
                iconSize: [20,20],
                iconAnchor: [10,20],
                popupAnchor: [20,20]
            });
        // create the marker index if necessary
        if(this.marker.length > index) {
            this.marker[index].setLatLng(latlng);
        }
        else {
            this.marker[index] = new L.marker(latlng, {icon: image});
            this.marker[index].addTo(this.map);
        }
        // set the marker popup info
        var popOptions = {className: "mapPopup", offset: L.point(0,0)};
        this.marker[index].bindPopup(popText, popOptions);
        this.marker[index].on('mouseover', function (e) {
                UI.map.closePopups();
                this.openPopup();
            });
    }
};

Map.prototype.addLines = function() {
    var lineIndex = this.line.length;
    if(lineIndex === 0) {
        var latlng = {lat: this.data.lastPoint.lat, lng: this.data.lastPoint.lng};
        addLine.call(this, lineIndex++, [latlng]);
    }
    // remove old lines
    while(lineIndex>1) {
        this.map.removeLayer(this.line[--lineIndex]);
        this.line.splice(lineIndex,1);
    }
    //add new lines
    var events;
    if( this.data.showPaths )
        events = pg.getEvents(pg.category());
    else
        events = pg.getSelectedEvents(pg.category());
    for (var i=0; i<events.length; i++) {
        var e = pgUtil.parseEvent(events[i]);
        if(e &&
           e.type==="interval" &&
           typeof(e.data.location)!=="undefined" ) {
            var path = [];
            for(j=0; j<e.data.location.length; j++) {
                var dat = e.data.location[j];
                var latlng = {lat: dat[1], lng: dat[2]};
                path[path.length] = latlng;
            }
            if(path.length)
                addLine.call(this, lineIndex++, path);
        }
    }
    function addLine(index, p) {
        if(this.line.length > index) {
            this.line[index].setLatLngs(p);
        }
        else {
            var color = index===0 ? '#FF0000' : '#0000FF';
            this.line[index] = L.polyline(p, { 'color':   color,
                                               'opacity': 1.0,
                                               'weight':  2}
            );
            this.line[index].addTo(this.map);
        }
    }
};

UI.map = new Map();
//# sourceURL=map.js
