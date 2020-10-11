const mongoose = require('mongoose');

const loginLogs = mongoose.Schema({
    customer: {type: mongoose.Schema.Types.ObjectId, ref: 'customer'},
    date: {type: String, required: true}
})

module.exports = mongoose.model('loginLogs', loginLogs);