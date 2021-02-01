import {Page} from './page';
import {pg, E_DATA, E_PAGE} from '../pg';
import {pgUtil} from '../util';
import {pgUI} from '../ui';
//import {pgLocation} from '../signal/location';

import * as L from '../3p/leaflet.js';
import * as $ from 'jquery';

export class Map extends Page {
    map       = null;
    popup     = null;
    tiles     = null;
    marker    = [];
    line      = [];
    dblClick  = {'ll': null, 'time': 0};
    lastPoint = {lat: 0, lng: 0, alt: 0};
    pgLocation;
    elementID = null;
    
    constructor(opts) {
        super('map', opts);
        this.map = null;
        this.popup = null;
        this.tiles = null;
        this.marker = [];
        this.line = [];
        this.dblClick = {'ll': null, 'time': 0};
        this.pgLocation = opts.pgLocation;
    }
    init(opts) {
        if(!this.initialized){
            this.pgLocation.setCallback(this.updateLocation.bind(this));
        }
        super.init(opts);
        this.elementID = opts.elementID;
        this.createMap();
    }
    getPageData() {
        var data = super.getPageData();
        for(let cat of pg.categories) {
            if (!('showMarkers' in data[cat])) {
                data[cat].showMarkers = true;
            }
            if (!('showPaths' in data[cat])) {
                data[cat].showPaths = false;
            }
            if (!('provider' in data[cat])) {
                data[cat].provider = 'OSM';
            }
            if (!('startTime' in data[cat])) {
                data[cat].startTime = 0;
            }
            if (!('lastPoint' in data[cat])) {
                data[cat].lastPoint = {'lat': 42.0751096996, 'lng': -122.716790466};
            }
        }
        return data;
    }
    getAllProvidersNV() {
        const providers = [{value: 'OSM', name: 'Open Street Map'}, {value: 'MapBox', name: 'MapBox'}, {value: 'ArcGIS', name: 'ArcGIS'}];
        return providers;
    }
    updateView(show) {
        super.updateView(show);
        if (show) {
            this.pgLocation.start();
            this.pgLocation.getCurrentLocation(this.updateLocation.bind(this));
            this.addLines();
            this.addMarkers();
            this.center(false);
        } else {
            this.pgLocation.stop();
        }
    }
    /*
    resize(size = {height: 0, width: 0}) {
        if (super.needsResize(size)) {
            var height = size.height;
            var width = size.width;
            var mapid = document.getElementById('mapid');
            if (mapid) {
                $('#mapcontainer').height(height);
                $('#mapid').height(height);
                $('#mapid').width(width);
            }
            if (this.map) {
                this.map.invalidateSize();
            }
        }
        $('.leaflet-bar').css('box-shadow', 'none').css('border', '0px');
    }
    */
    updateLocation(path) {
        if (typeof (path) === 'string') {
            pgUI.showDialog({title: 'Location Error', true: 'OK', false: 'Cancel'}, '<p>Error message: ' + path + '</p>');
            return;
        } else if (path.length === 0) {
            return;
        }
        var lat = 0;
        var lng = 0;
        var alt = 0;
        
        lat = path[path.length - 1][1];
        lng = path[path.length - 1][2];
        alt = path[path.length - 1][3];
        this.lastPoint = {lat: lat, lng: lng, alt: alt};
        
        if (this.map) {
            // Move the marker to the current location
            this.marker[0].setLatLng(this.lastPoint);
            // Add a line to the map
            var p = [];
            for (var i = 0; i < path.length; i++) {
                p[i] = {
                    lat: path[i][1], lng: path[i][2]
                };
            }
            this.line[0].setLatLngs(p);
        }
        // print lat-lng in lower left-hand corner.
        var html = lat.toFixed(3) + ', ' + lng.toFixed(3);
        if (!this.map) {
            var t = pgUtil.getCurrentTime();
            var html = '<h2>' + html + '</h2>';
            html += '<p>' + new Date(t).toLocaleString() + '</p>';
            $(this.elementID).html(html);
        }
    }
    
