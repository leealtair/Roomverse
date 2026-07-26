require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const path = require('path');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors()); // Enable CORS
app.use(express.json()); // Enable JSON body parsing

// Retrieve sensitive keys safely from environment variables
const uri = process.env.MONGO_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!uri || !GEMINI_API_KEY) {
  console.error("Missing MONGO_URI or GEMINI_API_KEY in environment variables.");
  process.exit(1);
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.post('/api/saveQuizAnswer', async (req, res) => {
    const {
        userId,
        firstName,
        lastName,
        answer
    } = req.body;

    if (!userId || !answer || !answer.questionId) {
        return res.status(400).json({
            error: 'User ID and a valid answer with questionId are required.'
        });
    }

    try {
        await client.connect();
        const database = client.db("roomverse");
        const quizData = database.collection("quizData");

        // The update operation
        const updateResult = await quizData.updateOne({
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            // Check if a document with this userId already has an answer for this question
            "answers.questionId": answer.questionId
        }, {
            // Use positional operator `$` to update the matching element
            "$set": {
                "answers.$.userAnswer": answer.userAnswer,
                "answers.$.preferredAnswer": answer.preferredAnswer,
                "answers.$.importance": answer.importance
            }
        });

        if (updateResult.modifiedCount === 0) {
            // If no document was updated, it means this is a new answer.
            // Use $push to add a new answer to the answers array.
            const insertResult = await quizData.updateOne({
                userId: userId,
                firstName: firstName,
                lastName: lastName,
            }, {
                "$push": {
                    answers: answer
                }
            }, {
                upsert: true
            });
            return res.status(200).json({
                message: "New quiz answer added successfully.",
                result: insertResult
            });
        }

        res.status(200).json({
            message: "Quiz answer updated successfully.",
            result: updateResult
        });

    } catch (error) {
        console.error("Failed to save quiz answer to MongoDB:", error);
        res.status(500).json({
            error: "Internal server error."
        });
    } finally {
        await client.close();
    }
});

// Endpoint to find matches
app.post('/api/findMatches', async (req, res) => {
    const {
        userId
    } = req.body;

    if (!userId) {
        return res.status(400).json({
            error: 'User ID is required.'
        });
    }

    try {
        await client.connect();
        const database = client.db("roomverse");
        const quizDataCollection = database.collection("quizData");

        // 1. Get the current user's data
        const userData = await quizDataCollection.findOne({
            userId: userId
        });
        if (!userData) {
            return res.status(404).json({
                error: 'User data not found.'
            });
        }

        // 2. Get all other users' data
        const otherUsersData = await quizDataCollection.find({
            userId: {
                $ne: userId
            }
        }).toArray();

        // 3. Construct the prompt for the AI
        const prompt = `
            if no other user exist then send a message line saying no other user to match. dont exexcute query displayed below if no user exist.
            I have two sets of data: one for a user (usereData) and one for all other users (otherData). 
            
            Here's the user data: ${JSON.stringify(userData)}
            
            Here's the other users' data: ${JSON.stringify(otherUsersData)}
            
            Based on the similarity of quiz answers and the 'importance' ratings in the 'answers' array, calculate a match percentage for the user against each of the other users. Please return the results as a JSON array, sorted in descending order by match percentage.
            rules:-1.no detailed explaination is required.send me only in json format.
            2.Percentage shown upto 2 decimal places.
            Output format should be a JSON array of objects, where each object contains:
            {
                "matchUserId": "[the user ID of the other user]",
                "matchPercentage": [a number from 0 to 100 representing the match]
                "firstName":[first name of user if exist for same user other wise leave it blank or null]
                "lastName":[Last name of user if exist for same user other wise leave it blank or null]
                "profileImageUrl" : [user profileImageUrl if exist for same user other wise leave it blank]
            }
        `;

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest"
        });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log(responseText);
        const modified = responseText.replace(/`/g, "");
        const modified2 = modified.replace("json", "");
        const matches = JSON.parse(modified2);

        // 4. (Optional but recommended): Fetch user names from Firebase/another collection
        // This part would require a Firebase Admin SDK setup on the server-side to be truly secure.
        // For demonstration, let's assume we can query another MongoDB collection.
        const usersCollection = database.collection("users");
        for (const match of matches) {
            if(match.matchPercentage >=40){
                const userProfile = await usersCollection.findOne({
                    userId: match.matchUserId
                });
                // console.log(match.firstName)
                if (match) {
                    match.name = `${match.firstName} ${match.lastName}`;
                    match.profileImageUrl = match.profileImageUrl || 'user.png';
                }
            }
        }

        res.status(200).json(matches);

    } catch (error) {
        console.error("Failed to find matches:", error);
        res.status(500).json({
            error: "Internal server error."
        });
    } finally {
        await client.close();
    }
});


app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);

});


