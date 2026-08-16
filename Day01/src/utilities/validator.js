const validator = require("validator");

const validate = (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid request body");
  }

  const mandatoryfield = ["firstName", "emailId", "password"];
  const { firstName, emailId, password } = data;

  const isAllowed = mandatoryfield.every((k) => Object.prototype.hasOwnProperty.call(data, k));

  if (!isAllowed) {
    throw new Error("Some Field missing");
  }
  if (!emailId || !validator.isEmail(String(emailId))) {
    throw new Error("Invalid Email");
  }
  if (!password || !validator.isStrongPassword(String(password))) {
    throw new Error("Weak Password");
  }

  if (typeof firstName !== "string") {
    throw new Error("firstName must be a string");
  }
  const firstName_length = firstName.trim().length;
  if (firstName_length < 3 || firstName_length > 20) {
    throw new Error("Invalid firstName");
  }
};

module.exports = validate;

