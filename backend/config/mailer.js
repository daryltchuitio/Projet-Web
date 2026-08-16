const nodemailer = require("nodemailer");

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:4040";

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS
  }
});

module.exports = { mailTransporter, MAIL_USER, APP_BASE_URL };
