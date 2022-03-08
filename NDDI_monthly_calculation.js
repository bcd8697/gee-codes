// In order to use this script, please, don't forget to define 'geometry' of the field you would like to save as a GeoTIFF file

// Choose the field for NDDI calculation
var div1 = ee.FeatureCollection("users/kirill8697/layer_Division17");
print(div1)

// Define folder for exporting images in Google Drive
var exportFolderMin = '2011_Division_17_Min'
var exportFolderMax = '2011_Division_17_Max'

// Define Research Time
var start = ee.Date('2011-08-01');
var end = ee.Date('2011-12-31');

// Define months and years List-variables to filter out the data further
var months = ee.List.sequence(8, 12);
var years = ee.List.sequence(2011, 2011);

// -------------------------------------------------
// NDWI
// -------------------------------------------------
var dataset = ee.ImageCollection('LANDSAT/LE07/C01/T1_8DAY_NDWI')
                  .filterDate(start, end);
var ndwi = dataset.select('NDWI');
var ndwiVis = {
  min: 0.0,
  max: 1.0,
  palette: ['0000ff', '00ffff', 'ffff00', 'ff0000', 'ffffff'],
};

print('NDWI', ndwi)

// here we try to calculate max and min value time-series for NDWI

var byMonth_ndwi_max = ee.ImageCollection.fromImages(
  years.map(function(y) {
    return months.map(function (m) {
      return ndwi
        .filter(ee.Filter.calendarRange(y, y, 'year'))
        .filter(ee.Filter.calendarRange(m, m, 'month'))
        .max()
        .set('system:time_start', ee.Date.fromYMD(y, m, 1))
        .clip(div1);
  });
}).flatten());

var byMonth_ndwi_min = ee.ImageCollection.fromImages(
  years.map(function(y) {
    return months.map(function (m) {
      return ndwi
        .filter(ee.Filter.calendarRange(y, y, 'year'))
        .filter(ee.Filter.calendarRange(m, m, 'month'))
        .min()
        .set('system:time_start', ee.Date.fromYMD(y, m, 1))
        .clip(div1);
  });
}).flatten());

print('MAX', byMonth_ndwi_max)
print('MIN', byMonth_ndwi_min)

Map.addLayer(byMonth_ndwi_max, ndwiVis, 'NDWI MAX MONTHLY');
Map.addLayer(byMonth_ndwi_min, ndwiVis, 'NDWI MIN MONTHLY');

// -------------------------------------------------
// NDVI
// -------------------------------------------------
var dataset = ee.ImageCollection('LANDSAT/LE07/C01/T1_8DAY_NDVI')
                  .filterDate(start, end);
var ndvi = dataset.select('NDVI');
var ndviVis = {
  min: 0.0,
  max: 1.0,
  palette: ['0000ff', '00ffff', 'ffff00', 'ff0000', 'ffffff'],
};

print('NDVI', ndvi)

// here we try to calculate min and max value time-series for NDVI

var byMonth_ndvi_max = ee.ImageCollection.fromImages(
  years.map(function(y) {
    return months.map(function (m) {
      return ndvi
        .filter(ee.Filter.calendarRange(y, y, 'year'))
        .filter(ee.Filter.calendarRange(m, m, 'month'))
        .max()
        .set('system:time_start', ee.Date.fromYMD(y, m, 1))
        .clip(div1);
  });
}).flatten());

var byMonth_ndvi_min = ee.ImageCollection.fromImages(
  years.map(function(y) {
    return months.map(function (m) {
      return ndvi
        .filter(ee.Filter.calendarRange(y, y, 'year'))
        .filter(ee.Filter.calendarRange(m, m, 'month'))
        .min()
        .set('system:time_start', ee.Date.fromYMD(y, m, 1))
        .clip(div1);
  });
}).flatten());

print('MAX', byMonth_ndvi_max)
print('MIN', byMonth_ndvi_min)

Map.addLayer(byMonth_ndvi_max, ndviVis, 'NDVI MAX MONTHLY');
Map.addLayer(byMonth_ndvi_min, ndviVis, 'NDVI MIN MONTHLY');

// -------------------------------------------------
// NDDI
// -------------------------------------------------

// Define an inner join.
var innerJoin = ee.Join.inner();

// Specify an equals filter for image timestamps.
var filterTimeEq = ee.Filter.equals({
  leftField: 'system:index',
  rightField: 'system:index'
});

// Apply the join.
var innerJoinedMax = innerJoin.apply(byMonth_ndvi_max, byMonth_ndwi_max, filterTimeEq);
var innerJoinedMin = innerJoin.apply(byMonth_ndvi_min, byMonth_ndwi_min, filterTimeEq);

// Display the join result: a FeatureCollection.
print('Inner join output innerJoinedMax:', innerJoinedMax);
print('Inner join output innerJoinedMin:', innerJoinedMin);

// MAX NDDI

