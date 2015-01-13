var db = require('../config');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt-nodejs'));

// Model for creating new users.
var User = db.Model.extend({

	tableName: 'users',

  /*
  // many-to-many connection with links
  links: function() {
    return this.hasMany(Link);
  },
  */
  
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      model.set('username', model.get('username'));
		  bcrypt.genSalt(10, function(err, salt) {
		  	if (err) throw new Error('ERROR', err);
		  	bcrypt.hash(model.get('password'), salt, null, function(err, result) {
		  		if (err) throw new Error('ERROR', err);
		  		model.set({ password: result, salt:salt });
		  	});
		  });
    });
    this.on('created', function() {
    	this.save();
    });
  },

	authenticate: function(model, password, callback) {
		var validate = model.get('password');
		return bcrypt.hash(password, model.get('salt'), null, function(err, newHash) {
	  	if (err) throw new Error('ERROR', err);
			callback(validate === newHash);
		});
  }

});

module.exports = User;


/* Below is an example from the bookshelf API:

var Customer = bookshelf.Model.extend({

  initialize: function() {
    this.on('saving', this.validateSave);
  },

  validateSave: function() {
    return checkit(rules).run(this.attributes);
  },

  account: function() {
    return this.belongsTo(Account);
  },

}, {

  login: Promise.method(function(email, password) {
    if (!email || !password) throw new Error('Email and password are both required');
    return new this({email: email.toLowerCase().trim()}).fetch({require: true}).tap(function(customer) {
      return bcrypt.compareAsync(customer.get('password'), password);
    });
  })

});

Customer.login(email, password)
  .then(function(customer) {
    res.json(customer.omit('password'));
  }).catch(Customer.NotFoundError, function() {
    res.json(400, {error: email + ' not found'});
  }).catch(function(err) {
    console.error(err);
  });

*/