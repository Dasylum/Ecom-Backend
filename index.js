var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
var path = require('path');
var stripe = require('stripe');
var geoip = require('geoip-lite');
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'email@gmail.com',
      pass: 'password'
    }
});

var app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const bcrypt = require('bcrypt');

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));

var port = process.env.PORT || 8080;

passport.use(
    new LocalStrategy((username, password, done) => {
      customerModel.findOne({ username: username }, (err, user) => {
        if (err) { 
          return done(err);
        };
        if (!user) {
          return done(null, false, { msg: "Incorrect username" });
        }
        bcrypt.compare(password, user.password, (err, res) => {
          if(res) {
            return done(null, user)
          }

          else {
            return done(null, false, { message: 'Incorrect Password' })
          }
        })
      });
    })
);

app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    customerModel.findById(id, function(err, user) {
        done(err, user);
    });
});

mongoose.connect('mongodb+srv://NewDiet:Ds8762402382465@cluster0.sbfkl.mongodb.net/EcomDB?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});

var customerModel = require('./models/customer');
var productModel = require('./models/product');
var orderModel = require('./models/order');
var loginLogsModel = require('./models/loginLogs');

app.post('/login', passport.authenticate('local'), (req, res) => {

    res.json(req.user);
})

app.get('/log-out', (req, res) => {
    req.logout();
    res.json({
        message: "session destroyed"
    })
})

app.post('/add', (req, res) => {
    customerModel.findOne({username: req.body.username}).then(result => {
        if( result ) {
            res.json({
                message: 'Username already in use'
            })
        }

        else {
            const { firstName, lastName, adminStatus, password, username, email } = req.body;
            const ipAddress = req.ip;
            var location = geoip.lookup(ipAddress);

            bcrypt.hash(password, 10, (err, hashedPassword) => {
                const customerInstance = new customerModel({
                    firstName,
                    lastName,
                    username,    
                    password: hashedPassword,    
                    adminStatus,
                    email,
                    location
                })
            
                customerInstance.save({}, (err, result) => {
                    if(err) {
                        throw err
                    }
            
                    else {
                        res.json({
                            message: "database updated"
                        })
                    }
                })
            })
        }
    })
})

app.get('/reports/logins', (req, res) => {
    var nowDate = new Date(); 
    var date = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate(); 
    loginLogsModel.find({date: date}).then(result => res.json(result));
})

app.get('/reports/sales', (req, res) => {
    var nowDate = new Date(); 
    var date = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate(); 
    orderModel.find({date: date}).then(result => res.json(result));
})

app.get('/users', (req, res) => {
    customerModel.find().then(result => {
        res.json(result);
    })
})

app.post('/products/add/:id', (req, res) => {
    const {name, price, quantity} = req.body;
    const category = req.params.id;

    categoryModel.findById(req.params.id).then(result => {

        const productModelInstance = new productModel({
            name, category, price, quantity
        })
    
        productModelInstance.save({}, err => {
            if(err) {
                throw err
            }
    
            else {
                res.json({
                    message: 'Product added.'
                })
            }
        })
    })
})

app.get('/products', (req, res) => {
    productModel.find().then(result => {
        res.json(result);
    })
})

app.post('/order/payment', (req, res) => {
    customerModel.findById(req.params.customer).then(result => {
        stripe.customers.create({
            name: result.firstName,
            email: result.email,
            source: req.body.stripeToken
        })
        .then(customer =>
            productModel.findById(req.params.product).then(result => {
                stripe.charges.create({
                    amount:  result.price* 100,
                    currency: "inr",
                    customer: customer.id
                  })
            })
        )
        .then(() => {
            var orderInstance = new orderModel();
            orderInstance.customer = req.params.customer;
            orderInstance.product = req.params.product;

            var nowDate = new Date(); 
            orderInstance.date = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate();
    
            orderInstance.save().then((err, result) => {
                var mailOptions = {
                    from: 'email@gmail.com',
                    to: req.body.email,
                    subject: 'Order Confirmed',
                    text: 'Your order has been placed successfully.'
                  };
                  
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                      console.log(error);
                    } else {
                      console.log('Email sent: ' + info.response);
                    }
                  });
            })
        })
        .catch(err => console.log(err));
    })
})

app.post("/order/payment/:customer/:product", (req, res) => {
    try {
      stripe.customers
        .create({
          name: req.body.name,
          email: req.body.email,
          source: req.body.stripeToken
        })
        .then(customer => {
            if(req.body.coupon == 'TenPercentDiscount') {
                var Amount = req.body.amount - (req.body.amount * 0.1);
            }
            stripe.charges.create({
                amount: Amount * 100,
                currency: "inr",
                customer: customer.id
            })
        })
        .then(() => {
            var orderInstance = new orderModel();
            orderInstance.customer = req.params.customer;
            orderInstance.product = req.params.product;

            var nowDate = new Date(); 
            orderInstance.date = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate();
            
            orderInstance.save().then((err, result) => {
                res.json({
                    message: "Order placed!"
                })
            })
        })
        .catch(err => console.log(err));
    } catch (err) {
      res.send(err);
    }
});

app.get('/orders', (req, res) => {
    orderModel.find().then(result => {
        res.json(result);
    })
})

app.delete('/product/delete/:id', (req, res) => {
    productModel.findByIdAndDelete(req.params.id).then(result => {
        res.json({
            message: 'Product deleted.'
        })
    })
})

app.listen(port, (req, res) => {
    console.log("server running on port 8000...");
});