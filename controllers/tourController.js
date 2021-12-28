/* const fs = require('fs'); */

const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../Models/tourModel');
const catchAsync = require('./utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(AppError('Not an image, Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  filter: multerFilter
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image') req.file
// upload.array('images', 5) req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  console.log(req.files);

  if (!req.files.imageCover || !req.files.images) return next();

  // 1. Cover Image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2. Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// GET ALL, GET ARE WAYS TO READ INFO FROM DB
exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// WAY TO CREATE DATA IN DB
exports.createTour = factory.createOne(Tour);

// WAY TO UPDATE DATA IN DB
exports.updateTour = factory.updateOne(Tour);

// WAY TO DELETE DATA IN DB
exports.deleteTour = factory.deleteOne(Tour);

// GET STATS
exports.getTourStats = catchAsync(async (req, res, next) => {
  // mongoose (data) aggregation pipeline
  // Can be used to get all kinds of insights from data. Calculate sum, avg, max, min, distances etc..

  const stats = await Tour.aggregate([
    {
      // filtering
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      // grouping of stats
      $group: {
        // _id: '$ratingsAverage',
        _id: { $toUpper: '$difficulty' }, // stats grouped by difficulty
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      // sort by avg price ascending
      $sort: {
        avgPrice: 1
      }
    }
    // {
    //   // can repeat stages of data aggragation pipeline if you need
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);
  res.status(200).json({
    status: 'success',
    data: { stats },
    message: 'Successful!'
  });
});

// GET Monthly Plan
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  // How many tours start in each month.
  // Business problem to help in planning for resource management & hiring

  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      // unwind deconstructs an array field from input documents and then output one document per each element of the array. one tour for each of the states in the array

      // we want to split one tour by start dates, each tour has multiple start dates in given array
      $unwind: '$startDates'
    },
    {
      $match: {
        // filter by dates between
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // grouping by month
        numTourStarts: { $sum: 1 }, // number of tours starting in above month
        tours: { $push: '$name' } // array of which tours (names) starting in that month
      }
    },
    {
      $addFields: { month: '$_id' } // shows number of month in year
    },
    {
      $project: { _id: 0 } // shows the id of the project. 0 doesn't show up, 1 shows up.
    },
    {
      $sort: { numTourStarts: -1 } //Sort by num of tours. 1 is of asc, -1 is for desc.
    },
    {
      $limit: 12 // limits number of results from getMonthlyPlan
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { plan },
    message: 'Successful!'
  });
});

// FINDING TOURS WITHIN RADIUS
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitute and longitude in the format lat,lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitute and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
