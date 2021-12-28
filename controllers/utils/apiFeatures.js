class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  //  Methods for APIFeatures class
  filter() {
    // 1A. Filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => {
      delete queryObj[el];
    });

    console.log(queryObj);

    // 1B. Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`); //only matching the 4 types to replace in command.

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    // 2. Sorting
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' '); //split multiple sort parameters, join back together and sort
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    // 3. Field Limiting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' '); //split multiple sort parameters, join back together and sort
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    // 4. Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
