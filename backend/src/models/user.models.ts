import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        required: true,
        type: String,
    },
    email: {
        required: true,
        type: String,
    },
    password: {
        required: true,
        type: String,
    },
    createdOn: {
        type: Date,
        default: new Date().getTime(),
    },
})

export const userModel = mongoose.model("User", userSchema)