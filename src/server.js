const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt")
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken")




const app = express();
const cors = require("cors");
const { log } = require("console");
app.use(cors())
app.use(express.json());

function connectDB() {
    mongoose
        .connect("mongodb+srv://princerana618:123123456456@cluster0.lu2eb.mongodb.net/highwayDB")
        .then(() => {
            console.log("DB Connected");
            startServer();
        })
        .catch((err) => {
            console.error("DB Connection Error:", err);
        });
}


function startServer() {
    app.listen(5000, () => {
        console.log("Server is listening on port 5000");
    }).on("error", (err) => {
        console.error("Server failed to start:", err);
    });
}

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    contactMode: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

app.post("/signup", async (req, res) => {
    let passwordHash = await bcrypt.hash(req.body.formData.password, 10);

    try {
        const newUser = new User({
            firstName: req.body.formData.firstName,
            lastName: req.body.formData.lastName,
            password: passwordHash,
            email: req.body.formData.email,
            contactMode: req.body.formData.contactMode
        });

        const savedUser = await newUser.save();
        const token = await jwt.sign({ _id: savedUser._id }, "secretword");
        return res.status(201).json({ token: token, message: "User signup successfully", user: savedUser });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: "Email is already registered." });
        } else {
            res.status(500).json({ error: "Server error: " + err.message });

        }
    }
});

app.post("/signin", async (req, res) => {
    try {
        let isPasswordValid;
        let token;
        const email = req.body.formData.email;
        const password = req.body.formData.password;

        const user = await User.findOne({ email: email })

        if (user) {
            isPasswordValid = await bcrypt.compare(password, user.password)
        }

        if (isPasswordValid) {
            token = await jwt.sign({ _id: user._id }, "secretword")
            res.cookie("token", token)
        } else {
            return res.json({ invalidCredential: true })
        }

        return res.json({ token: token, messege: "logged in successful", firstName: user.firstName, lastName: user.lastName, email: user.email })
    } catch (err) {
        console.log(err)
    }

})


const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "princerana618@gmail.com",
        pass: "hfpe hgnx qnhs dkdt",
    },
});

app.post("/otpverification", async (req, res) => {

    const email = req.body.formData.email;

    if (!email) {
        return res.status(400).json({ emailFound: "Email is required" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    try {
        const user = await User.findOne({ email: email })

        if (user !== null) {
            return res.status(200).json({ emailFound: true });
        }

        await transporter.sendMail({
            from: '"Highway" <princerana618@gmail.com>',
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is ${otp}`,
            html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
        });
        return res.status(200).json({ message: "OTP sent successfully", otp: otp });
    } catch (err) {
        res.status(500).json({ error: "Server error: " + err.message });
    }
});


connectDB();
