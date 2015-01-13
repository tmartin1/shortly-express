// Required npm utilities.
var express = require('express');
var session = require('express-session');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

// Required bookshelf files to build the sqlite database.
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');


app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('secret cookies'));
app.use(session());
app.use(express.static(__dirname + '/public'));

// Homepage
app.get('/', util.restrictIn, function(req, res) {
  res.render('index');
});

// Create new shortened url. This occurs when user clicks on 'Shorten' from the nav bar.
app.get('/create', util.restrictIn, function(req, res) {
  res.render('index');
});

// Retrieves all shortened links from the database to display on page.
app.get('/links', util.restrictIn, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

// Add new shortened urls to the database.
app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }
  // Creates a new link from the link.js model.
  new Link({ url: uri }).fetch().then(function(found) {
    // Check to see if link already exists.
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', util.restrictOut, function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username }).fetch().then(function(model) {
    // Check to see if user exists. If user is found, process login.
    if (model) {
      model.authenticate(model, password, function(access) {

        // if password is correct, login
        if (access) {
          req.session.user = req.body.username;
          console.log('Logged in as', username, 'rendering index.');
          res.redirect('/');
        
        // if password is incorrect, redirect to login page.
        } else {
          console.log('Login failed.');
          res.redirect('/login');
        }
      });

    // If user is not found, redirect to /signup.
    // Create new user with input username and password.
    } else {
      res.redirect('/signup');
    }
  });
});

app.get('/signup', util.restrictOut, function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  // Check to see if username already exists.
  new User({ username: req.body.username }).fetch().then(function(model) {
    if (!model) {
      // If username does not yet exist, then create new user.
      var newUser = new User({
        username: req.body.username,
        password: req.body.password
      });

      newUser.save().then(function(newUser) {
        req.session.user = newUser.username;
        res.redirect('/');
      });
    } else {
      // If user already exists, new user is not created.
      console.log('Error: Username already exists, please choose a different username.');
      res.redirect('/signup');
    }
  });
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

// Handels requests to visit a shortened url.
app.get('/*', function(req, res) {
  if (req.url !== '/favicon.ico') {
    // Creates a new link from the link.js model.
    new Link({ code: req.params[0] }).fetch().then(function(link) {
      // Looks for url in databse, if it is not found, sends back to home page.
      if (!link) {
        res.redirect('/');
      // If link is found, create new click from click.js model.
      } else {
        var click = new Click({
          link_id: link.get('id')
        });

        // Increments the visit counter, then redirects user to intended page.
        click.save().then(function() {
          db.knex('urls')
            .where('code', '=', link.get('code'))
            .update({
              visits: link.get('visits') + 1,
            }).then(function() {
              return res.redirect(link.get('url'));
            });
        });
      }
    });
  }
});

console.log('Shortly is listening on 4568');
app.listen(4568);
