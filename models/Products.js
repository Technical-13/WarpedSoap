const { model, Schema } = require( 'mongoose' );

let productSchema = new Schema( {
  prodId: Number,
  blurb: String,
  categories: [ String ],
  description: String,
  image: String,
  inStock: Boolean,
  isSub: Boolean,
  name: String,
  price: Number,
  rating: { type: Number, min: 0, max: 5 },
  reviews: Number,
  variations: [ String ],
  related: [ {
    prodId: Number,
    image: String,
    name: String,
    price: Number
  } ]
}, { timestamps: true } );

module.exports = model( 'Products', productSchema );