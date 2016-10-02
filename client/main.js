import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { Events } from '../imports/api/events.js';
import { ReactiveDict } from 'meteor/reactive-dict';

import './main.html';
import './getevent.html';



const location = {
  current: undefined,
  radius: 2 //kilometers
}




BlazeLayout.setRoot('body');

function getDateString(timestamp, text) {
  const threshold = 23;
  const milliInHour = 60 * 60 * 1000;
  const hourDifference = Math.floor((timestamp - Date.now()) / milliInHour);

  if (hourDifference < 1 || hourDifference > threshold) {
    return text; 
  } else {
    return "In " + hourDifference + " hour" + ((hourDifference === 1) ? "" : "s");
  }
}

Template.curevents.onCreated(function bodyOnCreated() {
  const state = new ReactiveDict();
  this.state = state;
  this.state.set('location set', false);
  navigator.geolocation.getCurrentPosition((pos) => {
    location.current = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    state.set('location set', true);
  }, function() {}, {enableHighAccuracy: true});
});

Template.getevent.onCreated(function bodyOnCreated() {
  this.state = new ReactiveDict();
});

  Template.getevent.onRendered(function() {
  $("p").text("");
});

Template.curevents.helpers({
	live_events: function() {
    const currTime = Date.now();
    let events = Events
      .find({ start_time: {$lt: currTime}, end_time: {$gt: currTime} }, { sort: { start_time: 1 }})
      .map(e => {e.close = false; e.time = getDateString(e.start_time, e.time); return e;});

    const instance = Template.instance();
    if (instance.state.get('location set')) {
      return events.map(e => {
        e.close = google.maps.geometry.spherical.computeDistanceBetween(location.current, new google.maps.LatLng(e.lat, e.lng)) / 1000 <= location.radius;
        return e;
      });
    }
    else {
      return events;
    }
  },
  future_events: function() {
    const currTime = Date.now();
    let events = Events
      .find({ start_time: {$gt: currTime} }, { sort: { start_time: 1 }})
      .map(e => {e.close = false; e.time = getDateString(e.start_time, e.time); return e;});

    const instance = Template.instance();
    if (instance.state.get('location set')) {
      return events.map(e => {
        e.close = google.maps.geometry.spherical.computeDistanceBetween(location.current, new google.maps.LatLng(e.lat, e.lng)) / 1000 <= location.radius;
        return e;
      });
    }
    else {
      return events;
    }
  }
});

Template.getevent.events({
  'submit .eventform'(event, instance) {
    console.log("Yo");
    // Do stuff like enter this into collection
    // Prevent default browser form submit
    event.preventDefault();
    
    // Get value from form element
    const target = event.target;
    const text = target.url.value;
    
    // Insert into collection
    Meteor.call('inserteventData', {eventurl: text}, (err) => {
      if(!err) {
        $("p").text("Success");
      } else {
        $("p").text("Invalid URL");
        console.log(err);
      }
    });
  
    // Clear form
    target.url.value = '';
  },
});


Template.event.helpers({
  id: function() {
    return FlowRouter.getParam("id");
  },
  res: function() {
    var id = FlowRouter.getParam("id");
    return Events.findOne({_id: id});
  },
  qrcode: function() {
    const id = FlowRouter.getParam("id");
    var url = "https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=" + encodeURI(JSON.stringify({"id": id}));
    return url;
  }
});