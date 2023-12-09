const {Client, GatewayIntentBits, Partials} = require("discord.js");
require('dotenv').config();
const {ACCESS_TOKEN_DISCORD} = process.env;
const {ACCESS_TOKEN_OPENAI} = process.env;
const OpenAI = require("openai");

// Open API initialisation

const openai = new OpenAI({
  apiKey: ACCESS_TOKEN_OPENAI,
});

// Inialisaes discord client interations
const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    'partials': [Partials.Channel]
});

let log = [{ role: "system", content: "You are a friendly coding tutor" }] // Initalises conversation log for general
let logCodeReviewer = [{ role: "system", content: "You are a code reviewer who off short reviews on code quality" }] // Initalises conversation log for code reviewer
let dmLog = [{ role: "system", content: "You are now chatting in DMs" }]; // Initializes conversation log for DMs


async function handleDM(message) {
  // Log the user's message
  //console.log("handleDM triggered for message:", message.content); // Debug log
  dmLog.push({ role: "user", content: message.content });

  // Get a response from OpenAI
  const completion = await openai.chat.completions.create({
    messages: dmLog,
    model: "gpt-3.5-turbo",
    max_tokens: 50
  });

  // Send the response to the user and update the log
  const response = completion.choices[0].message.content;
  await message.author.send(response);
  dmLog.push({ role: "system", content: response });
}

client.on("ready", () => {
    console.log("The AI bot is online"); //message when bot is online
});


client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  console.log(message);
  console.log("Received message:", message.content); // Debug

  if (message.channel.type === 'DM') {
    console.log("DM Detected:", message.content);
    console.log("Handling DM message:", message.content); // Debug
    await handleDM(message);

    return; // Exit early if it's a DM
  }

  try {
    if (message.content.startsWith("!")) {
      await handleExclamationCommand(message);
    } else if (message.content.startsWith('`') && message.content.endsWith('`')) {
      await handleCodeReview(message);
    }
  } catch (error) {
    console.error('Error in message handling:', error);
  }
});

async function handleExclamationCommand(message) {
  await message.channel.sendTyping();
  const dmChannel = await message.author.createDM();
  let userQuery = message.content.slice(1).trim();
  log.push({ role: "user", content: userQuery });

  const completion = await openai.chat.completions.create({
    messages: log,
    model: "gpt-3.5-turbo",
    max_tokens: 50
  });

  await dmChannel.send(completion.choices[0].message.content);
  log.push({ role: "system", content: completion.choices[0].message.content });
}

async function handleCodeReview(message) {
  await message.channel.sendTyping();
  logCodeReviewer.push({ role: "user", content: `please review the following code: ${message.content}` });

  const completion = await openai.chat.completions.create({
    messages: logCodeReviewer,
    model: "gpt-3.5-turbo",
    max_tokens: 1000
  });

  message.reply(completion.choices[0].message.content);
  logCodeReviewer.push({ role: "system", content: completion.choices[0].message.content });
}


// Error handling
client.on('error', console.error);
// Login the bot using the token from the environment variables
client.login(ACCESS_TOKEN_DISCORD);







