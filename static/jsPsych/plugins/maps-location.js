/*
 * jspsych-reconstruction
 * a jspsych plugin for a reconstruction task where the subject recreates
 * a stimulus from memory
 *
 * Josh de Leeuw
 *
 * documentation: docs.jspsych.org
 *
 */

jsPsych.plugins['maps-location'] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'maps-location',
    description: '',
    parameters: {
      zoom: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Zoom level for map',
        required: true,
        default: undefined,
        description: 'An integer describing the starting map zoom level'
      },
      starting_location: {
        type: jsPsych.plugins.parameterType.ARRAY,
        pretty_name: 'Starting Location',
        required: true,
        default: [],
        description: 'Starting location for map'
      },
      button_label: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button label',
        default:  'Continue',
        description: 'The text that appears on the button to finish the trial.'
      }
    }
  };

  plugin.trial = function(display_element, trial) {

    // These imports must be added to exp.html for this plugin to fuctions
    // <script type="text/javascript" src="http://maps.google.com/maps/api/js?key="></script> 
    // <script type="text/javascript" src="scripts/downloadxml.js"></script>

    // global "map" variable
    var map = null;
    var marker = null;
    var rts = [];
    var markers = [];

    // TODO: style map frame and button

    let html = '<div id="response-alert"></div><div id="map-response-div">';
    html += '<div id="map-canvas"></div>';
    html += '<button id=map-response-button type="button">' + trial.button_label + '</button>';
    html += '</div>';
    display_element.innerHTML = html;

    display_element.querySelector("#map-response-button").addEventListener('click', after_response);

    // A function to create the marker and set up the event window function 
    function createMarker(latlng) {

        var marker = new google.maps.Marker({
            position: latlng,
            map: map,
            zIndex: Math.round(latlng.lat()*-100000)<<5
            });

        // google.maps.event.addListener(marker, 'click', function() {
        //     infowindow.open(map,marker);
        //     });

        // google.maps.event.trigger(marker, 'click');    
        return marker;
    }

    function initialize() {
      // create the map
      var myOptions = {
        zoom: trial.zoom,
        // TODO: center somewhere random?
        center: new google.maps.LatLng(trial.starting_location[0], trial.starting_location[1]),
        mapTypeControl: false,
        navigationControl: true,
        zoomControl: true,
        scaleControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      }
      map = new google.maps.Map(display_element.querySelector("#map-canvas"),
                                    myOptions);
     
      // google.maps.event.addListener(map, 'click', function() {
      //       infowindow.close();
      //       });

      google.maps.event.addListener(map, 'click', function(event) {
            //call function to create marker

            // measure rt
             // var end_time = jsPsych.totalTime(); 
             // var response_time = end_time - start_time;

             if (marker) {
                marker.setMap(null);
                marker = null;
             }
             marker = createMarker(event.latLng);
             markers.push([marker.position.lat(), marker.position.lng()]);
             // rts.push(rt);
      });
    }
    
    // var response_time = null;
    function after_response() {
      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      if(markers.length > 0) {
          display_element.querySelector('#map-response-button').className += ' responded';
          display_element.querySelector('#map-response-button').setAttribute('disabled', 'disabled');
          endTrial();
      } else {
          let warning = "<p>Please drop a pin on the map before pressing continue</p>";
          display_element.querySelector('#response-alert').innerHTML = warning;
          setTimeout(function() {
              let warning = display_element.querySelector('#response-alert')
              if(warning) {
                  warning.innerHTML = "";
              }
          }, 2000);
      }

    }
    
    function endTrial() {
      // save data
      var trial_data = {
        "rts": rts,
        "start_time": start_time,
        "locations": markers,
      };

      display_element.innerHTML = '';

      // next trial
      jsPsych.finishTrial(trial_data);
    }

    var start_time = jsPsych.totalTime(); 
    initialize();
  };

  return plugin;
})();
