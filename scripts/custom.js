{% extends "gis/admin/openlayers.js" %}
{% block map_options %}
var options = {
    projection: new OpenLayers.Projection('EPSG:2056'),
    resolutions: [250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.125, 0.0625],
    units: 'm',
    maxExtent: new OpenLayers.Bounds(2420000.0, 1030000.0, 2900000.0, 1360000.0),
    tileSize: new OpenLayers.Size(256, 256)
};
{% endblock %}
{% block base_layer %}new OpenLayers.Layer.WMTS({
    name: "WMTS plan_cadastral",
    url: "https://sitn.ne.ch/mapproxy95/wmts/1.0.0/plan_cadastral/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
    layer: 'plan_cadastral',
    matrixSet: 'EPSG2056',
    format: 'png',
    isBaseLayer: true,
    style: 'default',
    requestEncoding: 'REST'
});
{% endblock %}
