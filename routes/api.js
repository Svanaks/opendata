const express = require('express');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const router = express.Router();

// Get and parse data from Api and insert in mongodb
router.route('/getDataFromApi')
  .get(function(req, res){
    request({
      method: 'GET',
      uri: 'https://data.cityofchicago.org/resource/rjgc-4h37.json?$limit=500000'
    }, function (error, response, body){
      if(!error && response.statusCode == 200){
        MongoClient.connect("mongodb://localhost:27017/opendata", function(err, db) {
          if(err) {
            return console.dir(err);
          }
          // Drop collection before inserting to avoid duplicates
          db.collection('chicago').drop();
          // Parse Api string to json object
          let objects = JSON.parse(response.body);
          // Parse string numbers to integers "100" => 100
          for(var i = 0; i < objects.length; i++){
            let obj = objects[i];
            for (let prop in obj) {
              if(obj.hasOwnProperty(prop) && obj[prop] !== null && !isNaN(obj[prop])){
                obj[prop] = +obj[prop];
              }
            }
          }
          // Insert documents in chicago collection
          db.collection('chicago').insertMany(objects);
        });
        // redirect to home page after insert
        res.redirect('/');
      }
    })
});

// Get all payements
router.get('/payements', (req, res) => {
  MongoClient.connect("mongodb://localhost:27017/opendata", function(err, db) {
    if(err) {
      return console.dir(err);
    }
    const payements = db.collection('chicago').find({}).toArray(function(error, payements) {
      if (err) throw error;
      res.render('payements', {
        payements: payements
      });
    });
  });
});

// Get chart with payements grouped by department, not null and amount > 10000000
// Used to visualize which departments spend the most
router.get('/payements/chart', (req, res) => {
  MongoClient.connect("mongodb://localhost:27017/opendata", function(err, db) {
    if(err) {
      return console.dir(err);
    }
    // we group by dpt and get amount sum for each dpt
    // We filter where totalAmount > 10000000 and dpt name not null.
    const payements = db.collection('chicago').aggregate(
      [{
        "$match": {
          "$and": [
            {"amount": { "$gt": 10000000}},
            {"department_name": { "$exists": true, "$ne": null }}
          ]
        }
      },
      {
        $group: {
          _id:"$department_name",
          totalAmount:{$sum:"$amount"}
        }
      }]
    ).toArray(function(error, payements) {
      if (err) throw error;
      // Map payements array to return only dpt and amount sum
      const datas = payements.map(payement => ({dpt:payement._id, amount:payement.totalAmount}));
      res.render('chart', {
        datas: datas
      });
    });
  });
});

// Filter payements with url param
router.get('/payements/:param*', (req, res) => {
  MongoClient.connect("mongodb://localhost:27017/opendata", function(err, db) {
    if(err) {
      return console.dir(err);
    }
    // Find with url param
    const payement = db.collection('chicago').find(
      { $or:
        [
          { vendor_name: {$regex: ".*" + req.params.param.toUpperCase() + ".*"} },
          { amount: req.params.param },
          { department_name: {$regex: ".*" + req.params.param + ".*"} },
          { check_date: {$regex: ".*" + req.params.param + ".*"} },
          { voucher_number: {$regex: ".*" + req.params.param + ".*"} },
          { contract_number: {$regex: ".*" + req.params.param + ".*"} }
        ]
      }
    ).toArray(function(error, payements) {
      if (err) throw error;
      res.render('payements', {
        payements: payements
      });
    });
  });
});

module.exports = router;
