// YOU CAN USE THIS FILE AS REFERENCE FOR SERVER DEVELOPMENT

// include the express modules
var express = require("express");

// create an express application
var app = express();
const url = require('url');

// helps in extracting the body portion of an incoming request stream
var bodyparser = require('body-parser'); // this has been depricated, is now part of express...

// fs module - provides an API for interacting with the file system
var fs = require("fs");

// helps in managing user sessions
var session = require('express-session');

// include the mysql module
var mysql = require("mysql");


const conn = mysql.createConnection({
    host: "cse-mysql-classes-01.cse.umn.edu",
    user: "C4131S24DU24",               // replace with the database user provided to you
    password: "626",                  // replace with the database password provided to you
    database: "C4131S24DU24",           // replace with the database user provided to you
    port: 3306
});

// Bcrypt library for comparing password hashes
const bcrypt = require('bcrypt');
const e = require("express");
const { resourceLimits } = require("worker_threads");

// A possible library to help reading uploaded file.
// var formidable = require('formidable')

// apply the body-parser middleware to all incoming requests
app.use(bodyparser());

// use express-session
// in mremory session is sufficient for this assignment
app.use(session({
  secret: "csci4131secretkey",
  saveUninitialized: true,
  resave: false
}
));

app.set("views", "views");
app.set("view engine", "pug");

// server listens on port 9007 for incoming connections
app.listen(8215, () => console.log('Listening on port 8215!'));

//////////////////////////////////
// '/updateEvent/:id'  
// '/postEventEntry'   
// '/editEvent/:eventId 
// '/deleteEvent/:id'
// //////////////////////////////////
// function to return the welcome page
app.get('/',function(req, res) {
  console.log("going to welcome page");
  // res.sendFile(__dirname + '/static/html/welcome.html');
  res.render("welcome");
});

app.get('/login',function(req, res) {
  console.log("going to login page");
  if (!req.session.value){
    // res.sendFile(__dirname + '/static/html/login.html');
    res.render("login");
  }
  else{
    // res.sendFile(__dirname + '/static/html/schedule.html');
    res.render("schedule");
  }
});

app.get('/schedule',function(req, res) {
  if (!req.session.value){
		res.redirect(302, "login")
    return;
  }
  console.log("going to schedule page");
  // res.sendFile(__dirname + '/static/html/schedule.html');
  res.render("schedule");
});

app.get('/addEvent',function(req, res) {
  if(!req.session.value){
		res.redirect(302, "login")
  }

  console.log("going to addEvent page");
  // res.sendFile(__dirname + '/static/html/addEvent.html');
  res.render("addEvent");
});

app.get('/deleteEvent/:id', function(req, res){
  if(!req.session.value){
		res.redirect(302, "login");
  }

  console.log("in deleteEvent");
  var id = req.params.id;
  console.log(id);

  const queryString = "DELETE FROM tbl_events WHERE event_id = ?";
  conn.query(queryString, [id], function (err, result) {
    if (err) {
        res.sendStatus(404);
    }
    else{
      res.sendStatus(200);
      console.log("Deleted row");
    }
  });
});

app.get('/editEvent/:eventId', function (req, res) {
  if(!req.session.value){
		res.redirect(302, "login")
  }
  console.log("in editEvent ");
  const eventId = req.params.eventId;
  const queryString = "SELECT *  FROM tbl_events WHERE event_id = ?";
  conn.query(queryString, [eventId], function(err, result) {
    if (err) {
      throw err;
    }
    else{
      if (result.length == 0){
        res.sendStatus(404);
      }
      else{
        const eventToEdit = {
          id:         result[0].event_id,
          day:        result[0].event_day,
          name:      result[0].event_event, 
          start:      result[0].event_start, 
          end:        result[0].event_end, 
          location:   result[0].event_location,
          phone:      result[0].event_phone,
          info:       result[0].event_info,
          url:        result[0].event_url, 
        };
        console.log(eventToEdit);
        res.render("updateEvent", {record: eventToEdit});
      }
    }
  });
});

app.post('/sendLoginDetails', function(req,res){
  console.log("in sendLoginDetails");
  var data = JSON.stringify(req.body);
  data = JSON.parse(data);
  var username  = data.name;
  var password = data.password;

  const queryString = `SELECT * FROM tbl_accounts WHERE acc_name = ?`;
  conn.query(queryString, [username], function(err, rows) {
    if (err) {
      console.error('Error:', err);
    }
    if (rows.length >= 1){
      if(bcrypt.compareSync(password, rows[0].acc_password)){
        req.session.user = username;
        req.session.value = 1;
        console.log("sending success");
        res.json({ status: 'success'});
      }
      else{
        console.log("incorrect password, sending fail");
        res.json({ status: 'fail'});
      }
    } 
    else {
      console.log("account doesnt exist, sending fail");
      res.json({ status: 'fail'});
    }
  });

});


app.post("/getScheduleInfo", function(req, res){
  if(!req.session.value){
		res.redirect(302, "login");
  }
  console.log("in get schedule info");
  var data = JSON.stringify(req.body);
  data = JSON.parse(data);
  // console.log(data);
  const queryString = "SELECT * FROM tbl_events WHERE event_day = ? ORDER BY event_start ASC";
  conn.query(queryString, [data.day], function(err, rows){
    if (err) {
      console.error('Error:', err);
    }
    res.json(rows);
    console.log("sent over rows");
  });
});

app.post("/logout", function(req, res){
  console.log("in logout");
  req.session.destroy(function(err){
    console.log("destroyed session");
    res.sendStatus(200);
  });
});


app.post('/postEventEntry', function(req, res){
  console.log("in postEventEntry");
  var data = JSON.stringify(req.body);
  data = JSON.parse(data);
  // console.log(data);

  var day  = data.day;
  var event  = data.event;
  var start = data.start;
  var end = data.end;
  var location = data.location;
  var phone = data.phone;
  var info = data.info;
  var url = data.url;

  const rowToBeInserted = {
    event_day:        day,
    event_event:      event, 
    event_start:      start, 
    event_end:        end, 
    event_location:   location,
    event_phone:      phone,
    event_info:       info,
    event_url:        url, 
  };
  
  conn.query('INSERT tbl_events SET ?', rowToBeInserted, function (err, rows) {
    if (err) {
        throw err;
    }
    res.json({ status: 'success'});
    console.log("Table record inserted!");
  });
});


app.post('/updateEvent/:id', function (req, res){
  console.log("In updateEvent");
  const eventId = req.params.id;
  const data = req.body;
  console.log(data);
  if(!req.session.value){
		res.redirect(302, "/login")
  }
  const queryString = "UPDATE tbl_events SET event_day=?, event_event=?, event_start=?, event_end=?, event_location=?, event_phone=?, event_info=?, event_url=? WHERE event_id=?";
  const updateValues = [
    data.day,
    data.event,
    data.start,
    data.end,
    data.location,
    data.phone,
    data.info,
    data.url,
    eventId
  ];

  conn.query(queryString, updateValues, function(err, rows) {
    if (err) {
      throw err; // Handle error
    }
    console.log("Row " + eventId + " updated");
    res.redirect(302, '/schedule'); 
  });
});


// middle ware to serve static files
app.use('/static', express.static(__dirname + '/static'));
app.use('/css', express.static(__dirname + '/static/css'));


// function to return the 404 message and error to client
app.get('*', function(req, res) {
  // add details
  res.sendStatus(404);
});
