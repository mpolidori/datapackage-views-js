function getLonLat(row, fields) {
  return fields.map((field, i) => {
    // strip trailing non-numeric characters such as deg, n, ...
    const numeric = row[field].toString().match(/[-+]?[0-9]*\.?[0-9]*/)
    if (numeric) {
      // now match valid lon or lat
      const val = numeric[0].toString().match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$|^[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+))$/)
      if (val) {
        if (isNaN(val[0])) throw 'Invalid lon/lat values'
        return val[0]
      } else {
        throw "Invalid lon/lat values"
      }
    } else {
      throw "Invalid lon/lat values"
    }
  })
}

function tableToGeoData(view) {

  view.spec = view.spec || {}
  view.resources[0].schema = view.resources[0].schema || {fields: []}
  // Return object template:
  const geoData = {
    type: 'FeatureCollection',
    features: []
  }

  if (view.resources[0]._values) {
    view.resources[0]._values.forEach(data => {
      let feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: []
        },
        properties: {
          name: ''
        }
      }

      if (view.spec.infobox) {
        feature.properties.name = eval('`' + view.spec.infobox + '`')
      } else {
        feature.properties.name = Object.keys(data).map(key => `${key}: ${data[key]}`).join('<br />')
      }
      // Add features based on spec:
      // If lon and lat fields provided, just use it:
      if (view.spec.lonField && view.spec.latField) {
        try {
          feature.geometry.coordinates = getLonLat(data, [view.spec.lonField, view.spec.latField])
          geoData.features.push(feature)
          return
        } catch (e) {
          // warn and skip this row if invalid
          console.warn(e)
          return
        }
      } else if (view.spec.geomField) {
        feature.geometry = getGeometryFromRecord(data[view.spec.geomField])
        geoData.features.push(feature)
        return
      } else {
        // Identify geopoint field based on tableschema
        const geopointField = view.resources[0].schema.fields.find(field => {
          return field.type === 'geopoint'
        })
        if (geopointField) { // geopoint field is given in tableschema
          if (geopointField.format === 'default') {
            // Value is a comma separated string, eg, "lon, lat"
            feature.geometry.coordinates = data[geopointField.name]
              .split(',')
              .map(item => item.trim())
          } else if (geopointField.format === 'array') {
            feature.geometry.coordinates = data[geopointField.name]
          } else if (geopointField.format === 'object') {
            feature.geometry.coordinates = [
              data[geopointField.name]['lon'],
              data[geopointField.name]['lat']
            ]
          } else {
            // No format is provided for geometry field.
            feature.geometry = getGeometryFromRecord(data[geopointField.name])
          }

          geoData.features.push(feature)
          return
        }
      }

      // If geo data isn't defined in spec or tableschema, we try to guess it.
      const geometryFieldNames = ['geojson', 'geom','the_geom','geometry','spatial','geo', 'lonlat']
      const geometryField = view.resources[0].schema.fields.find(field => {
        return geometryFieldNames.includes(field.name.toLowerCase())
      })
      if (geometryField) {
        feature.geometry = getGeometryFromRecord(data[geometryField.name])
        geoData.features.push(feature)
        return
      }

      // Now check for default fields
      const latitudeFieldNames = ['lat','latitude']
      const longitudeFieldNames = ['lon','longitude']
      const latField = view.resources[0].schema.fields.find(field => {
        return latitudeFieldNames.includes(field.name.toLowerCase())
      })
      const lonField = view.resources[0].schema.fields.find(field => {
        return longitudeFieldNames.includes(field.name.toLowerCase())
      })
      if (latField && lonField) {
        feature.geometry.coordinates = [data[lonField.name], data[latField.name]]
        geoData.features.push(feature)
        return
      }
    })
  }

  if (geoData.features.length === 0) throw "No geodata on resource"

  return geoData
}

function getGeometryFromRecord(value) {
  if (typeof(value) === 'string'){
    // We *may* have a GeoJSON string representation
    try {
      value = JSON.parse(value);
    } catch(e) {}
  }
  if (typeof(value) === 'string') {
    value = value.replace('(', '').replace(')', '');
    var parts = value.split(',');
    var lat = parseCoordinateString(parts[0]);
    var lon = parseCoordinateString(parts[1]);

    if (!isNaN(lon) && !isNaN(parseFloat(lat))) {
      return {
        "type": "Point",
        "coordinates": [lon, lat]
      };
    } else {
      return null;
    }
  } else if (value && value.constructor.name === 'Array') {
    // [ lon, lat ]
    return {
      "type": "Point",
      "coordinates": [value[0], value[1]]
    };
  } else if (value && value.lat) {
    // of form { lat: ..., lon: ...}
    return {
      "type": "Point",
      "coordinates": [value.lon || value.lng, value.lat]
    };
  }
  // We o/w assume that contents of the field are a valid GeoJSON object
  return value;
}

function parseCoordinateString(coord){
  if (typeof(coord) != 'string') {
    return(parseFloat(coord));
  }
  var dms = coord.split(/[^-?\.\d\w]+/);
  var deg = 0; var m = 0;
  var toDeg = [1, 60, 3600]; // conversion factors for Deg, min, sec
  var i;
  for (i = 0; i < dms.length; ++i) {
      if (isNaN(parseFloat(dms[i]))) {
        continue;
      }
      deg += parseFloat(dms[i]) / toDeg[m];
      m += 1;
  }
  if (coord.match(/[SW]/)) {
        deg = -1*deg;
  }
  return(deg);
}


export default tableToGeoData;
