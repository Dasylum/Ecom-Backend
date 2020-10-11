var mongoose = require('mongoose');

var customerSchema = mongoose.Schema({
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true},
    email: {type: String, required: true},
    adminStatus: {type: Boolean, required: true},
    logginLogs: {type: Number, required: true},
    location: {type: Object, required: true}
})

module.exports = mongoose.model('customer', customerSchema);