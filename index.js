const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

dotenv.config();

const mongoUrl = process.env.mongoUrl;
const databaseConnect = async () => {
  await mongoose.connect(mongoUrl);
};

// Schema for user

const userSchema = new mongoose.Schema({
    email: String,
    projectId: String,
});
const User = mongoose.model("user", userSchema);

app.listen(3001, async () => {
  console.log("Server Started at " + 3001);
  await databaseConnect();
  console.log("Connected to database");
});
// Routes for database action

app.post("/startproject", async (req, res) => {
    console.log(req.body);
    const id=req.body.projectId;
    const email=req.body.email;
    console.log(id,email);
    const isProject=await User.findOne({email:email,projectId:id});
    if(isProject){
        res.json({message:"Project already started"});
        return;
    }
    await User.create({email:email,projectId:id});
    res.json({message:"Project started successfully"});
});
