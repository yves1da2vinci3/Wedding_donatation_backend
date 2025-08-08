// this function allow to extract information from the webhook payload


const extractInformationFromWebhook = (payload) => {

  return { reference, envelopeId, donationData, amount, donorInfo };
};

const matchOperatorToDonation = (provider) => { 
    switch (provider) {
        case "paystack":
            return "Paystack";
        case "flutterwave":
            return "Flutterwave";
        case "stripe":
            return "Stripe";
    }
 }

module.exports = { extractInformation };