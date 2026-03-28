const mongoose = require("mongoose");
const { Schema } = mongoose;
const commentSchema = new Schema({
    content : {
        type : String,
        required : true,
        minlength : 2,
        maxlength : 1000,
        trim : true,
    },
    parentComment: {
        type : Schema.Types.ObjectId,
        ref : "Comment",
        default: null
    },
    author : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    post : {
        type : Schema.Types.ObjectId,
        ref : "Post",
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
commentSchema.index({ post: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ createdAt: -1 });
const Comment  = mongoose.model("Comment", commentSchema);
module.exports = Comment;