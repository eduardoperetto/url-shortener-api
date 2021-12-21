require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

/* 
You can POST a URL to /api/shorturl and get a JSON response with original_url and short_url properties. Here's an example: { original_url : 'https://freeCodeCamp.org', short_url : 1}

When you visit /api/shorturl/<short_url>, you will be redirected to the original URL.

If you pass an invalid URL that doesn't follow the valid http://www.example.com format, the JSON response will contain { error: 'invalid url' }
 */

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// Body-Parser
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

const dns = require('dns');

// DB Settings
var mongoose = require('mongoose');
const mySecret = process.env['MONGO_URI'];

mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });

const { Schema } = mongoose;

const shortURLSchema = new Schema({
  original_url: { type: String, required: true },
  _id: { type: Number, alias: 'id', required: true, default: 1 }
});
shortURLSchema.pre('save', function (next) {
  // Only increment when the document is new
  if (this.isNew) {
    ShortURL.countDocuments().then(result => {
      this._id = result + 1; // Increment count
      next();
    });
  } else {
    next();
  }
});

const ShortURL = mongoose.model('ShortURL', shortURLSchema);

// Routes

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', function (req, res) {
  let postedURL = req.body.url;
  let toTestURL = postedURL.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, '').replace(/\/.+$/, '');

  dns.lookup(toTestURL, (err, address) => {
    if (address != undefined) {
      addNewURL(postedURL, res);
    }
    else {
      res.json({ error: 'Invalid URL' })
    }
  });
});

app.get('/api/shorturl/:urlId', function (req, res) {
  ShortURL.findOne({ _id: req.params.urlId }, function (err, foundURL) {
    if (err) return console.log(err);
    res.redirect(301, foundURL.original_url);
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});


function addNewURL(postedURL, res) {
  let existentURL;
  ShortURL.findOne({ original_url: postedURL }, function (err, urlFound) {
    if (err) return console.log(err);
    existentURL = urlFound;
    if (existentURL != undefined) {
      res.json(
        {
          original_url: existentURL.original_url,
          short_url: existentURL._id,
        });
    }
    else {
      let NewURL = new ShortURL({ original_url: postedURL });
      NewURL.save(function (err, data) {
        if (err) return console.error(err);
        res.json({
          original_url: NewURL.original_url,
          short_url: NewURL._id,
        });
      });
    }
  });
}