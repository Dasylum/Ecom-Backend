var mongoose = require('mongoose');

var productSchema = mongoose.Schema({
    title: {type: String, required: true},
    vendorName: {type: mongoose.Schema.Types.ObjectId, ref: 'customer', required: true},
    price: {type: String, required: true}
})

module.exports = mongoose.model('product', productSchema);