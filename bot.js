const {Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType} = require("discord.js");
require('dotenv').config()
const {ACCESS_TOKEN_DISCORD} = process.env;
const {ACCESS_TOKEN_OPENAI} = process.env;
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: ACCESS_TOKEN_OPENAI,
  });

let log = [{ role: "system", content: "You are a code reviewer who off short reviews on code quality" }] // Initalises conversation log for code reviewer

// Initialises discord client interations
const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Logs message to console
client.on("ready", () =>{
    console.log("The AI bot is online"); //message when bot is online
});

client.on("messageCreate", async (message) => {
  console.log(message);
  if (message.author.bot) return;

  // client listens for code block
  if (message.content.startsWith('`') && message.content.endsWith('`')) {

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

});
client.login(ACCESS_TOKEN_DISCORD);