    onMapClick(e) {
        //if(!this.dblClick ||
        //   this.dblClick.time+800 < pgUtil.getCurrentTime())
        //    pgUI.map.closePopups();
        //return false;
    }
    onMapDblClick(e) {
        this.center(false);
    }
    markPoint(point) {
        if (!point.alt) {
            point.alt = 0;
        }
        var time = pgUtil.getCurrentTime();
        var event = {
            start: time,
            duration: 0,
            category: pgUI.category(),
            page: 'map',
            type: 'marker',
            data: {location: [time, point.lat, point.lng, point.alt], title: 'unnamed'}
        };
        pg.addNewEvents(event, true);
        this.addMarkers();
        pgUI.map.closePopups();
    }
    center(doPopup) {
        // pan the map to the current location
        this.pgLocation.getCurrentLocation(locationCB.bind(this, doPopup));
        return false;
        
        function locationCB(doPopup, path) {
            if (typeof (path) === 'string' || path.length === 0) {
                //showLog("Could not determine current location");
                return;
            }
            var lat = path[path.length - 1][1];
            var lng = path[path.length - 1][2];
            var alt = path[path.length - 1][3];
            this.lastPoint = {lat: lat, lng: lng, alt: alt};
            this.marker[0].setLatLng(this.lastPoint);
            this.map.panTo(this.lastPoint);
            
            if (doPopup) {
                // create a new marker event at the current location.
                this.dblClick = {'ll': this.lastPoint, 'time': pgUtil.getCurrentTime()};
                var txt = '<div onclick="pgUI.map.markPoint(pgUI.map.dblClick.ll)">Create new marker</div>';
                this.popup
                    .setLatLng(this.lastPoint)
                    .setContent(txt)
                    .openOn(this.map);
            }
        }
    }
    
    createMap(cat=pgUI.category()) {
        var latlng = {lat: this.pageData[cat].lastPoint.lat, lng: this.pageData[cat].lastPoint.lng};
        var opts = {
            zoomControl: false, center: latlng, zoom: 12, doubleClickZoom: false, keyboard: false, closePopupOnClick: false
        };
        this.map = L.map(this.elementID, opts);
        this.popup = L.popup();
        this.addTileLayer();
        this.map.attributionControl.setPrefix(''); // the "powered by leaflet" control is a bit much.
        this.map.on('dblclick', this.onMapDblClick.bind(this));
        this.map.on('click', this.onMapClick.bind(this));
        this.addMarkers();
        this.addLines();
        //this.createButtons();
    }
    addTileLayer(cat=pgUI.category()) {
        var url, attrib;
        if (this.pageData[cat].provider === 'MapBox') {
            //url = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';
            url = 'https://{s}.tiles.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=';
            //url = 'https://{s}.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v2/{z}/{x}/{y}.png?access_token=';
            //url = 'https://{s}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/{z}/{x}/{y}.png?access_token=';
            //url = 'https://{s}.tiles.mapbox.com/v4/examples.map-i87786ca/{z}/{x}/{y}.png?access_token=';
            url += 'pk.eyJ1IjoicHN5Z3JhcGgiLCJhIjoiYkd1eWVITSJ9.tXut1t0FMolAcxZRowrlqw';
            attrib = '<a href="#" onclick="pgUI.openWeb(\'http://www.mapbox.com/about/maps\')" >Terms &amp; Feedback</a>';
        } else if (this.pageData[cat].provider === 'ArcGIS') {
            url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
            attrib = '<a href="#" onclick="pgUI.openWeb(\'http://www.esri.com\')" title="Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community" >Tiles &copy; Esri</a>';
        } else if (this.pageData[cat].provider === 'OSM') {
            url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            attrib = 'Map data © <a href="#" onclick="pgUI.openWeb(\'http://openstreetmap.org\');">OpenStreetMap</a>';
        }
        if (this.tiles) {
            this.map.removeLayer(this.tiles);
        }
        if (pg.online) {
            this.tiles = L.tileLayer(url, {
                maxZoom: 18, attribution: attrib
            });
            if (this.map && this.tiles) {
                this.tiles.addTo(this.map);
            }
        }
    }
    
