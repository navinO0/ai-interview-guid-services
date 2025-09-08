import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


app.get("/ai/interview/question", async (req, res) => {
  try {
    const role = req.query.role || "backend developer";
    const level = req.query.difficulty || "medium";
    const topic = req.query.topic || "";
    const count = 2;

    const prompt = `
Ask ONE clear and direct ${topic ? `about ${topic} ` : ""} interview question 
for a ${role} role at ${level} level.  
Make sure the question is relevant, concise, and grammatically correct.  
Return only the question, nothing else.
`;

    const response = await model.generateContent(prompt);
    const questionText = response.response.text().trim();

    const sampleQuestion = {
      question: questionText,
      difficulty: 1,
      user_id: 1,
    };

    const questionResponse = await db
      .insert(sampleQuestion)
      .into("questions")
      .returning("id");

    res.json({ question: questionText, qns_id: questionResponse[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate question" });
  }
});


app.post("/ai/interview/feedback", async (req, res) => {
  try {
    const { answer, role = "backend developer", question, qns_id } = req.body;

    const prompt = `You are an expert interviewer and communication coach. 
Evaluate the candidate’s answer for a ${role} role.

Question: "${question}" 
Answer: "${answer}" 

Your feedback must be returned strictly as a JSON object with the following keys:
{
  "score": "number from 1 to 10",
  "strengths": "list of strengths in the answer in single line separated by commas",
  "improvements": "areas where the candidate can improve in single line separated by commas",
  "missed_points": "important points or concepts they missed or could add in single line separated by commas",
  "sarcastic_feedback": "A witty, slightly sarcastic comment that points out flaws in a light-hearted way",
  "positive_feedback": "short, encouraging summary (2–3 sentences, voice-friendly)",
  "final_feedback": "short, encouraging summary (2–3 sentences, voice-friendly)",
  "actual_answer" : "detailed explanation to help the candidate to prepare"
}

Rules:
- Do not include anything outside the JSON object.
- Be constructive, encouraging, and clear since this will be read out loud through voice.`;

    const response = await model.generateContent(prompt);
    const feedbackText = response.response.text();

    let cleaned = feedbackText.trim();
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();


    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    

    let jsonParsedResponse;
    try {
      jsonParsedResponse = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse JSON:", feedbackText);
      throw new Error("Gemini did not return valid JSON");
    }

    if (jsonParsedResponse) {
      jsonParsedResponse.answer = answer;
      jsonParsedResponse.question_id = qns_id;
    }

    await db.insert(jsonParsedResponse).into("answers");

    res.json({ feedback: jsonParsedResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
});


app.post("/ai/interview/history", async (req, res) => {
  try {
    const getHistory = await db.raw(`
      SELECT a.question_id, q.question, a.actual_answer, *
      FROM answers a
      LEFT JOIN questions q ON a.question_id = q.id
    `);

    res.json({ history: getHistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get answer history" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Interview Coach running on http://localhost:${PORT}`);
});
