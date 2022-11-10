const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

module.exports.commands = [
    {
        name: "toggle-voice-notifications",
        description: "Aktivera och avaktivera röstnotiser",
    },
    {
        name: "set-voice-notify-channel",
        default_member_permissions: 0,
        description: "Skicka framtida röstnotiser i denna kanal",
    },
    {
        name: "set-voice-notify-mute-role",
        default_member_permissions: 0,
        description: "Sätter en roll för att tysta röstnotiser",
        options: [
            {
                name: "mute-role",
                type: 8,
                description: "Roll som döljer kanalen för röstnotiser",
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
                case "toggle-voice-notifications": {
                    let roleId = storage.retrieve("voice-notify-mute-role");
                    let role = await interaction.guild.roles.fetch(roleId);
                    if (interaction.member.roles.cache.has(roleId)) {
                        // Show notifications
                        await interaction.member.roles.remove(role);
                        interaction.reply({ content: "Röstnotiser visas åter.", ephemeral: true });
                    } else {
                        // Hide notifications
                        await interaction.member.roles.add(role);
                        interaction.reply({ content: "Röstnotiser har dolts!", ephemeral: true });
                    }
                    break;
                }

                // Command to change notification channel
                case "set-voice-notify-channel": {
                    storage.store("voice-notify-channel-id", interaction.channelId);
                    interaction.reply("Den här kanalen är nu kanalen för röstnotiser.");
                    logger(`<#${interaction.channelId}> is now the new voice notification channel.`);
                    break;
                }

                // Command to change notifications mute role
                case "set-voice-notify-mute-role": {
                    let roleId = interaction.options.getRole("mute-role").id;
                    storage.store("voice-notify-mute-role", roleId);
                    interaction.reply("Applied new role.");
                    logger(`<@&${roleId}> är nu rollen för att tysta röstnotiser.`);
                }
            }
        }
    });
};
