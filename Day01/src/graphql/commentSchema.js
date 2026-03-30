const { GraphQLObjectType, GraphQLString, GraphQLID, GraphQLList, GraphQLInt, GraphQLSchema, GraphQLNonNull } = require("graphql");
const Comment = require("../models/comment");
const User = require("../models/user");

// TEACHING NOTE: What is a GraphQL Type?
// In REST, the backend blindly sends whatever JSON object Mongoose dumps out.
// In GraphQL, you explicitly define the "Shape" of your data using Types.
// We define `UserType` so GraphQL knows exactly what a "User" looks like when we ask for an author!

const UserType = new GraphQLObjectType({
    name: "User",
    fields: () => ({
        id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
        nickname: { type: GraphQLString },
        profilePicture: { type: GraphQLString }
    })
});

// TEACHING NOTE: Resolvers (The magic mapping)
// Notice the 'author' field below. Our Mongoose DB just stores an `ObjectId` string for the author.
// But we want to give the Frontend the actual User object (name, photo, etc).
// The `resolve(parent, args)` function dynamically fetches the User from the database 
// based on the `parent.author` ID! If the frontend doesn't ask for the author, THIS FUNCTION NEVER RUNS, saving DB processing time!

const CommentType = new GraphQLObjectType({
    name: "Comment",
    fields: () => ({
        id: { type: GraphQLID },
        content: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        upvotesCount: { type: GraphQLInt },
        downvotesCount: { type: GraphQLInt },
        parentComment: { type: GraphQLID },
        upvotes: { type: new GraphQLList(GraphQLID) },
        author: {
            type: UserType,
            resolve(parent, args) {
                // Return the Full User Document corresponding to the `author` ObjectId stored on this comment
                return User.findById(parent.author);
            }
        }
    })
});

// TEACHING NOTE: The RootQuery (The Entry Point)
// Think of the RootQuery exactly like your Express REST Routes!
// This is how queries actually get initiated. 
// "comments(postId: ID)" is the equivalent of "GET /comments/:postId".
// We use Mongoose `.find({ post: args.postId })` to filter out comments belonging only to that post!

const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        comments: {
            type: new GraphQLList(CommentType),
            args: { postId: { type: new GraphQLNonNull(GraphQLID) } },
            resolve(parent, args) {
                // Grabbing comments chronologically newest first
                return Comment.find({ post: args.postId }).sort({ createdAt: -1 });
            }
        }
    }
});

module.exports = new GraphQLSchema({
    query: RootQuery
});
