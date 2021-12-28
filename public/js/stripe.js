/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51K8m6ESIo3iCWGpczQEaeC26oOIpObuc6RdJrmTa9dJ9NIZ4dfrvu6Khwero5L54FA1LFrR0HUPUVhOBrXtaGpwf003Bq5J7rV'
);

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
