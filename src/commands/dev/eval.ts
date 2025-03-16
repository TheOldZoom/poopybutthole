import { Message, TextChannel, EmbedBuilder } from "discord.js";
import Command, { GuildMessage } from "../../struct/Command";
import { inspect } from "util";

export default new Command({
  name: "eval",
  description: "Evaluates JavaScript code. Developer only.",
  aliases: ["ev", "evaluate"],
  devOnly: true,
  async execute(message, args: string[], client: any) {
    if (!args.length) return message.reply("Please provide code to evaluate.");

    let code = args.join(" ");
    if (!code.trim().endsWith(";")) code += ";";

    const startTime = process.hrtime();

    try {
      const result = await evalCode(code, message, client, args);
      const execTimeMs = formatExecutionTime(startTime);
      const formattedResult = formatResult(result);

      return sendResult(message, code, execTimeMs, formattedResult);
    } catch (error) {
      return sendError(message, code, error);
    }
  },
});

async function evalCode(
  code: string,
  message: Message,
  client: any,
  args: string[]
) {
  try {
    const evaluatedCode = new Function(
      "message",
      "client",
      "args",
      `
      try {
        return (async () => { 
          return ${code} 
        })();
      } catch (err) {
        throw err;
      }
    `
    );

    return await evaluatedCode(message, client, args);
  } catch (err) {
    throw err;
  }
}

function formatExecutionTime(startTime: [number, number]): string {
  const execTime = process.hrtime(startTime);
  return (execTime[0] * 1000 + execTime[1] / 1000000).toFixed(2);
}

function formatResult(result: any): string {
  return typeof result === "string" ? result : inspect(result, { depth: 1 });
}

async function sendResult(
  message: GuildMessage,
  code: string,
  execTimeMs: string,
  formattedResult: string
) {
  const embed = new EmbedBuilder()
    .setColor("#00FF00")
    .setTitle("Eval Result")
    .setDescription(
      `Executed in ${execTimeMs}ms\n\n**Input:**\n\`\`\`ts\n${code.slice(0, 4000)}\n\`\`\``
    );

  if (formattedResult.length <= 4069) {
    embed.setDescription(
      embed.data.description +
        `\n\n**Output:**\n\`\`\`js\n${formattedResult}\n\`\`\``
    );
    return message.reply({ embeds: [embed] });
  }

  await message.reply({ embeds: [embed] });
  return sendChunks(message, formattedResult, "Output");
}

async function sendChunks(
  message: GuildMessage,
  content: string,
  title: string
) {
  let remainingContent = content;
  let chunkNum = 1;

  while (remainingContent.length > 0) {
    const chunk = remainingContent.slice(0, 4069);
    remainingContent = remainingContent.slice(4069);

    const chunkEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(`${title} (continued ${chunkNum})`)
      .setDescription(`\`\`\`js\n${chunk}\n\`\`\``);

    await message.channel.send({ embeds: [chunkEmbed] });
    chunkNum++;
  }
}

async function sendError(message: GuildMessage, code: string, error: any) {
  const errorDetails = inspect(error, { depth: 3 });
  const errorStack = error.stack || "";

  const errorEmbed = new EmbedBuilder()
    .setColor("#FF0000")
    .setTitle("Eval Error")
    .setDescription(`**Input:**\n\`\`\`ts\n${code.slice(0, 4000)}\n\`\`\``);

  if (errorDetails.length + errorStack.length <= 4069) {
    errorEmbed.setDescription(
      errorEmbed.data.description +
        `\n\n**Error Details:**\n\`\`\`js\n${errorDetails}\n\`\`\`\n\n**Stack Trace:**\n\`\`\`js\n${errorStack}\n\`\`\``
    );
    return message.reply({ embeds: [errorEmbed] });
  }

  await message.reply({ embeds: [errorEmbed] });
  if (errorDetails.length > 0)
    await sendChunks(message, errorDetails, "Error Details");
  if (errorStack.length > 0)
    await sendChunks(message, errorStack, "Stack Trace");
}