    closePopups() {
        pgUI.map.map.closePopup();
    }
    setMarkerName(id, cat=pgUI.category()) {
        this.closePopups();
        // display a textinput popup to gather the marker name.
        var event = pg.getEventFromID(id);
        var title = event[E_DATA].title || (event[E_PAGE] + " event");
        var origName = event[E_DATA].title;
        var pos = event[E_DATA].location[0];
        var latLng = pos[1] + ', ' + pos[2];
        var content = `
            <ion-item>
                <ion-label>Location:</ion-label>
                <ion-input type='text' id='markerPos' name='markerPos' value='` + latLng + `'></ion-input>
            </ion-item>
            <ion-item>
                <ion-label>Name:</ion-label>
                <ion-input type='text' id='markerName' name='markerName' value='` + origName + `'></ion-input>
            </ion-item>
            <ion-item>
                <ion-label>Delete marker:</ion-label>
                <ion-checkbox id="deleteMarker" checked="false"></ion-checkbox>
            </ion-item>
            `;
        let opts = {'title': title, 'true': 'OK', 'false': 'Cancel', 'gather': gatherData};
        pgUI.showDialog(opts, content, dataCB.bind(this));
        
        function gatherData() {
            return {
                'pos': $('#markerPos').val().split(','),
                'name': $('#markerName').val(),
                'delete': $('#deleteMarker').attr('aria-checked') == "true",
            };
        }
        function dataCB(success, data) {
            if (success) {
                if (data.delete) { // delete the event
                    pg.deleteEventIDs([id]);
                } else {
                    event[E_DATA].location[0][1] = parseFloat(data.pos[0]);
                    event[E_DATA].location[0][2] = parseFloat(data.pos[1]);
                    event[E_DATA].title = data.name;
                    const success = pg.changeEventAtID(id, event);
                }
                this.addMarkers(this.pageData[cat]);
            }
            pgUI.resetPage();
        }
    }
    showMarkerText(id) {
        // display the data.text
        var event = pg.getEventFromID(id);
        var title = event[E_DATA].title;
        var content = '<p>' + event[E_DATA].text + '</p>';
        pgUI.showDialog({title: title, true: 'OK', false: 'Cancel'}, content, cb.bind(this));
        
        function cb(clickedOK) {
            pgUI.resetPage();
        }
    }
    addMarkers(cat=pgUI.category()) {
        var markerIndex = this.marker.length;
        if (markerIndex === 0) {
            var latlng = {lat: this.pageData[cat].lastPoint.lat, lng: this.pageData[cat].lastPoint.lng};
            addMarker.call(this, markerIndex++, latlng);
        }
        // remove old markers
        while (markerIndex > 1) {
            this.map.removeLayer(this.marker[--markerIndex]);
            this.marker.splice(markerIndex, 1);
        }
        var events;
        if (this.pageData[cat].showMarkers) {
            events = pg.getEvents(pgUI.category());
        } else {
            events = pg.getSelectedEvents(pgUI.category());
        }
        for (var i = 0; i < events.length; i++) {
            var e = pg.parseEvent(events[i]);
            if (e && (e.page === 'note' || e.page === 'stopwatch') && ('location' in e.data) && e.data.location) {
                addMarker.call(this, markerIndex++, e);
            }
        }
        
        function addMarker(index, e) {
            // in case we are being displayed from WP, get the base URL
            var path = "";
            if (pgUtil.isWebBrowser) {
                path += pgUtil.appURL + '/';
            }
            var img;
            var latlng;
            var popText;
            if (index === 0) {
                img = path + 'assets/img/cursor.png';
                latlng = e;
                //popText = "lat: "+latlng.lat.toFixed(4)+", lng: "+latlng.lng.toFixed(4);
                //this.dblClick = {'ll': e, 'time': pgUtil.getCurrentTime()};
                popText = '<button onclick="pgUI.map.markPoint(pgUI.map.lastPoint)">Create new marker</button>';
            } else {
                img = path + 'assets/img/mark.png';
                latlng = {'lat': e.data.location[0][1], 'lng': e.data.location[0][2]};
                popText = '<button onclick="pgUI.map.setMarkerName(' + e.id + ')">' +e.data.title+ '</button>';
            }
            var image = L.icon({
                iconUrl: img, iconRetinaUrl: img, iconSize: [20, 20], iconAnchor: [10, 20], popupAnchor: [20, 20]
            });
            // create the marker index if necessary
            if (this.marker.length > index) {
                this.marker[index].setLatLng(latlng);
            } else {
                this.marker[index] = L.marker(latlng, {icon: image});
                this.marker[index].addTo(this.map);
            }
            // set the marker popup info
            var popOptions = {className: 'mapPopup', offset: L.point(0, 0)};
            this.marker[index].bindPopup(popText, popOptions);
            this.marker[index].on('mouseover', function(e) {
                pgUI.map.closePopups();
                this.openPopup();
            });
        }
    }
    addLines(cat=pgUI.category()) {
        var lineIndex = this.line.length;
        if (lineIndex === 0) {
            var latlng = {lat: this.pageData[cat].lastPoint.lat, lng: this.pageData[cat].lastPoint.lng};
            addLine.call(this, lineIndex++, [latlng]);
        }
        // remove old lines
        while (lineIndex > 1) {
            this.map.removeLayer(this.line[--lineIndex]);
            this.line.splice(lineIndex, 1);
        }
        //add new lines
        var events;
        if (this.pageData[cat].showPaths) {
            events = pg.getEvents(pgUI.category());
        } else {
            events = pg.getSelectedEvents(pgUI.category());
        }
        for (let i = 0; i < events.length; i++) {
            var e = pg.parseEvent(events[i]);
            if (e && e.type === 'interval' && typeof (e.data.location) !== 'undefined') {
                var path = [];
                for (let j = 0; j < e.data.location.length; j++) {
                    var dat = e.data.location[j];
                    var latlng = {lat: dat[1], lng: dat[2]};
                    path[path.length] = latlng;
                }
                if (path.length) {
                    addLine.call(this, lineIndex++, path);
                }
            }
        }
        
        function addLine(index, p) {
            if (this.line.length > index) {
                this.line[index].setLatLngs(p);
            } else {
                var color = index === 0 ? '#FF0000' : '#0000FF';
                this.line[index] = L.polyline(p, {
                    'color': color, 'opacity': 1.0, 'weight': 2
                });
                this.line[index].addTo(this.map);
            }
        }
    }
}