/*
var nddi_max = innerJoinedMax.map(function(feature) {
  return ee.Image.cat(feature.get('primary'), feature.get('secondary'));
});
*/

var nddi_max = innerJoinedMax.map(function(f){
  var ndvi = ee.Image(f.get('primary')).rename('NDVI')
  var ndwi = ee.Image(f.get('secondary')).rename('NDWI')
  return ndvi.addBands(ndwi).copyProperties(ndvi)
  })
  
/*
var nddi_max_res = nddi_max.map(function(image) {
  var ndvi = ee.Image(image.select(['NDVI']));
  var ndwi = ee.Image(image.select(['NDWI']));
  return ee.Image(image).addBands(ndvi.subtract(ndwi).divide(ndvi.add(ndwi)).rename('NDDI')).copyProperties(image);
  })
*/

var nddi_max_res = nddi_max.map(function(image) {
  var normalize = ee.Image(image).normalizedDifference(["NDVI", "NDWI"]).rename("NDDI")
  return ee.Image(image).addBands(normalize).copyProperties(image)
  })

// MIN NDDI
var nddi_min = innerJoinedMin.map(function(feature) {
  return ee.Image.cat(feature.get('primary'), feature.get('secondary'));
});

var nddi_min_res = nddi_min.map(function(image) {
  var normalize = ee.Image(image).normalizedDifference(["NDVI", "NDWI"]).rename("NDDI")
  return ee.Image(image).addBands(normalize).copyProperties(image)
  })

var nddiVis = {
  bands: ['NDDI'],
  min: -1.0,
  max: 1.0,
  palette: ['0000ff', '00ffff', 'ffff00', 'ff0000', 'ffffff'],
};

// Print the result of merging.
print('NDDI MAX:', nddi_max);
print('NDDI MIN:', nddi_min);

print('NDDI MAX RES (FEATURE COLLECTION):', nddi_max_res);
print('NDDI MIN RES (FEATURE COLLECTION):', nddi_min_res);

var nddi_max_res = ee.ImageCollection(nddi_max_res)
var nddi_min_res = ee.ImageCollection(nddi_min_res)

print('NDDI MAX RES (IMAGE COLLECTION):', nddi_max_res);
Map.addLayer(nddi_max_res, nddiVis, 'NDDI MAX MONTHLY');
print('NDDI MIN RES (IMAGE COLLECTION):', nddi_min_res);
Map.addLayer(nddi_min_res, nddiVis, 'NDDI MIN MONTHLY');

// -------------------------------------------------
// SAVING THE RESULT IN GeoTIFF FORMAT
// -------------------------------------------------

/* 
PURPOSE:
This function Exports all images from one Collection
PARAMETERS:
col = collection that contains the images (ImageCollection) (not optional)
folder = the folder where images will go (str) (not optional)
scale = the pixel's scale (int) (optional) (defaults to 1000) (for Landsat use 30)
type = data type of the exported image (str) (option: "float", "byte", "int", "double") (optional) (defaults to "float")
nimg = number of images of the collection (can be greater than the actual number) (int) (optional) (defaults to 500)
maxPixels = max number of pixels to include in the image (int) (optional) (defults to 1e10)
region = the region where images are on (Geometry.LinearRing or Geometry.Polygon) (optional) (defaults to the image footprint)
Be careful with the region parameter. If the collection has images 
in different regions I suggest not to set that parameter
namePrefix - string which will be added in the beginning of every filename
EXAMPLE:
ExportCol(myLandsatCol, "Landsat_imgs", 30)
*/

var ExportCol = function(col, folder, scale, type,
                         nimg, maxPixels, region, namePrefix) {
    type = type || "float";
    nimg = nimg || 500;
    scale = scale || 1000;
    maxPixels = maxPixels || 1e10;

    var colList = col.toList(nimg);
    var n = colList.size().getInfo();
    

    for (var i = 0; i < n; i++) {
      var img = ee.Image(colList.get(i));
      //var img = img.select(['NDDI'])
      var id = img.id().getInfo();

      region = region || img.geometry().bounds().getInfo();

      var imgtype = {"float":img.toFloat(), 
                     "byte":img.toByte(), 
                     "int":img.toInt(),
                     "double":img.toDouble()
                    }
      // ----------
      //Map.addLayer(img.select(['NDDI']), nddiVis, 'check_NDDI_' + id.toString());
      //print(region)
      // ----------    
      Export.image.toDrive({
        image:imgtype[type],
        description: namePrefix + id,
        folder: folder,
        fileNamePrefix: namePrefix + id,
        region: region,
        scale: scale,
        maxPixels: maxPixels})
    }
  }

ExportCol(nddi_min_res, exportFolderMin, 30, 'float', 500, 1e10, geometry, 'MIN_');
ExportCol(nddi_max_res, exportFolderMax, 30, 'float', 500, 1e10, geometry, 'MAX_');
