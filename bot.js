const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot ishlayapti! 🤖");
  })
  .listen(PORT, () => {
    console.log(`Web server ${PORT} portda ishga tushdi`);
  });

const TELEGRAM_TOKEN = "8962392210:AAHdQx8eFO2gow9KBD0YpIVDEHYvyFHW2E4";
const GEMINI_API_KEY = "AIzaSyAQ.Ab8RN6KSM7KnRorbhmPrY_IzhFkGozBCcyvl5ug0MRMaYZmTAw";

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const userSessions = {};

const SYSTEM_PROMPT = `Sen universal yordamchi botsan. Foydalanuvchilar senga har qanday savol berishlari mumkin va sen ularga aniq, foydali va do'stona javob berasen.
Javoblaringda:
- O'zbek tilida javob ber (agar foydalanuvchi boshqa tilda yozsa, o'sha tilda javob ber)
- Aniq va tushunarli bo'l
- Kerak bo'lsa misollar keltir`;

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "Foydalanuvchi";
  userSessions[chatId] = [];
  bot.sendMessage(
    chatId,
    `👋 Salom, ${firstName}!\n\nMen universal yordamchi botman. Menga har qanday savol bering — men javob beraman!\n\n📌 Buyruqlar:\n/start — Yangi suhbat boshlash\n/help — Yordam\n/clear — Suhbatni tozalash`
  );
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `ℹ️ Yordam\n\nMenga quyidagi mavzularda savol berishingiz mumkin:\n\n• 🔬 Fan va texnologiya\n• 📚 Ta'lim va o'qish\n• 💼 Ish va karera\n• 🍳 Retseptlar va ovqat\n• 🌍 Sayohat\n• 💡 Maslahat\n• 🖥️ Dasturlash\n• 📖 Tarjima\n• ...va boshqa hamma narsa!\n\nShunchaki yozing! 😊`
  );
});

bot.onText(/\/clear/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = [];
  bot.sendMessage(chatId, "🗑️ Suhbat tarixi tozalandi!");
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  if (!userText || userText.startsWith("/")) return;

  if (!userSessions[chatId]) userSessions[chatId] = [];

  bot.sendChatAction(chatId, "typing");

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const history = userSessions[chatId].map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userText);
    const reply = result.response.text();

    userSessions[chatId].push({ role: "user", content: userText });
    userSessions[chatId].push({ role: "assistant", content: reply });

    if (userSessions[chatId].length > 20) {
      userSessions[chatId] = userSessions[chatId].slice(-20);
    }

    await bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error("Xato:", error.message);
    await bot.sendMessage(chatId, "❌ Xato yuz berdi. Qayta urinib ko'ring.");
  }
});

console.log("🤖 Bot ishga tushdi...");
