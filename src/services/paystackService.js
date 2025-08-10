require("dotenv").config();
const axios = require("axios");


/**
 * PaystackService - Service for handling Paystack payment operations
 * Supports mobile money payments for West African providers (Wave, Orange, MTN, Moov)
 */
class PaystackService {
  /**
   * Initialize PaystackService with API configuration
   */
  constructor() {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (!secretKey) {
        console.error('❌ PAYSTACK_SECRET_KEY is missing from environment variables');
        throw new Error('Paystack secret key is missing. Please check your .env file.');
    }

    console.log('✅ PaystackService initialized with secret key:', secretKey.substring(0, 10) + '...');

    this.paystack = axios.create({
      baseURL: "https://api.paystack.co",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
  }

  /**
   * Initialize a mobile money transaction
   * @param {number} amount - Transaction amount (will be converted to kobo/cents)
   * @param {string} email - Customer email address
   * @param {string} provider - Mobile money provider (wave, orange, mtn, moov)
   * @param {string} phone - Customer phone number
   * @param {string} currency - Transaction currency (default: XOF)
   * @param {string} callback_url - Callback URL for payment completion (optional)
   * @returns {Promise<Object>} Transaction initialization response
   * @example
   * // Wave payment initialization
   * const result = await paystackService.initializeMobileMoneyTransaction(
   *   100, "user@email.com", "wave", "0748889874", "XOF", "https://domain.com/callback"
   * );
   *
   * // Orange payment initialization (requires OTP submission afterwards)
   * const result = await paystackService.initializeMobileMoneyTransaction(
   *   100, "user@email.com", "orange", "0748889874", "XOF", "https://domain.com/callback"
   * );
   */
  async initializeMobileMoneyTransaction(
    amount,
    email,
    provider,
    phone,
    currency = "XOF",
    callback_url = null
  ) {
    try {
      // Prepare the request payload
      const payload = {
        amount: amount, // Send amount directly as provided (not multiplied by 100)
        email: email,
        currency: currency,
        mobile_money: {
          phone: phone,
          provider: provider.toLowerCase(), // Ensure provider is lowercase
        },
      };


      // Add callback URL if provided
      if (callback_url) {
        payload.callback_url = callback_url;
      }

      console.log("Initializing mobile money payment:", {
        provider,
        amount,
        currency,
        phone:
          phone.substring(0, 3) + "****" + phone.substring(phone.length - 2), // Log masked phone
        payload: JSON.stringify(payload, null, 2), // Log full payload for debugging
      });


      const response = await this.paystack.post("/charge", payload);

      // Log full response for debugging
      console.log("Paystack response:", {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data, null, 2),
      });

      // Enhanced response handling for mobile money providers
      const responseData = response.data;

      if (responseData.status) {
        console.log("Mobile money payment initialized successfully:", {
          reference: responseData.data?.reference,
          status: responseData.data?.status,
          provider: provider,
        });

        // For Wave and other providers that return QR codes or payment instructions
        if (responseData.data?.qr_code) {
          console.log("QR code payment URL provided for Wave payment");
        }

        if (responseData.data?.display_text) {
          console.log("Payment instruction:", responseData.data.display_text);
        }

        // For Orange, user will need to submit OTP after receiving SMS
        if (
          provider.toLowerCase() === "orange" &&
          responseData.data?.status === "send_otp"
        ) {
          console.log("Orange payment requires OTP submission");
        }
      }

      return responseData;
    } catch (error) {
      console.error("Mobile money payment initialization failed:", {
        provider,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });

      // Enhanced error handling for specific Paystack errors
      const errorData = error.response?.data || { message: error.message };

      // Handle specific error codes
      if (errorData.code === "unprocessed_transaction") {
        return {
          status: false,
          message:
            "Le service de paiement mobile money est temporairement indisponible",
          error: errorData,
        };
      }

      if (errorData.code === "invalid_phone") {
        return {
          status: false,
          message: "Le numéro de téléphone fourni n'est pas valide",
          error: errorData,
        };
      }

      // Return a standardized error response
      return {
        status: false,
        message:
          errorData.message || "Failed to initialize mobile money payment",
        error: errorData,
      };
    }
  }

  /**
   * Initialize a bank transaction
   * @param {string} email - Customer email address
   * @param {number} amount - Transaction amount (will be converted to kobo/cents)
   * @param {string} currency - Transaction currency (default: XOF)
   * @param {string} callback_url - URL to redirect after payment (optional)
   * @returns {Promise<Object>} Bank transaction initialization response with authorization URL
   * @example
   * // Initialize bank payment
   * const result = await paystackService.initializeBankTransaction(
   *   "user@email.com", 1000, "XOF"
   * );
   * // Response: { authorization_url, access_code, reference }
   */
  async initializeBankTransaction(
    email,
    amount,
    currency = "XOF",
    callback_url = null
  ) {
    try {
      const payload = {
        email: email,
        amount: amount.toString(), // Send amount directly as provided (not multiplied by 100)
        currency: currency,
        channels: ["bank"], // Restrict to bank channel only
      };

      // Add callback URL if provided
      if (callback_url) {
        payload.callback_url = callback_url;
      }

      console.log("Initializing bank transaction:", {
        email,
        amount,
        currency,
        has_callback: !!callback_url,
      });

      const response = await this.paystack.post(
        "/transaction/initialize",
        payload
      );
      const responseData = response.data;

      if (responseData.status) {
        console.log("Bank transaction initialized successfully:", {
          reference: responseData.data?.reference,
          access_code: responseData.data?.access_code,
          has_authorization_url: !!responseData.data?.authorization_url,
        });
      }

      return responseData;
    } catch (error) {
      console.error("Bank transaction initialization failed:", {
        email,
        amount,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });

      return {
        status: false,
        message:
          error.response?.data?.message ||
          "Failed to initialize bank transaction",
        error: error.response?.data || { message: error.message },
      };
    }
  }

  /**
   * Submit OTP for Orange Money payments
   * This method is required after initializing an Orange payment to complete the transaction
   * @param {string} otp - The OTP code received via SMS
   * @param {string} reference - The transaction reference from the initialization response
   * @returns {Promise<Object>} OTP submission response
   * @example
   * // Submit OTP for Orange payment
   * const result = await paystackService.submitOtp("3287", "yes8bpl8ssugnyy");
   */
  async submitOtp(otp, reference) {
    try {
      const payload = {
        otp: otp,
        reference: reference,
      };

      console.log("Submitting OTP for Orange payment:", {
        reference,
        otp: "****", // Mask OTP for security
      });

      const response = await this.paystack.post("/charge/submit_otp", payload);
      const responseData = response.data;

      if (responseData.status) {
        console.log("OTP submitted successfully:", {
          reference,
          status: responseData.data?.status,
          message: responseData.message,
        });
      }

      return responseData;
    } catch (error) {
      console.error("OTP submission failed:", {
        reference,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });

      return {
        status: false,
        message: error.response?.data?.message || "Failed to submit OTP",
        error: error.response?.data || { message: error.message },
      };
    }
  }

  /**
   * Validate if a mobile money provider is supported
   * @param {string} provider - The mobile money provider to validate
   * @returns {boolean} True if provider is supported, false otherwise
   * @example
   * const isValid = paystackService.validateMobileMoneyProvider("wave"); // true
   * const isInvalid = paystackService.validateMobileMoneyProvider("invalid"); // false
   */
  validateMobileMoneyProvider(provider) {
    const supportedProviders = ["wave", "orange", "mtn"];
    return supportedProviders.includes(provider.toLowerCase());
  }

  /**
   * Verify payment status using transaction reference
   * @param {string} reference - The transaction reference to verify
   * @returns {Promise<Object>} Payment verification response
   * @example
   * const result = await paystackService.verifyPayment("bcqip1yi37yyipe");
   */
  async verifyPayment(reference) {
    try {
      console.log("Verifying payment:", { reference });

      const response = await this.paystack.get(
        `/transaction/verify/${reference}`
      );
      const responseData = response.data;

      if (responseData.status) {
        console.log("Payment verification successful:", {
          reference,
          status: responseData.data?.status,
          amount: responseData.data?.amount,
        });
      }

      return responseData;
    } catch (error) {
      console.error("Payment verification failed:", {
        reference,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });

      return {
        status: false,
        message: "Failed to verify payment",
        error: error.response?.data || { message: error.message },
      };
    }
  }
}


module.exports = new PaystackService();
