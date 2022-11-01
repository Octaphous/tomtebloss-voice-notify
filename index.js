const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

module.exports.commands = [
    {
        name: "set-voice-notify-channel",
        default_member_permissions: 0,
        description: "Send voice channel notifications in this channel",
    },
    {
        name: "set-voice-notify-mute-role",
        default_member_permissions: 0,
        description: "Set voice notification channel mute role",
        options: [
            {
                name: "mute-role",
                type: 8,
                description: "Role that mutes voice notifications",
                required: true,
            },
        ],
    },
];

module.exports.init = function (client, logger, storage) {
    client.on("voiceStateUpdate", async (oldState, newState) => {
        // If user didn't join a new voice channel, return
        if (oldState.channelId == newState.channelId) return;
        if (newState.channelId == null) return;

        // Get text channel id from storage
        let notifyChannelID = storage.retrieve("voice-notify-channel-id");

        // Get text channel from id
        let notifyChannel = await client.channels.fetch(notifyChannelID);

        // Create mute button
        let btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("vc-notify-mute-btn")
                .setLabel("Dölj framtida röstnotiser")
                .setStyle(ButtonStyle.Secondary)
        );

        // Get mute role id to check if it's set
        let muteRole = storage.retrieve("voice-notify-mute-role");

        // Send message
        notifyChannel.send({
            content: `@here <@!${newState.member.id}> gick just med i röstkanalen <#${newState.channelId}>`,
            components: muteRole ? [btnRow] : undefined,
        });
    });

    // Interactions (buttons, slash commands)
    client.on("interactionCreate", async (interaction) => {
        // Button interaction handler
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case "vc-notify-mute-btn":
                    let roleId = storage.retrieve("voice-notify-mute-role");
                    let role = await interaction.guild.roles.fetch(roleId);
                    await interaction.member.roles.add(role);
                    interaction.reply({ content: "Röstnotiser har dolts!", ephemeral: true });
            }
        }

        // Slash Command Handler
        if (interaction.isChatInputCommand()) {
            switch (interaction.commandName) {
                // Command to change notification channel
                case "set-voice-notify-channel":
                    storage.store("voice-notify-channel-id", interaction.channelId);
                    interaction.reply("This is now the new voice notification channel.");
                    logger(`<#${interaction.channelId}> is now the new voice notification channel.`);
                    break;

                // Command to change notifications mute role
                case "set-voice-notify-mute-role":
                    let roleId = interaction.options.getRole("mute-role").id;
                    storage.store("voice-notify-mute-role", roleId);
                    interaction.reply("Applied new role.");
                    logger(`<@&${roleId}> is now the new voice notification mute role.`);
            }
        }
    });
};
