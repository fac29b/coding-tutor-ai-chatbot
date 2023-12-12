// This page stores the chatgpt chat workflow

const {ACCESS_TOKEN_OPENAI} = process.env;
const OpenAI = require("openai");

// Open API initialisation

const openai = new OpenAI({
    apiKey: ACCESS_TOKEN_OPENAI,
  });
  
  let log = [{ role: "system", content: "You are a friendly coding tutor" }] // Initalises conversation log for general
  
  let log2 = [{ role: "system", content: "You are a code reviewer who off short reviews on code quality" }] // Initalises conversation log for code reviewer
  
client.on("messageCreate", async (message) => {

    console.log(message);
    
      if (message.content.startsWith("!")) {
    
        await message.channel.sendTyping(); // Notifies user bot is typing
    
    log.push({role: "user", content: message.content}); // pushes user response to  log
    
    // Completion feeds message log to open AI and obtains response
    const completion = await openai.chat.completions.create({
      messages: log,
      model: "gpt-3.5-turbo",
      max_tokens: 50
    });
    
    message.channel.send(completion.choices[0].message.content); // Response is logged to channel
    
    log.push({role: "system", content: completion.choices[0].message.content}) // Response pushed to log
    }
    
    // Code reviews / checks for code block by listening for indents
    if (message.content.startsWith('`') && message.content.endsWith('`')) {
    
      await message.channel.sendTyping(); // Notifies user bot is typing
    
    log2.push({role: "user", content: `please review the following code: ${message}`}) // pushes code review request to log
    
    const completion2 = await openai.chat.completions.create({
      messages: log2,
      model: "gpt-3.5-turbo", 
      max_tokens: 1000
    });
    
    message.reply(completion2.choices[0].message.content); //code review Response is logged to channel
    
    log2.push({role: "system", content: completion2.choices[0].message.content}) // code review is logged in conversation
    }
    
    });
    client.login(ACCESS_TOKEN_DISCORD);