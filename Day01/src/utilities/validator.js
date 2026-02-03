const validator = require("validator");

const validate = (data) => {
  const mandatoryfield = ["firstName", "emailId", "password"];
  const { firstName } = data;

  const isAllowed = mandatoryfield.every((k) => Object.keys(data).includes(k));

  if (!isAllowed) {
    throw new Error("Some Field missing");
  }
  if (!validator.isEmail(data.emailId)) {
    throw new Error("Invalid Email");
  }
  if (!validator.isStrongPassword(data.password)) {
    throw new Error("Weak Password");
  }

  const firstName_length = firstName.length;
  if (typeof firstName !== "string") {
    throw new Error("firstName must be a string");
  }
  if (firstName_length < 3 || firstName_length > 20) {
    throw new Error("Invalid firstName");
  }
};

module.exports = validate;
