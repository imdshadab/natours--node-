const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

// MONGOOSE SCHEMA DEFINITION
const tourSchema = new mongoose.Schema(
  {
    // schema definition
    name: {
      type: String,
      required: [true, 'A Tour must Have a Name!'],
      unique: true,
      trim: true,
      minLength: [10, ' A Tour must not have less than 10 characters'], // validate: [validator.isAlpha, 'Tour name must only contain characters']
      maxLength: [40, ' A Tour must not have more than 40 characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A Tour must Have a Duration!']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A Tour must Have Group Size!']
    },
    difficulty: {
      type: String,
      required: [true, 'A Tour must Have a Difficulty!'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be either easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 1.0'], // validators
      max: [5, 'rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // 4.666666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A Tour must Have a Price!']
    },
    priceDiscount: {
      type: Number,
      validate: {
        // custom validator
        validator: function(val) {
          // ONLY WORKS ON NEW DOC CREATION
          return val < this.price;
        },
        message: 'Discount Price ({VALUE}) Should be below regular price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String], // images are stored as an array of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // GeoJSON to specify geospatial data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        // GeoJSON to specify geospatial data
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        // guide from usermodel is type objectId, user model referenced, then we populate guides from tour controller
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    // schema options
    toJSON: { virtuals: true }, // each time data is sent as JSON, virtuals are true
    toObject: { virtuals: true } // each time data is sent as object, virtuals are true
  }
);

// Improving read performance with index
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// setting 1 means in ascending order ( and -1 means in descending order)
tourSchema.index({ startLocation: '2dsphere' });

// virtual property that gets tour duration in weeks, it gets created everytime we get data from db
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// Virtual Populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id' // tour of _id in the foreign model (Review mongoose model)
});

//DOCUMENT MIDDLEWARE
// we can have middleware running before or after an event.
// Runs before .save() and .create() but not on insertMany
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// embedding data in tour schema
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function(next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

//QUERY MIDDLEWARE
// we can have middleware running before or after a certain query is executed.
// tourSchema.pre('find', function(next) {
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } }); // remove the secretTour

  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  // populate tour model using guides from users

  next();
});

// tourSchema.post(/^find/, function(docs, next) {
//   console.log(`Query took ${Date.now() - this.start}  milliseconds`);
//   //console.log(docs);
//   next();
// });

//AGGREGATE MIDDLEWARE
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //remove the secret tour

//   console.log(this.pipeline());
//   next();
// });

// tourSchema.post(/^find/, function(docs, next) {
//   console.log(`Query took ${Date.now() - this.start}  milliseconds`);
//   console.log(docs);
//   next();
// });

// MONGOOSE MODEL
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
