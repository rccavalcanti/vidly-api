const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { Rental } = require('../models/rental');
const { Movie } = require('../models/movie');
const moment = require('moment');
const Joi = require('joi');
const express = require('express');
const router = express.Router();

router.post('/', [auth, validate(validateReturn)], async (req, res) => {
  const rental = await Rental.lookup(req.body.customerId, req.body.movieId);
  if (!rental)
    return res.status(404).send('No rental found for this customer/movie');

  if (rental.dateReturned)
    return res.status(400).send('Return is already processed');

  rental.dateReturned = new Date();
  const rentalDays = moment().diff(rental.dateOut, 'days');
  rental.rentalFee = rentalDays * rental.movie.dailyRentalRate;
  await rental.save();

  await Movie.update(
    { _id: rental.movie._id },
    {
      $inc: {
        numberInStock: 1
      }
    }
  );

  res.status(200).send(rental);
});

function validateReturn(req) {
  const schema = {
    customerId: Joi.objectId().required(),
    movieId: Joi.objectId().required()
  };

  return Joi.validate(req, schema);
}

module.exports = router;
