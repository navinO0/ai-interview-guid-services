import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { Ollama } from "ollama";
import db from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const client = new Ollama({ host: "http://localhost:11434" });
// const db = new DynamoDBClient({ region: process.env.AWS_REGION });


app.get("/question", async (req, res) => {
  try {
    const role = req.query.role || "backend developer";
    const level = req.query.difficulty || "medium";
    const topic = req.query.topic || ''
    const count = 2



    const prompt = `
Ask ONE clear and direct ${topic ? `about ${topic} ` : ''} ${topic} interview question for a ${role} role at ${level} level.  
Make sure the question is relevant, concise, and grammatically correct.  
Return only the question, nothing else.
`;


    const response = await client.generate({
      model: "llama3.2:1b",
      prompt,
    });
    const sampleQuestion = {
      question: response.response,
      difficulty: 1, // 1 = easy
      user_id: 1,    // must match an existing user id in `users` table
      // created_at: new Date(),
      // updated_at: new Date()
    };
    const questionResponse = await db.insert(sampleQuestion).into("questions").returning("id");
    console.log(questionResponse)
    // const getAnswers = await db.select("*").from("answers")
    // console.log(getAnswers)
    res.json({ question: response.response, qns_id: questionResponse[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate question" });
  }
});


app.post("/feedback", async (req, res) => {
  try {
    const { answer, role = "backend developer", question, qns_id } = req.body;
    const prompt = `You are an expert interviewer and communication coach. 
Evaluate the candidate’s answer for a ${role} role. 

Question: "${question}" 
Answer: "${answer}" 

Your feedback must be returned strictly as a JSON object with the following keys:
{
  "score": "number from 1 to 10",
  "strengths": "list of strengths in the answer in single line separeted by commas",
  "improvements": "areas where the candidate can improve in single line separeted by commas",
  "missed_points": "important points or concepts they missed or could add in single line separeted by commas",
  "sarcastic_feedback": "A witty, slightly sarcastic comment on the candidate’s answer that points out flaws, missing details, or vague phrasing in a light-hearted way. It should still help them understand what could be improved without sounding rude.",
  "positive_feedback": "short, encouraging summary for the candidate (2–3 sentences, voice-friendly)",
  "final_feedback": "short, encouraging summary for the candidate (2–3 sentences, voice-friendly)",
  "actual_answer" : "detailed explanation to help the candidate to prepare",
}

Rules:
- Do not include anything outside the JSON object.  
- Be constructive, encouraging, and clear since this will be read out loud through voice.`;



    const response = await client.chat({
      model: "llama3.2:1b",
      messages: [
        { role: "system", content: "You are an AI interview coach. Help users prepare." },
        { role: "user", content: prompt },
      ],
    });

    const feedback = response.message?.content || "No feedback generated.";

    const jsonParsedResponse = JSON.parse(feedback)
    console.log(jsonParsedResponse)
    if (jsonParsedResponse) {
      jsonParsedResponse.answer = answer
      jsonParsedResponse.question_id = qns_id
    }
    await db.insert(jsonParsedResponse).into("answers");

    res.json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
});

app.post("/history", async (req, res) => {
  try {
    // const {user_id} = req.body
    const getHistory = await db.raw("select a.question_id ,q.question, a.actual_answer ,* from answers a left join questions q on a.question_id = q.id ");

    res.json({ history: getHistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get answer" });
  }
});


app.listen(PORT, () => {
  console.log(`AI Interview Coach running on http://localhost:${PORT}`);
});
