// review / rating / createdAt / ref to tour / ref to user

const mongoose = require('mongoose');
const Tour = require('./tourModel');

// MONGOOSE SCHEMA DEFINITION
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty!']
    },
    rating: {
      type: Number,
      min: [1, 'rating must be above 1.0'], // validators
      max: [5, 'rating must be below 5.0']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      // tour from tourModel is type objectId, tour model referenced, then we populate tour from tour controller
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!']
    },
    user: {
      // guide from userModel is type objectId, user model referenced, then we populate guides from tour controller
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user!']
    }
  },
  {
    // schema options
    toJSON: { virtuals: true }, // each time data is sent as JSON, virtuals are true
    toObject: { virtuals: true } // each time data is sent as object, virtuals are true
  }
);

//QUERY MIDDLEWARE
// we can have middleware running before or after a certain query is executed.
// tourSchema.pre('find', function(next) {

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  // populate tour model using name photo from users

  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });

  this.populate({
    path: 'user',
    select: 'name photo'
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function(tourId) {
  // function to create the statistics of the average and number of ratings for the tourId for which the current review was created. Created as static method because we needed to call the aggregate function on the model.
  const stats = await this.aggregate([
    {
      $match: { tour: tourId } // will only select the tour that we actually want to update
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    // below we persist(save) the calculated stats into the respective tour document
    await Tour.findByIdAndUpdate(tourId, {
      // find the tour and update it
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// To call the function we call it after the review has been created
reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.tour);
}); // using post because, in pre the review is not in the collection just yet.

//findByIdAndUpdate //findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

// MONGOOSE MODEL
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
