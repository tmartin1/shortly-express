var db = require('../config');
var Click = require('./click');
var crypto = require('crypto');

var Link = db.Model.extend({

  tableName: 'urls',
  
  hasTimestamps: true,
  
  defaults: {
    visits: 0
  },
  
  // many-to-one connection with links
  clicks: function() {
    return this.hasMany(Click);
  },

  /*
  // many-to-many connection with users
  usernames: function() {
    return this.hasMany(User);
  },
  */
  
  initialize: function(){
    this.on('creating', function(model, attrs, options) {
      var shasum = crypto.createHash('sha1');
      shasum.update(model.get('url'));
      model.set('code', shasum.digest('hex').slice(0, 5));
      console.log('on link initialize', model.attributes);
    });
    this.on('created', function() {
      this.save();
    });
  }

});

module.exports = Link;
