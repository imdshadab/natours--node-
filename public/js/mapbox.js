/* eslint-disable */

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibXNoYWRhYjI3IiwiYSI6ImNrd25sM2FvMzJtdTYybnF2aDgwbTVjcXgifQ.vjxyl_upY7dR57vZDOIChA';

  var map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mshadab27/ckwp07d7w4y8k14n397ji4lmc', // style URL
    scrollZoom: false // scroll zoom
    // center: [-74.5, 40], // starting position [lng, lat]
    // zoom: 9 // starting zoom
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description} </p>`)
      .addTo(map);

    // extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
