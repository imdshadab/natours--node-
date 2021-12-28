const Review = require('./../Models/reviewModel');
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);

// WAY TO CREATE DATA IN DB
exports.createReview = factory.createOne(Review);

// WAY TO UPDATE DATA IN DB
exports.updateReview = factory.updateOne(Review);

// WAY TO DELETE DATA IN DB
exports.deleteReview = factory.deleteOne(Review);
