import Cartesian2 from '../Core/Cartesian2.js';
import Cartesian3 from '../Core/Cartesian3.js';
// import Cartographic from '../Core/Cartographic.js';
import Credit from '../Core/Credit.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import DeveloperError from '../Core/DeveloperError.js';
import Event from '../Core/Event.js';
// import GeographicProjection from '../Core/GeographicProjection.js';
import GeographicTilingScheme from '../Core/GeographicTilingScheme.js';
// import CesiumMath from '../Core/Math.js';
import Rectangle from '../Core/Rectangle.js';
import Resource from '../Core/Resource.js';
// import RuntimeError from '../Core/RuntimeError.js';
import TileProviderError from '../Core/TileProviderError.js';
import WebMercatorProjection from '../Core/WebMercatorProjection.js';
import WebMercatorTilingScheme from '../Core/WebMercatorTilingScheme.js';
import when from '../ThirdParty/when.js';
import DiscardMissingTileImagePolicy from './DiscardMissingTileImagePolicy.js';
// import ImageryLayerFeatureInfo from './ImageryLayerFeatureInfo.js';
import ImageryProvider from './ImageryProvider.js';

    /**
     * Provides tiled imagery hosted by an ArcGIS MapServer.  By default, the server's pre-cached tiles are
     * used, if available.
     *
     * @alias ArcGisMapServerImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Resource|String} options.url The URL of the ArcGIS MapServer service.
     * @param {String} [options.token] The ArcGIS token used to authenticate with the ArcGIS MapServer service.
     * @param {TileDiscardPolicy} [options.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded.  If this value is not specified, a default
     *        {@link DiscardMissingTileImagePolicy} is used for tiled map servers, and a
     *        {@link NeverTileDiscardPolicy} is used for non-tiled map servers.  In the former case,
     *        we request tile 0,0 at the maximum tile level and check pixels (0,0), (200,20), (20,200),
     *        (80,110), and (160, 130).  If all of these pixels are transparent, the discard check is
     *        disabled and no tiles are discarded.  If any of them have a non-transparent color, any
     *        tile that has the same values in these pixel locations is discarded.  The end result of
     *        these defaults should be correct tile discarding for a standard ArcGIS Server.  To ensure
     *        that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this
     *        parameter.
     * @param {Boolean} [options.usePreCachedTilesIfAvailable=true] If true, the server's pre-cached
     *        tiles are used if they are available.  If false, any pre-cached tiles are ignored and the
     *        'export' service is used.
     * @param {String} [options.layers] A comma-separated list of the layers to show, or undefined if all layers should be shown.
     * @param {Boolean} [options.enablePickFeatures=true] If true, {@link ArcGisMapServerImageryProvider#pickFeatures} will invoke
     *        the Identify service on the MapServer and return the features included in the response.  If false,
     *        {@link ArcGisMapServerImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable features)
     *        without communicating with the server.  Set this property to false if you don't want this provider's features to
     *        be pickable. Can be overridden by setting the {@link ArcGisMapServerImageryProvider#enablePickFeatures} property on the object.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle of the layer.  This parameter is ignored when accessing
     *                    a tiled layer.
     * @param {TilingScheme} [options.tilingScheme=new GeographicTilingScheme()] The tiling scheme to use to divide the world into tiles.
     *                       This parameter is ignored when accessing a tiled server.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified and used,
     *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
     *                    parameter is specified, the WGS84 ellipsoid is used.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.  This parameter is ignored when accessing a tiled server.
     * @param {Number} [options.tileWidth=256] The width of each tile in pixels.  This parameter is ignored when accessing a tiled server.
     * @param {Number} [options.tileHeight=256] The height of each tile in pixels.  This parameter is ignored when accessing a tiled server.
     * @param {Number} [options.maximumLevel] The maximum tile level to request, or undefined if there is no maximum.  This parameter is ignored when accessing
     *                                        a tiled server.
     *
     * @see BingMapsImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see UrlTemplateImageryProvider
     *
     *
     * @example
     * var esri = new Cesium.ArcGisMapServerImageryProvider({
     *     url : 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
     * });
     *
     * @see {@link https://developers.arcgis.com/rest/|ArcGIS Server REST API}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     */
    function ArcGisMapServerImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        var resource = Resource.createIfNeeded(options.url);
        resource.appendForwardSlash();

        if (defined(options.token)) {
            resource.setQueryParameters({
                token: options.token
            });
        }

        this._resource = resource;
        this._tileDiscardPolicy = options.tileDiscardPolicy;

        this._tileWidth = defaultValue(options.tileWidth, 256);
        this._tileHeight = defaultValue(options.tileHeight, 256);
        this._maximumLevel = options.maximumLevel;
        this._tilingScheme = defaultValue(options.tilingScheme, new GeographicTilingScheme({ ellipsoid : options.ellipsoid }));
        this._useTiles = defaultValue(options.usePreCachedTilesIfAvailable, true);
        this._rectangle = defaultValue(options.rectangle, this._tilingScheme.rectangle);
        this._layers = options.layers;

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        /**
         * Gets or sets a value indicating whether feature picking is enabled.  If true, {@link ArcGisMapServerImageryProvider#pickFeatures} will
         * invoke the "identify" operation on the ArcGIS server and return the features included in the response.  If false,
         * {@link ArcGisMapServerImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable features)
         * without communicating with the server.
         * @type {Boolean}
         * @default true
         */
        this.enablePickFeatures = defaultValue(options.enablePickFeatures, true);

        this._errorEvent = new Event();

        this._ready = false;
        this._readyPromise = when.defer();

        // Grab the details of this MapServer.
        var that = this;
        var metadataError;

        function metadataSuccess(data) {
            var tileInfo = data.tileInfo;
            if (!defined(tileInfo)) {
                that._useTiles = false;
            } else {
                if (tileInfo.spatialReference.wkid === 102100 ||
                    tileInfo.spatialReference.wkid === 102113) {
                    that._tilingScheme = new WebMercatorTilingScheme({ ellipsoid : options.ellipsoid });
                } else if (data.tileInfo.spatialReference.wkid === 4326) {
                    that._tilingScheme = new GeographicTilingScheme({ ellipsoid : options.ellipsoid });
                } else {
                    var message = 'Tile spatial reference WKID ' + data.tileInfo.spatialReference.wkid + ' is not supported.';
                    metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
                    return;
                }
                that._maximumLevel = data.tileInfo.lods.length - 1;

                if (defined(data.fullExtent)) {
                    if (defined(data.fullExtent.spatialReference) && defined(data.fullExtent.spatialReference.wkid)) {
                        if (data.fullExtent.spatialReference.wkid === 102100 ||
                            data.fullExtent.spatialReference.wkid === 102113) {

                            var projection = new WebMercatorProjection();
                            var extent = data.fullExtent;
                            var sw = projection.unproject(new Cartesian3(Math.max(extent.xmin, -that._tilingScheme.ellipsoid.maximumRadius * Math.PI), Math.max(extent.ymin, -that._tilingScheme.ellipsoid.maximumRadius * Math.PI), 0.0));
                            var ne = projection.unproject(new Cartesian3(Math.min(extent.xmax, that._tilingScheme.ellipsoid.maximumRadius * Math.PI), Math.min(extent.ymax, that._tilingScheme.ellipsoid.maximumRadius * Math.PI), 0.0));
                            that._rectangle = new Rectangle(sw.longitude, sw.latitude, ne.longitude, ne.latitude);
                        } else if (data.fullExtent.spatialReference.wkid === 4326) {
                            that._rectangle = Rectangle.fromDegrees(data.fullExtent.xmin, data.fullExtent.ymin, data.fullExtent.xmax, data.fullExtent.ymax);
                        } else {
                            var extentMessage = 'fullExtent.spatialReference WKID ' + data.fullExtent.spatialReference.wkid + ' is not supported.';
                            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, extentMessage, undefined, undefined, undefined, requestMetadata);
                            return;
                        }
                    }
                } else {
                    that._rectangle = that._tilingScheme.rectangle;
                }

                // Install the default tile discard policy if none has been supplied.
                if (!defined(that._tileDiscardPolicy)) {
                    that._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
                        missingImageUrl : buildImageResource(that, 0, 0, that._maximumLevel).url,
                        pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)],
                        disableCheckIfAllPixelsAreTransparent : true
                    });
                }

                that._useTiles = true;
            }

            if (defined(data.copyrightText) && data.copyrightText.length > 0) {
                that._credit = new Credit(data.copyrightText);
            }

            that._ready = true;
            that._readyPromise.resolve(true);
            TileProviderError.handleSuccess(metadataError);
        }

        if (this._useTiles) {
            metadataSuccess({
                // currentVersion: 10.6,
                // serviceDescription:
                //   'World Imagery provides one meter or better satellite and aerial imagery in many parts of the world and lower resolution satellite imagery worldwide. The map includes 15m TerraColor imagery at small and mid-scales (591M down to 72k) and 2.5m SPOT Imagery (288k to 72k) for the world, and USGS 15m Landsat imagery for Antarctica. The map features 0.3m resolution imagery in the continental United States and 0.6m resolution imagery in parts of Western Europe from Digital Globe. Recent 1m USDA NAIP imagery is available in select states of the US. In other parts of the world, 1 meter resolution imagery is available from GeoEye IKONOS, AeroGRID, and IGN Spain. Additionally, imagery at different resolutions has been contributed by the GIS User Community. For more information on this map, including the terms of use, visit us <a href="http://goto.arcgisonline.com/maps/World_Imagery " target="_new" >online</a>.',
                // mapName: 'Layers',
                // description:
                //   'World Imagery provides one meter or better satellite and aerial imagery in many parts of the world and lower resolution satellite imagery worldwide. The map includes 15m TerraColor imagery at small and mid-scales (591M down to 72k) and 2.5m SPOT Imagery (288k to 72k) for the world, and USGS 15m Landsat imagery for Antarctica. The map features 0.3m resolution imagery in the continental United States and 0.6m resolution imagery in parts of Western Europe from Digital Globe. Recent 1m USDA NAIP imagery is available in select states of the US. In other parts of the world, 1 meter resolution imagery is available from GeoEye IKONOS, AeroGRID, and IGN Spain. Additionally, imagery at different resolutions has been contributed by the GIS User Community. For more information on this map, including the terms of use, visit us online at http://goto.arcgisonline.com/maps/World_Imagery',
                // copyrightText:
                //   'Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
                // supportsDynamicLayers: false,
                layers: [
                  {
                    id: 0,
                    name: 'World Imagery',
                    parentLayerId: -1,
                    defaultVisibility: true,
                    subLayerIds: null,
                    minScale: 0,
                    maxScale: 0
                  },
                  {
                    id: 1,
                    name: 'Low Resolution 15m Imagery',
                    parentLayerId: -1,
                    defaultVisibility: true,
                    subLayerIds: null,
                    minScale: 0,
                    maxScale: 0
                  },
                  {
                    id: 2,
                    name: 'High Resolution 60cm Imagery',
                    parentLayerId: -1,
                    defaultVisibility: true,
                    subLayerIds: null,
                    minScale: 0,
                    maxScale: 0
                  },
                  {
                    id: 3,
                    name: 'High Resolution 30cm Imagery',
                    parentLayerId: -1,
                    defaultVisibility: true,
                    subLayerIds: null,
                    minScale: 0,
                    maxScale: 0
                  },
                  {
                    id: 4,
                    name: 'Citations',
                    parentLayerId: -1,
                    defaultVisibility: true,
                    subLayerIds: null,
                    minScale: 0,
                    maxScale: 0
                  }
                ],
                tables: [],
                spatialReference: {
                  wkid: 102100,
                  latestWkid: 3857
                },
                singleFusedMapCache: true,
                tileInfo: {
                  rows: 256,
                  cols: 256,
                  dpi: 96,
                  format: 'JPEG',
                  compressionQuality: 75,
                  origin: {
                    x: -2.0037508342787e7,
                    y: 2.0037508342787e7
                  },
                  spatialReference: {
                    wkid: 102100,
                    latestWkid: 3857
                  },
                  lods: [
                    {
                      level: 0,
                      resolution: 156543.03392800014,
                      scale: 5.91657527591555e8
                    },
                    {
                      level: 1,
                      resolution: 78271.51696399994,
                      scale: 2.95828763795777e8
                    },
                    {
                      level: 2,
                      resolution: 39135.75848200009,
                      scale: 1.47914381897889e8
                    },
                    {
                      level: 3,
                      resolution: 19567.87924099992,
                      scale: 7.3957190948944e7
                    },
                    {
                      level: 4,
                      resolution: 9783.93962049996,
                      scale: 3.6978595474472e7
                    },
                    {
                      level: 5,
                      resolution: 4891.96981024998,
                      scale: 1.8489297737236e7
                    },
                    {
                      level: 6,
                      resolution: 2445.98490512499,
                      scale: 9244648.868618
                    },
                    {
                      level: 7,
                      resolution: 1222.992452562495,
                      scale: 4622324.434309
                    },
                    {
                      level: 8,
                      resolution: 611.4962262813797,
                      scale: 2311162.217155
                    },
                    {
                      level: 9,
                      resolution: 305.74811314055756,
                      scale: 1155581.108577
                    },
                    {
                      level: 10,
                      resolution: 152.87405657041106,
                      scale: 577790.554289
                    },
                    {
                      level: 11,
                      resolution: 76.43702828507324,
                      scale: 288895.277144
                    },
                    {
                      level: 12,
                      resolution: 38.21851414253662,
                      scale: 144447.638572
                    },
                    {
                      level: 13,
                      resolution: 19.10925707126831,
                      scale: 72223.819286
                    },
                    {
                      level: 14,
                      resolution: 9.554628535634155,
                      scale: 36111.909643
                    },
                    {
                      level: 15,
                      resolution: 4.77731426794937,
                      scale: 18055.954822
                    },
                    {
                      level: 16,
                      resolution: 2.388657133974685,
                      scale: 9027.977411
                    },
                    {
                      level: 17,
                      resolution: 1.1943285668550503,
                      scale: 4513.988705
                    },
                    {
                      level: 18,
                      resolution: 0.5971642835598172,
                      scale: 2256.994353
                    },
                    {
                      level: 19,
                      resolution: 0.29858214164761665,
                      scale: 1128.497176
                    },
                    {
                      level: 20,
                      resolution: 0.14929107082380833,
                      scale: 564.248588
                    },
                    {
                      level: 21,
                      resolution: 0.07464553541190416,
                      scale: 282.124294
                    },
                    {
                      level: 22,
                      resolution: 0.03732276770595208,
                      scale: 141.062147
                    },
                    {
                      level: 23,
                      resolution: 0.01866138385297604,
                      scale: 70.5310735
                    }
                  ]
                },
                initialExtent: {
                  xmin: -2.003750722959434e7,
                  ymin: -1.997186888040859e7,
                  xmax: 2.003750722959434e7,
                  ymax: 1.9971868880408563e7,
                  spatialReference: {
                    wkid: 102100,
                    latestWkid: 3857
                  }
                },
                fullExtent: {
                  xmin: -2.003750722959434e7,
                  ymin: -1.997186888040859e7,
                  xmax: 2.003750722959434e7,
                  ymax: 1.9971868880408563e7,
                  spatialReference: {
                    wkid: 102100,
                    latestWkid: 3857
                  }
                }
                // minScale: 0,
                // maxScale: 0,
                // units: 'esriMeters',
                // supportedImageFormatTypes:
                //   'PNG32,PNG24,PNG,JPG,DIB,TIFF,EMF,PS,PDF,GIF,SVG,SVGZ,BMP',
                // documentInfo: {
                //   Title: 'World Imagery',
                //   Author: 'Esri',
                //   Comments: '',
                //   Subject: 'imagery, satellite, aerial, 500m (World), 15m (World)',
                //   Category: 'imageryBaseMapsEarthCover (Imagery, basemaps, and land cover)',
                //   AntialiasingMode: 'None',
                //   TextAntialiasingMode: 'Force',
                //   Keywords: 'World,Global,United States'
                // },
                // capabilities: 'Map,Tilemap,Query,Data',
                // supportedQueryFormats: 'JSON, AMF, geoJSON',
                // exportTilesAllowed: false,
                // datumTransformations: [
                //   {
                //     geoTransforms: [
                //       {
                //         wkid: 108001,
                //         latestWkid: 1241,
                //         transformForward: true,
                //         name: 'NAD_1927_To_NAD_1983_NADCON'
                //       }
                //     ]
                //   },
                //   {
                //     geoTransforms: [
                //       {
                //         wkid: 108001,
                //         latestWkid: 1241,
                //         transformForward: false,
                //         name: 'NAD_1927_To_NAD_1983_NADCON'
                //       }
                //     ]
                //   }
                // ],
                // supportsDatumTransformation: true,
                // maxRecordCount: 100,
                // maxImageHeight: 4096,
                // maxImageWidth: 4096,
                // supportedExtensions: 'KmlServer'
              });
        } else {
            this._ready = true;
            this._readyPromise.resolve(true);
        }
    }

    function buildImageResource(imageryProvider, x, y, level, request) {
        var resource;
        // if (imageryProvider._useTiles) {
            resource = imageryProvider._resource.getDerivedResource({
                url: 'tile/' + level + '/' + y + '/' + x,
                request: request
            });
        // } else {
        //     var nativeRectangle = imageryProvider._tilingScheme.tileXYToNativeRectangle(x, y, level);
        //     var bbox = nativeRectangle.west + ',' + nativeRectangle.south + ',' + nativeRectangle.east + ',' + nativeRectangle.north;

        //     var query = {
        //         bbox: bbox,
        //         size: imageryProvider._tileWidth + ',' + imageryProvider._tileHeight,
        //         format: 'png',
        //         transparent: true,
        //         f: 'image'
        //     };

        //     if (imageryProvider._tilingScheme.projection instanceof GeographicProjection) {
        //         query.bboxSR = 4326;
        //         query.imageSR = 4326;
        //     } else {
        //         query.bboxSR = 3857;
        //         query.imageSR = 3857;
        //     }
        //     if (imageryProvider.layers) {
        //         query.layers = 'show:' + imageryProvider.layers;
        //     }

        //     resource = imageryProvider._resource.getDerivedResource({
        //         url: 'export',
        //         request: request,
        //         queryParameters: query
        //     });
        // }

        return resource;
    }

    defineProperties(ArcGisMapServerImageryProvider.prototype, {
        /**
         * Gets the URL of the ArcGIS MapServer.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._resource._url;
            }
        },

        /**
         * Gets the ArcGIS token used to authenticate with the ArcGis MapServer service.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        token : {
            get : function() {
                return this._resource.queryParameters.token;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._resource.proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileWidth must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileHeight: {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileHeight must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        maximumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('maximumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._maximumLevel;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('minimumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return 0;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tilingScheme must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('rectangle must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         */
        tileDiscardPolicy : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileDiscardPolicy must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileDiscardPolicy;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
         * @memberof ArcGisMapServerImageryProvider.prototype
         * @type {Credit}
         * @readonly
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets a value indicating whether this imagery provider is using pre-cached tiles from the
         * ArcGIS MapServer.  If the imagery provider is not yet ready ({@link ArcGisMapServerImageryProvider#ready}), this function
         * will return the value of `options.usePreCachedTilesIfAvailable`, even if the MapServer does
         * not have pre-cached tiles.
         * @memberof ArcGisMapServerImageryProvider.prototype
         *
         * @type {Boolean}
         * @readonly
         * @default true
         */
        usingPrecachedTiles : {
            get : function() {
                return this._useTiles;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof ArcGisMapServerImageryProvider.prototype
         *
         * @type {Boolean}
         * @readonly
         * @default true
         */
        hasAlphaChannel : {
            get : function() {
                return true;
            }
        },

        /**
         * Gets the comma-separated list of layer IDs to show.
         * @memberof ArcGisMapServerImageryProvider.prototype
         *
         * @type {String}
         */
        layers : {
            get : function() {
                return this._layers;
            }
        }
    });

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    ArcGisMapServerImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link ArcGisMapServerImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<Image|Canvas>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    ArcGisMapServerImageryProvider.prototype.requestImage = function(x, y, level, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return ImageryProvider.loadImage(this, buildImageResource(this, x, y, level, request));
    };

    /**
    /**
     * Asynchronously determines what features, if any, are located at a given longitude and latitude within
     * a tile.  This function should not be called before {@link ImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *
     * @exception {DeveloperError} <code>pickFeatures</code> must not be called before the imagery provider is ready.
     */
    // ArcGisMapServerImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
    //     //>>includeStart('debug', pragmas.debug);
    //     if (!this._ready) {
    //         throw new DeveloperError('pickFeatures must not be called before the imagery provider is ready.');
    //     }
    //     //>>includeEnd('debug');

    //     if (!this.enablePickFeatures) {
    //         return undefined;
    //     }

    //     var rectangle = this._tilingScheme.tileXYToNativeRectangle(x, y, level);

    //     var horizontal;
    //     var vertical;
    //     var sr;
    //     if (this._tilingScheme.projection instanceof GeographicProjection) {
    //         horizontal = CesiumMath.toDegrees(longitude);
    //         vertical = CesiumMath.toDegrees(latitude);
    //         sr = '4326';
    //     } else {
    //         var projected = this._tilingScheme.projection.project(new Cartographic(longitude, latitude, 0.0));
    //         horizontal = projected.x;
    //         vertical = projected.y;
    //         sr = '3857';
    //     }

    //     var layers = 'visible';
    //     if (defined(this._layers)) {
    //         layers += ':' + this._layers;
    //     }

    //     var query = {
    //         f: 'json',
    //         tolerance: 2,
    //         geometryType: 'esriGeometryPoint',
    //         geometry: horizontal + ',' + vertical,
    //         mapExtent: rectangle.west + ',' + rectangle.south + ',' + rectangle.east + ',' + rectangle.north,
    //         imageDisplay: this._tileWidth + ',' + this._tileHeight + ',96',
    //         sr: sr,
    //         layers: layers
    //     };

    //     var resource = this._resource.getDerivedResource({
    //         url: 'identify',
    //         queryParameters: query
    //     });

    //     return resource.fetchJson().then(function(json) {
    //         var result = [];

    //         var features = json.results;
    //         if (!defined(features)) {
    //             return result;
    //         }

    //         for (var i = 0; i < features.length; ++i) {
    //             var feature = features[i];

    //             var featureInfo = new ImageryLayerFeatureInfo();
    //             featureInfo.data = feature;
    //             featureInfo.name = feature.value;
    //             featureInfo.properties = feature.attributes;
    //             featureInfo.configureDescriptionFromProperties(feature.attributes);

    //             // If this is a point feature, use the coordinates of the point.
    //             if (feature.geometryType === 'esriGeometryPoint' && feature.geometry) {
    //                 var wkid = feature.geometry.spatialReference && feature.geometry.spatialReference.wkid ? feature.geometry.spatialReference.wkid : 4326;
    //                 if (wkid === 4326 || wkid === 4283) {
    //                     featureInfo.position = Cartographic.fromDegrees(feature.geometry.x, feature.geometry.y, feature.geometry.z);
    //                 } else if (wkid === 102100 || wkid === 900913 || wkid === 3857) {
    //                     var projection = new WebMercatorProjection();
    //                     featureInfo.position = projection.unproject(new Cartesian3(feature.geometry.x, feature.geometry.y, feature.geometry.z));
    //                 }
    //             }

    //             result.push(featureInfo);
    //         }

    //         return result;
    //     });
    // };
export default ArcGisMapServerImageryProvider;
