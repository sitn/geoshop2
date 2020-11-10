{% extends "gis/admin/openlayers.js" %}
{% block base_layer %}new OpenLayers.Layer.OSM("OpenStreetMap", [
    '//a.tile.openstreetmap.org/${z}/${x}/${y}.png',
    '//b.tile.openstreetmap.org/${z}/${x}/${y}.png',
    '//c.tile.openstreetmap.org/${z}/${x}/${y}.png'
], 
null);{% endblock %}