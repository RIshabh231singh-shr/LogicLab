const mongoose = require("mongoose");
const { Schema } = mongoose;
const postSchema = new Schema({
    content : {
        type : String,
        required : true,
        minlength : 2,
        maxlength : 5000,
        trim : true,
    },
    image : {
        type : String,
    },
    author : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    likes : [
        {
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    ],
    likesCount: {
        type: Number,
        default: 0
    }
},
{timestamps : true}
);
postSchema.index({ createdAt: -1 });
const Post = mongoose.model("Post", postSchema);

module.exports = Post;

