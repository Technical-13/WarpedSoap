require( 'dotenv' ).config();
const ENV = process.env;
const { ApplicationCommandType, InteractionContextType } = require( 'discord.js' );
const chalk = require( 'chalk' );
const errHandler = require( '../../functions/errorHandler.js' );
const userPerms = require( '../../functions/getPerms.js' );
const getBotConfig = require( '../../functions/getBotDB.js' );
const strScript = chalk.hex( '#FFA500' ).bold( './slashCommands/info/bot.js' );

module.exports = {
  name: 'bot',
  group: 'info',
  description: 'Bot information and message management.',
  type: ApplicationCommandType.ChatInput,
  contexts: [ InteractionContextType.Guild, InteractionContextType.BotDM ],
  cooldown: 1000,
  devOnly: true,
  run: async ( client, interaction ) => {
    try {
      await interaction.deferReply( { ephemeral: true } );// ephemeral: interaction.inGuild()
      const { channel, guild, options, user: author } = interaction;
      const { isBotMod, isGlobalBlacklisted, content } = await userPerms( author, guild );
      if ( isGlobalBlacklisted ) { return interaction.editReply( { content: content } ); }
      if ( !isBotMod ) { return interaction.editReply( { content: 'Comming **SOON**:tm:' } ); }
      const aboutBot = {

      };

    }
    catch ( errObject ) { console.error( 'Uncaught error in %s:\n\t%s', strScript, errObject.stack ); }
  }
};