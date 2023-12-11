const {Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, Partials} = require("discord.js");
require('dotenv').config()
const {ACCESS_TOKEN_DISCORD} = process.env;
const {ACCESS_TOKEN_OPENAI} = process.env;
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: ACCESS_TOKEN_OPENAI,
  });

let log = [{ role: "system", content: "You are a code reviewer who offers short reviews on code quality, please give advice on how to improve the specified code. If there are any bugs please recommend a fix." }] // Initalises conversation log for code reviewer
let dmLog = [{ role: "system", content: "You are now chatting in DMs" }]; // Initializes conversation log for DMs


// Initialises discord client interations
const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    'partials': [Partials.Channel]
});

async function handleDM(message) {
  dmLog.push({ role: "user", content: message.content });

  // Adjust the number of past messages used based on your needs
  const relevantDmLog = dmLog.length > 20 ? dmLog.slice(-20) : dmLog;

  const prompt = relevantDmLog.map(m => `${m.role}: ${m.content}`).join("\n");

  const completion = await openai.chat.completions.create({
    prompt: prompt,
    model: "gpt-3.5-turbo",
    max_tokens: 150
  });

  const response = completion.choices[0].message.content;
  dmLog.push({ role: "system", content: response });
  await message.author.send(response);
}





// Logs message to console
client.on("ready", () =>{
    console.log("The AI bot is online"); //message when bot is online
});

client.on("messageCreate", async (message) => {
  console.log(message);
  if (message.author.bot) return;

  if (message.channel.type === 'DM') {
    console.log("DM Detected:", message.content);
    console.log("Handling DM message:", message.content); // Debug
    await handleDM(message);

    return; // Exit early if it's a DM
  }

  try {
    if (message.content.endsWith("?")) {
      await handleQuestionCommand(message);
    } else if (message.content.startsWith('`') && message.content.endsWith('`')) {
      await handleCodeReview(message);
    }
  } catch (error) {
    console.error('Error in message handling:', error);
  }

  // client listens for code block
  if (message.content.startsWith('`') && message.content.endsWith('`') & message.guildId !== null) {

  // Button creation
  const firstButton = new ButtonBuilder()
  .setLabel("Yes")
  .setStyle(ButtonStyle.Primary)
  .setCustomId("yes")

  const secondButton = new ButtonBuilder()
  .setLabel("No")
  .setStyle(ButtonStyle.Danger)
  .setCustomId("no")

  const buttonRow = new ActionRowBuilder().addComponents(firstButton, secondButton);

  // Bot replies with button query
  const reply = await message.reply({content: "Would you like me to review this code?", components:[buttonRow]})

   const collector = reply.createMessageComponentCollector({
    ComponentType: ComponentType.Button
   })

   // Listens to response of button query
   collector.on('collect', async (interaction) => {
    if (interaction.customId === "yes"){
interaction.reply("Code review is being sent to you via DM.");
await message.channel.sendTyping(); // Notifies user bot is typing
    
// Requests code review response from openAI
log.push({role: "user", content: `please review the following code: ${message}`}) // pushes code review request to log

const completion = await openai.chat.completions.create({
  messages: log,
  model: "gpt-3.5-turbo", 
  max_tokens: 1000
});

// Sent code review to DMs
message.author.send(completion.choices[0].message.content); //code review Response is logged to channel
log.push({role: "system", content: completion.choices[0].message.content}) // code review is logged in conversation

    }
    if (interaction.customId === "No"){
      return;
    }
   })
}

// Listens for messages to DM's / responds with chat GPT

if (message.guildId === null ) {

  await message.channel.sendTyping(); // Notifies user bot is typing
    
  log.push({role: "user", content: `in less than 200 words respond to:  ${message.content}`}); // pushes user response to  log
  
  // Completion feeds message log to open AI and obtains response to replies in DMs
  const completion2 = await openai.chat.completions.create({
    messages: log,
    model: "gpt-3.5-turbo",
    max_tokens: 300
  });
  
  message.channel.send(completion2.choices[0].message.content); // Response is logged to DMs
  
  log.push({role: "system", content: completion2.choices[0].message.content}) // Response pushed to log
}

async function handleQuestionCommand(message) {

  dmLog.push({ role: "user", content: message.content });


  // Create buttons
  const yesButton = new ButtonBuilder()
    .setLabel("Yes")
    .setStyle(ButtonStyle.Primary)
    .setCustomId("yes_private_help");

  const noButton = new ButtonBuilder()
    .setLabel("No")
    .setStyle(ButtonStyle.Danger)
    .setCustomId("no_private_help");

  const buttonRow = new ActionRowBuilder().addComponents(yesButton, noButton);

  // Send message with buttons
  const reply = await message.reply({
    content: "Would you like me to help you with this question privately?",
    components: [buttonRow]
  });

  // Collector for button interactions
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000 // 60 seconds to respond
  });

  collector.on('collect', async (interaction) => {
    if (!interaction.isButton()) return;
  
    if (interaction.customId === "yes_private_help") {
      // Acknowledge the interaction immediately
      await interaction.deferReply({ ephemeral: true });
  
      // Perform the long-running task (e.g., sending a DM)
      dmLog.push({ role: "user", content: message.content });
      const completion = await openai.chat.completions.create({
        messages: dmLog,
        model: "gpt-3.5-turbo",
        max_tokens: 150
      });
      const response = completion.choices[0].message.content;
      await message.author.send(response); // Send the answer directly in a DM
      dmLog.push({ role: "system", content: response }); // Update the log
  
      // Follow up with the interaction
      await interaction.editReply({ content: "I've sent you a private response." });
    } else if (interaction.customId === "no_private_help") {
      // For a simple acknowledgment without a long process
      await interaction.reply({ content: "Okay, no private help will be provided.", ephemeral: true });
    }
  });
  

  collector.on('end', collected => {
    console.log(`Collected ${collected.size} interactions.`);
  });
}



async function handleCodeReview(message) {
  await message.channel.sendTyping();
  log.push({ role: "user", content: `please review the following code: ${message.content}` });

  const completion = await openai.chat.completions.create({
    messages: log,
    model: "gpt-3.5-turbo",
    max_tokens: 1000
  });

  message.reply(completion.choices[0].message.content);
  log.push({ role: "system", content: completion.choices[0].message.content });
}


});
client.login(ACCESS_TOKEN_DISCORD);
