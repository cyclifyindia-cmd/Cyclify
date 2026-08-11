// Public checkout configuration only. Never put payment secrets in this file.
window.CYCLIFY_PAYMENT_CONFIG={
 enabled:true,
 provider:"Razorpay",
 createOrderUrl:"https://asia-south1-cyclify-b809a.cloudfunctions.net/createRazorpayOrder",
 verifyPaymentUrl:"https://asia-south1-cyclify-b809a.cloudfunctions.net/verifyRazorpayPayment",
 cancelRefundUrl:"https://asia-south1-cyclify-b809a.cloudfunctions.net/cancelAndRefundOrder"
};
