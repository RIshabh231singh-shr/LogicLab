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
    codeSnippet: {
        type: String,
        trim: true,
    },
    tags: [{
        type: String,
        trim: true,
    }],
    labMode: {
        type: Boolean,
        default: false,
    },
    author : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    upvotes : [
        {
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    ],
    downvotes : [
        {
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    ],
    upvotesCount: {
        type: Number,
        default: 0
    },
    downvotesCount: {
        type: Number,
        default: 0
    }
},
{timestamps : true}
);
postSchema.index({ createdAt: -1 });
const Post = mongoose.model("Post", postSchema);

module.exports = Post;

